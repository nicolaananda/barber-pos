const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const { startOfWeek, endOfWeek, eachDayOfInterval, format, subMonths, startOfMonth, endOfMonth } = require('date-fns');
const { toNumber } = require('../lib/money');

function sumMoney(rows, field) {
    return rows.reduce((sum, row) => sum + toNumber(row[field]), 0);
}

function dateRangeWhere(startDate, endDate) {
    return {
        date: {
            gte: startDate,
            lte: endDate,
        },
    };
}

async function sumTransactionsByDateRange(startDate, endDate) {
    const transactions = await prisma.transaction.findMany({
        where: dateRangeWhere(startDate, endDate),
        select: { totalAmount: true },
    });

    return {
        totalRevenue: sumMoney(transactions, 'totalAmount'),
        transactionCount: transactions.length,
    };
}

async function sumAllTransactions() {
    const transactions = await prisma.transaction.findMany({
        select: { totalAmount: true },
    });

    return sumMoney(transactions, 'totalAmount');
}

async function sumExpensesByDateRange(startDate, endDate) {
    const expenses = await prisma.expense.findMany({
        where: dateRangeWhere(startDate, endDate),
        select: { amount: true },
    });

    return sumMoney(expenses, 'amount');
}

async function sumCapitalByDateRange(startDate, endDate) {
    const capitalRows = await prisma.capital.findMany({
        where: dateRangeWhere(startDate, endDate),
        select: { amount: true },
    });

    return sumMoney(capitalRows, 'amount');
}

async function sumAllCapital() {
    const capitalRows = await prisma.capital.findMany({
        select: { amount: true },
    });

    return sumMoney(capitalRows, 'amount');
}

function groupExpensesByCategory(expenses) {
    return Object.values(expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        if (!acc[category]) acc[category] = { category, amount: 0 };
        acc[category].amount += toNumber(expense.amount);
        return acc;
    }, {}));
}

// GET /api/dashboard/daily
router.get('/daily', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

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

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const yesterdayRevenue = (await sumTransactionsByDateRange(yesterday, yesterdayEnd)).totalRevenue;

        const totalRevenue = sumMoney(transactions, 'totalAmount');
        const transactionCount = transactions.length;

        const cashTotal = transactions
            .filter((t) => t.paymentMethod === 'cash')
            .reduce((sum, t) => sum + toNumber(t.totalAmount), 0);

        const qrisTotal = transactions
            .filter((t) => t.paymentMethod === 'qris')
            .reduce((sum, t) => sum + toNumber(t.totalAmount), 0);

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
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const currentMonthRevenueAgg = await sumTransactionsByDateRange(startOfCurrentMonth, endOfCurrentMonth);

        const currentMonthRevenue = currentMonthRevenueAgg.totalRevenue;
        const currentMonthExpenses = await sumExpensesByDateRange(startOfCurrentMonth, endOfCurrentMonth);
        const currentMonthTxCount = currentMonthRevenueAgg.transactionCount;

        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        const lastMonthRevenueAgg = await sumTransactionsByDateRange(startOfLastMonth, endOfLastMonth);

        const lastMonthRevenue = lastMonthRevenueAgg.totalRevenue;
        const revenueGrowth =
            lastMonthRevenue === 0
                ? 100
                : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

        const openShifts = await prisma.cashShift.findMany({
            where: { status: 'open' },
            include: { openedBy: { select: { id: true } } },
        });

        const activeBarbersOnShift = openShifts.length;
        const activeShift = activeBarbersOnShift > 0;

        const startWeek = startOfWeek(now, { weekStartsOn: 1 });
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
            const dayStr = format(day, 'EEE');
            const dayTotal = weekTransactions
                .filter(
                    (tx) =>
                        format(new Date(tx.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                )
                .reduce((sum, tx) => sum + toNumber(tx.totalAmount), 0);
            return { name: dayStr, total: dayTotal };
        });

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
});

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
            currentTransactions, currentExpenses, totalCapital,
            prevTransactions, prevExpenses,
        ] = await Promise.all([
            prisma.transaction.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, totalAmount: true, paymentMethod: true } }),
            prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true, amount: true, category: true } }),
            sumCapitalByDateRange(start, end),
            prisma.transaction.findMany({ where: { date: { gte: prevStart, lte: prevEnd } }, select: { totalAmount: true } }),
            prisma.expense.findMany({ where: { date: { gte: prevStart, lte: prevEnd } }, select: { amount: true } }),
        ]);

        const totalRevenue = sumMoney(currentTransactions, 'totalAmount');
        const totalExpenses = sumMoney(currentExpenses, 'amount');
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const expensesByCategory = groupExpensesByCategory(currentExpenses);
        const salaryCategories = expensesByCategory.filter(e => e.category.toLowerCase() === 'salary');
        const totalPayroll = sumMoney(salaryCategories, 'amount');
        const totalOpex = totalExpenses - totalPayroll;

        const prevRevenue = sumMoney(prevTransactions, 'totalAmount');
        const previousExpenses = sumMoney(prevExpenses, 'amount');
        const prevNetProfit = prevRevenue - previousExpenses;

        const pctChange = (cur, prev) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;

        const trendMap = {};
        currentTransactions.forEach(tx => {
            const day = format(new Date(tx.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].revenue += toNumber(tx.totalAmount);
        });
        currentExpenses.forEach(exp => {
            const day = format(new Date(exp.date), 'yyyy-MM-dd');
            if (!trendMap[day]) trendMap[day] = { date: day, revenue: 0, expenses: 0 };
            trendMap[day].expenses += toNumber(exp.amount);
        });
        const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
        const revenueByMethod = Object.values(currentTransactions.reduce((acc, tx) => {
            const method = tx.paymentMethod || 'unknown';
            if (!acc[method]) acc[method] = { method, amount: 0 };
            acc[method].amount += toNumber(tx.totalAmount);
            return acc;
        }, {}));

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
                prevExpenses: previousExpenses,
                prevNetProfit,
                revenueChange: pctChange(totalRevenue, prevRevenue),
                expensesChange: pctChange(totalExpenses, previousExpenses),
                netProfitChange: pctChange(netProfit, prevNetProfit),
            },
            breakdown: {
                expenses: expensesByCategory,
                revenue: revenueByMethod,
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
        const [totalCapital, totalRevenue, expenses] = await Promise.all([
            sumAllCapital(),
            sumAllTransactions(),
            prisma.expense.findMany({ select: { amount: true, category: true } }),
        ]);

        const expensesByCategory = groupExpensesByCategory(expenses);
        const totalExpenses = sumMoney(expensesByCategory, 'amount');
        const salaryCategories = expensesByCategory.filter(e => e.category.toLowerCase() === 'salary');
        const totalPayroll = sumMoney(salaryCategories, 'amount');
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
