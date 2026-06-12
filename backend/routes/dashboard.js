const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const { startOfWeek, endOfWeek, eachDayOfInterval, format, subMonths, startOfMonth, endOfMonth } = require('date-fns');
const { toNumber } = require('../lib/money');

// GET /api/dashboard/daily
router.get('/daily', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                barber: true,
            },
        });

        // Fetch yesterday's revenue for comparison
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const yesterdayAgg = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            where: {
                date: { gte: yesterday, lte: yesterdayEnd },
            },
        });
        const yesterdayRevenue = toNumber(yesterdayAgg._sum.totalAmount);

        // Calculate Totals
        const totalRevenue = transactions.reduce((sum, t) => sum + toNumber(t.totalAmount), 0);
        const transactionCount = transactions.length;

        const cashTotal = transactions
            .filter((t) => t.paymentMethod === 'cash')
            .reduce((sum, t) => sum + toNumber(t.totalAmount), 0);

        const qrisTotal = transactions
            .filter((t) => t.paymentMethod === 'qris')
            .reduce((sum, t) => sum + toNumber(t.totalAmount), 0);

        // Find Top Barber
        const barberStats = {};

        transactions.forEach((t) => {
            const bId = t.barberId;
            if (!barberStats[bId]) {
                barberStats[bId] = { revenue: 0, count: 0, name: t.barber.name };
            }
            barberStats[bId].revenue += toNumber(t.totalAmount);
            barberStats[bId].count += 1;
        });

        let topBarber = null;
        let maxRev = -1;

        Object.values(barberStats).forEach((stat) => {
            if (stat.revenue > maxRev) {
                maxRev = stat.revenue;
                topBarber = stat;
            }
        });

        // Calculate growth vs yesterday
        const revenueGrowthVsYesterday = yesterdayRevenue === 0
            ? (totalRevenue > 0 ? 100 : 0)
            : ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

        res.json({
            totalRevenue,
            transactionCount,
            cashTotal,
            qrisTotal,
            topBarber,
            yesterdayRevenue,
            revenueGrowthVsYesterday: Math.round(revenueGrowthVsYesterday * 10) / 10,
            recentTransactions: transactions.map((t) => ({
                id: t.id,
                invoiceCode: t.invoiceCode,
                time: t.date,
                customerName: t.customerName || 'Walk-in',
                barberName: t.barber.name,
                totalAmount: t.totalAmount,
                paymentMethod: t.paymentMethod,
                items: t.items,
            })),
        });
    } catch (error) {
        console.error('Daily Recap Error:', error);
        res.status(500).json({ error: 'Failed to fetch daily recap' });
    }
});

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // 1. Total Revenue (Current Month)
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const currentMonthRevenueAgg = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            _count: { id: true },
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth,
                },
            },
        });

        const currentMonthExpensesAgg = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth,
                },
            },
        });

        const currentMonthRevenue = toNumber(currentMonthRevenueAgg._sum.totalAmount);
        const currentMonthExpenses = toNumber(currentMonthExpensesAgg._sum.amount);
        const currentMonthTxCount = currentMonthRevenueAgg._count.id || 0;

        // 2. Last Month Revenue (for comparison)
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        const lastMonthRevenueAgg = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            where: {
                date: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth,
                },
            },
        });

        const lastMonthRevenue = toNumber(lastMonthRevenueAgg._sum.totalAmount);
        const revenueGrowth =
            lastMonthRevenue === 0
                ? 100
                : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

        // 3. Active Barbers & Shift Status
        const openShifts = await prisma.cashShift.findMany({
            where: { status: 'open' },
            include: { openedBy: { select: { id: true } } },
        });

        const activeBarbersOnShift = openShifts.length;
        const activeShift = activeBarbersOnShift > 0;

        // 4. Weekly Revenue Chart Data
        const startWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        const endWeek = endOfWeek(now, { weekStartsOn: 1 });

        const weekTransactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startWeek,
                    lte: endWeek,
                },
            },
        });

        const days = eachDayOfInterval({ start: startWeek, end: endWeek });
        const chartData = days.map((day) => {
            const dayStr = format(day, 'EEE'); // Mon, Tue...
            const dayTotal = weekTransactions
                .filter(
                    (tx) =>
                        format(new Date(tx.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                )
                .reduce((sum, tx) => sum + toNumber(tx.totalAmount), 0);
            return { name: dayStr, total: dayTotal };
        });

        // 5. Recent Activity (Last 5 transactions)
        const recentTransactions = await prisma.transaction.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
                barber: {
                    select: { name: true },
                },
            },
        });

        const recentActivity = recentTransactions.map((tx) => ({
            id: tx.id,
            barberName: tx.barber?.name || 'Unknown',
            serviceName: tx.items.map((i) => i.name).join(', '),
            amount: tx.totalAmount,
            time: format(new Date(tx.date), 'HH:mm'),
        }));

        res.json({
            stats: {
                totalRevenue: currentMonthRevenue,
                totalExpenses: currentMonthExpenses,
                netProfit: currentMonthRevenue - currentMonthExpenses,
                revenueGrowth: revenueGrowth.toFixed(1),
                transactionCount: currentMonthTxCount,
                activeShift,
                activeBarbers: activeBarbersOnShift,
                lastShiftStart: activeShift
                    ? format(new Date(openShifts[0].startTime), 'HH:mm')
                    : '-',
            },
            chartData,
            recentActivity,
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
}); // Added missing closing brace and parenthesis

// GET /api/dashboard/profit-loss
router.get('/profit-loss', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const now = new Date();
        const start = startDate ? new Date(startDate) : startOfMonth(now);
        const end = endDate ? new Date(endDate) : endOfMonth(now);
        end.setHours(23, 59, 59, 999);

        // Previous period: same duration shifted back
        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        prevEnd.setHours(23, 59, 59, 999);
        const prevStart = new Date(prevEnd.getTime() - durationMs);
        prevStart.setHours(0, 0, 0, 0);

        const [
            revenueAgg, expensesAgg, capitalAgg,
            expensesByCategory, revenueByMethod,
            prevRevenueAgg, prevExpensesAgg,
            dailyTransactions, dailyExpenses,
        ] = await Promise.all([
            prisma.transaction.aggregate({ _sum: { totalAmount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.capital.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.expense.groupBy({ by: ['category'], _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.transaction.groupBy({ by: ['paymentMethod'], _sum: { totalAmount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.transaction.aggregate({ _sum: { totalAmount: true }, where: { date: { gte: prevStart, lte: prevEnd } } }),
            prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: prevStart, lte: prevEnd } } }),
            prisma.transaction.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, totalAmount: true } }),
            prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, amount: true, category: true } }),
        ]);

        const totalRevenue = toNumber(revenueAgg._sum.totalAmount);
        const totalExpenses = toNumber(expensesAgg._sum.amount);
        const totalCapital = toNumber(capitalAgg._sum.amount);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const salaryCategories = expensesByCategory.filter(e => e.category.toLowerCase() === 'salary');
        const totalPayroll = salaryCategories.reduce((sum, e) => sum + toNumber(e._sum.amount), 0);
        const totalOpex = totalExpenses - totalPayroll;

        const prevRevenue = toNumber(prevRevenueAgg._sum.totalAmount);
        const prevExpenses = toNumber(prevExpensesAgg._sum.amount);
        const prevNetProfit = prevRevenue - prevExpenses;

        const pctChange = (cur, prev) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;

        const trendMap = {};
        dailyTransactions.forEach(tx => {
            const day = format(new Date(tx.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].revenue += toNumber(tx.totalAmount);
        });
        dailyExpenses.forEach(exp => {
            const day = format(new Date(exp.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].expenses += toNumber(exp.amount);
        });
        const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            range: { start, end },
            summary: {
                totalRevenue,
                totalExpenses,
                totalOpex,
                totalPayroll,
                totalCapital,
                netProfit,
                profitMargin: Math.round(profitMargin * 10) / 10,
            },
            comparison: {
                prevRevenue,
                prevExpenses,
                prevNetProfit,
                revenueChange: pctChange(totalRevenue, prevRevenue),
                expensesChange: pctChange(totalExpenses, prevExpenses),
                netProfitChange: pctChange(netProfit, prevNetProfit),
            },
            breakdown: {
                expenses: expensesByCategory.map(e => ({ category: e.category, amount: toNumber(e._sum.amount) })),
                revenue: revenueByMethod.map(r => ({ method: r.paymentMethod, amount: toNumber(r._sum.totalAmount) })),
                payroll: [],
            },
            dailyTrend,
        });

    } catch (error) {
        console.error('Profit/Loss Error:', error);
        res.status(500).json({ error: 'Failed to calculate profit and loss' });
    }
});

// GET /api/dashboard/total-balance-all
router.get('/total-balance-all', authenticateToken, async (req, res) => {
    try {
        const [capitalAgg, revenueAgg, expensesByCategory] = await Promise.all([
            prisma.capital.aggregate({ _sum: { amount: true } }),
            prisma.transaction.aggregate({ _sum: { totalAmount: true } }),
            prisma.expense.groupBy({
                by: ['category'],
                _sum: { amount: true },
            }),
        ]);

        const totalCapital = toNumber(capitalAgg._sum.amount);
        const totalRevenue = toNumber(revenueAgg._sum.totalAmount);

        const totalExpenses = expensesByCategory.reduce((sum, e) => sum + toNumber(e._sum.amount), 0);
        const salaryCategories = expensesByCategory.filter(e => e.category.toLowerCase() === 'salary');
        const totalPayroll = salaryCategories.reduce((sum, e) => sum + toNumber(e._sum.amount), 0);
        const totalOpex = totalExpenses - totalPayroll;

        const totalBalance = totalCapital + totalRevenue - totalExpenses;

        res.json({
            totalCapital,
            totalRevenue,
            totalExpenses,
            totalOpex,
            totalPayroll,
            totalBalance,
        });

    } catch (error) {
        console.error('Total Balance All Error:', error);
        res.status(500).json({ error: 'Failed to calculate total balance' });
    }
});

module.exports = router;
