const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const { startOfWeek, endOfWeek, eachDayOfInterval, format, subMonths, startOfMonth, endOfMonth } = require('date-fns');

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

        // Calculate Totals
        const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
        const transactionCount = transactions.length;

        const cashTotal = transactions
            .filter((t) => t.paymentMethod === 'cash')
            .reduce((sum, t) => sum + t.totalAmount, 0);

        const qrisTotal = transactions
            .filter((t) => t.paymentMethod === 'qris')
            .reduce((sum, t) => sum + t.totalAmount, 0);

        // Find Top Barber
        const barberStats = {};

        transactions.forEach((t) => {
            const bId = t.barberId;
            if (!barberStats[bId]) {
                barberStats[bId] = { revenue: 0, count: 0, name: t.barber.name };
            }
            barberStats[bId].revenue += t.totalAmount;
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

        res.json({
            totalRevenue,
            transactionCount,
            cashTotal,
            qrisTotal,
            topBarber,
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

        const currentMonthRevenue = currentMonthRevenueAgg._sum.totalAmount || 0;
        const currentMonthExpenses = currentMonthExpensesAgg._sum.amount || 0;
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

        const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount || 0;
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
                .reduce((sum, tx) => sum + tx.totalAmount, 0);
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

        // Get YYYY-MM period strings that overlap with a date range (for payroll lookup)
        const getPayrollPeriods = (s, e) => {
            const periods = [];
            const cur = new Date(s.getFullYear(), s.getMonth(), 1);
            const last = new Date(e.getFullYear(), e.getMonth(), 1);
            while (cur <= last) {
                periods.push(format(cur, 'yyyy-MM'));
                cur.setMonth(cur.getMonth() + 1);
            }
            return periods;
        };

        const currentPeriods = getPayrollPeriods(start, end);
        const prevPeriods = getPayrollPeriods(prevStart, prevEnd);

        // Run all queries in parallel
        const [
            revenueAgg, opexAgg, capitalAgg, payrollAgg,
            expensesByCategory, revenueByMethod, payrollRecords,
            prevRevenueAgg, prevOpexAgg, prevPayrollAgg,
            dailyTransactions, dailyExpenses,
        ] = await Promise.all([
            prisma.transaction.aggregate({ _sum: { totalAmount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.capital.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.payroll.aggregate({ _sum: { totalPayout: true }, where: { period: { in: currentPeriods }, status: 'paid' } }),
            prisma.expense.groupBy({ by: ['category'], _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.transaction.groupBy({ by: ['paymentMethod'], _sum: { totalAmount: true }, where: { date: { gte: start, lte: end } } }),
            prisma.payroll.findMany({ where: { period: { in: currentPeriods }, status: 'paid' }, select: { barberId: true, period: true, totalPayout: true } }),
            // Previous period
            prisma.transaction.aggregate({ _sum: { totalAmount: true }, where: { date: { gte: prevStart, lte: prevEnd } } }),
            prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: prevStart, lte: prevEnd } } }),
            prisma.payroll.aggregate({ _sum: { totalPayout: true }, where: { period: { in: prevPeriods }, status: 'paid' } }),
            // Daily trend data
            prisma.transaction.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, totalAmount: true } }),
            prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, amount: true } }),
        ]);

        const totalRevenue = revenueAgg._sum.totalAmount || 0;
        const totalOpex = opexAgg._sum.amount || 0;
        const totalPayroll = payrollAgg._sum.totalPayout || 0;
        const totalExpenses = totalOpex + totalPayroll;
        const totalCapital = capitalAgg._sum.amount || 0;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const prevRevenue = prevRevenueAgg._sum.totalAmount || 0;
        const prevOpex = prevOpexAgg._sum.amount || 0;
        const prevPayroll = prevPayrollAgg._sum.totalPayout || 0;
        const prevExpenses = prevOpex + prevPayroll;
        const prevNetProfit = prevRevenue - prevExpenses;

        const pctChange = (cur, prev) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;

        // Build daily trend (revenue and opex by day; payroll is monthly so not in daily)
        const trendMap = {};
        dailyTransactions.forEach(tx => {
            const day = format(new Date(tx.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].revenue += tx.totalAmount;
        });
        dailyExpenses.forEach(exp => {
            const day = format(new Date(exp.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].expenses += exp.amount;
        });
        const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // Group payroll by period for breakdown display
        const payrollByPeriod = payrollRecords.reduce((acc, p) => {
            acc[p.period] = (acc[p.period] || 0) + p.totalPayout;
            return acc;
        }, {});

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
                expenses: expensesByCategory.map(e => ({ category: e.category, amount: e._sum.amount })),
                revenue: revenueByMethod.map(r => ({ method: r.paymentMethod, amount: r._sum.totalAmount })),
                payroll: Object.entries(payrollByPeriod).map(([period, amount]) => ({ period, amount })),
            },
            dailyTrend,
        });

    } catch (error) {
        console.error('Profit/Loss Error:', error);
        res.status(500).json({ error: 'Failed to calculate profit and loss' });
    }
});

// GET /api/dashboard/total-balance-all
// Returns lifetime total balance (all capital + all revenue - all expenses - all paid payroll)
router.get('/total-balance-all', authenticateToken, async (req, res) => {
    try {
        const [capitalAgg, revenueAgg, expensesAgg, payrollAgg] = await Promise.all([
            prisma.capital.aggregate({ _sum: { amount: true } }),
            prisma.transaction.aggregate({ _sum: { totalAmount: true } }),
            prisma.expense.aggregate({ _sum: { amount: true } }),
            prisma.payroll.aggregate({ _sum: { totalPayout: true }, where: { status: 'paid' } }),
        ]);

        const totalCapital = capitalAgg._sum.amount || 0;
        const totalRevenue = revenueAgg._sum.totalAmount || 0;
        const totalOpex = expensesAgg._sum.amount || 0;
        const totalPayroll = payrollAgg._sum.totalPayout || 0;
        const totalExpenses = totalOpex + totalPayroll;
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
