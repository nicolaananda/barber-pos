const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const {
    calculateProfitMargin,
    forecastRevenue,
    segmentCustomers,
    analyzePeakHours,
    calculateChurnRate,
    calculateCLV,
    calculateMonthlyCohortRetention
} = require('../lib/analytics');
const { toNumber } = require('../lib/money');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ANALYTICS_RANGE_DAYS = 366;

function parseDateRange(query, defaults = {}) {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    const parse = (value, name) => {
        if (!pattern.test(value || '')) throw new Error(`${name} must use YYYY-MM-DD format`);
        const date = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            throw new Error(`${name} must be a valid calendar date`);
        }
        return date;
    };
    const startValue = query.startDate || defaults.startDate;
    const endValue = query.endDate || defaults.endDate;
    const start = startValue ? parse(startValue, 'startDate') : null;
    const endStart = endValue ? parse(endValue, 'endDate') : null;
    if (start && endStart && start > endStart) throw new Error('startDate must be on or before endDate');
    if (start && endStart && ((endStart - start) / DAY_MS) + 1 > MAX_ANALYTICS_RANGE_DAYS) {
        throw new Error(`Date range must not exceed ${MAX_ANALYTICS_RANGE_DAYS} days`);
    }
    const endExclusive = endStart ? new Date(endStart.getTime() + DAY_MS) : null;
    const end = endExclusive ? new Date(endExclusive.getTime() - 1) : null;
    const filter = {};
    if (start) filter.gte = start;
    if (end) filter.lte = end;
    const where = {};
    if (start) where.gte = start;
    if (endExclusive) where.lt = endExclusive;
    return {
        start, end, endStart, endExclusive, filter, where, startValue, endValue,
        period: { startDate: startValue || null, endDate: endValue || null }
    };
}

function parseAnalyticsRange(query, defaultMonths = null) {
    const defaults = {};
    if (!query.startDate && defaultMonths !== null) {
        const end = query.endDate ? new Date(`${query.endDate}T00:00:00.000Z`) : new Date();
        const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - defaultMonths, end.getUTCDate()));
        defaults.startDate = start.toISOString().slice(0, 10);
    }
    if (!query.endDate) defaults.endDate = new Date().toISOString().slice(0, 10);
    return parseDateRange(query, defaults);
}

function sendDateRangeError(res, error) {
    return res.status(400).json({ success: false, error: error.message });
}

function rangeError(res, error) {
    if (/^(startDate|endDate|Date range)/.test(error.message)) {
        sendDateRangeError(res, error);
        return true;
    }
    return false;
}

function percentDelta(current, previous) {
    return previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / Math.abs(previous)) * 100;
}

function dailyRevenueSeries(transactions, start, days) {
    const revenue = new Map();
    transactions.forEach(t => {
        const key = t.date.toISOString().slice(0, 10);
        revenue.set(key, (revenue.get(key) || 0) + toNumber(t.totalAmount));
    });
    return Array.from({ length: days }, (_, index) => {
        const date = new Date(start.getTime() + index * DAY_MS).toISOString().slice(0, 10);
        return { date, revenue: revenue.get(date) || 0 };
    });
}

/**
 * GET /api/analytics/profit-margin
 * Calculate profit margin per service and per barber
 * Query params: startDate, endDate
 */
router.get('/profit-margin', authenticateToken, async (req, res) => {
    try {
        let range;
        try {
            range = parseDateRange(req.query);
        } catch (error) {
            return sendDateRangeError(res, error);
        }
        const { startValue: startDate, endValue: endDate, filter: dateFilter } = range;

        const previousFilter = {};
        if (range.start && range.endStart) {
            const periodDays = Math.round((range.endStart - range.start) / DAY_MS) + 1;
            previousFilter.gte = new Date(range.start.getTime() - periodDays * DAY_MS);
            previousFilter.lte = new Date(range.start.getTime() - 1);
        }

        const [transactions, expenses, services, previousTransactions, previousExpenses] = await Promise.all([
            prisma.transaction.findMany({
                where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
                include: { barber: { select: { id: true, name: true } } }
            }),
            prisma.expense.findMany({
                where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {}
            }),
            prisma.service.findMany({ where: { isActive: true } }),
            previousFilter.gte ? prisma.transaction.findMany({
                where: { date: previousFilter },
                include: { barber: { select: { id: true, name: true } } }
            }) : [],
            previousFilter.gte ? prisma.expense.findMany({ where: { date: previousFilter } }) : []
        ]);

        const analysis = calculateProfitMargin(transactions, expenses, services);
        if (previousFilter.gte) {
            const previous = calculateProfitMargin(previousTransactions, previousExpenses, services);
            const currentOverall = analysis.overall;
            const previousOverall = previous.overall;
            analysis.previousPeriod = {
                startDate: previousFilter.gte.toISOString().slice(0, 10),
                endDate: previousFilter.lte.toISOString().slice(0, 10),
                overall: previousOverall
            };
            analysis.deltas = {
                revenue: currentOverall.totalRevenue - previousOverall.totalRevenue,
                revenuePercent: percentDelta(currentOverall.totalRevenue, previousOverall.totalRevenue),
                operatingResult: currentOverall.operatingResult - previousOverall.operatingResult,
                operatingResultPercent: percentDelta(currentOverall.operatingResult, previousOverall.operatingResult),
                transactionCount: currentOverall.transactionCount - previousOverall.transactionCount,
                transactionCountPercent: percentDelta(currentOverall.transactionCount, previousOverall.transactionCount),
                averageTicket: currentOverall.averageTicket - previousOverall.averageTicket,
                averageTicketPercent: percentDelta(currentOverall.averageTicket, previousOverall.averageTicket)
            };
        }

        res.json({
            success: true,
            data: analysis,
            period: {
                startDate: startDate || 'all',
                endDate: endDate || 'all'
            }
        });
    } catch (error) {
        console.error('Profit margin analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate profit margin'
        });
    }
});

/**
 * GET /api/analytics/revenue-forecast
 * Forecast revenue based on historical trends
 * Query params: periods (default 30)
 */
router.get('/revenue-forecast', authenticateToken, async (req, res) => {
    try {
        const periods = Math.min(90, Math.max(1, parseInt(req.query.periods, 10) || 30));

        // Use 90 complete calendar days, including days without transactions.
        const today = new Date();
        const endDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const historyStart = new Date(endDay.getTime() - 89 * DAY_MS);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: historyStart, lt: new Date(endDay.getTime() + DAY_MS) }
            },
            select: {
                date: true,
                totalAmount: true
            }
        });

        const historicalData = dailyRevenueSeries(transactions, historyStart, 90);

        const forecast = forecastRevenue(historicalData, periods);

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('Revenue forecast error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate revenue forecast'
        });
    }
});

/**
 * GET /api/analytics/customer-segmentation
 * Segment customers using RFM analysis
 */
router.get('/customer-segmentation', authenticateToken, async (req, res) => {
    try {
        const range = parseAnalyticsRange(req.query, 12);

        const [customers, transactions] = await Promise.all([
            prisma.customer.findMany(),
            prisma.transaction.findMany({
                where: { date: range.where },
                select: {
                    customerPhone: true,
                    totalAmount: true,
                    date: true
                }
            })
        ]);

        const segmentation = segmentCustomers(customers, transactions, new Date(range.endExclusive - 1));

        res.json({
            success: true,
            data: { ...segmentation, period: range.period }
        });
    } catch (error) {
        if (rangeError(res, error)) return;
        console.error('Customer segmentation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to segment customers'
        });
    }
});

/**
 * GET /api/analytics/peak-hours
 * Analyze peak hours and transaction patterns
 * Query params: startDate, endDate
 */
router.get('/peak-hours', authenticateToken, async (req, res) => {
    try {
        const range = parseAnalyticsRange(req.query, 12);

        const transactions = await prisma.transaction.findMany({
            where: { date: range.where },
            select: {
                date: true,
                totalAmount: true
            }
        });

        const analysis = analyzePeakHours(transactions);

        res.json({
            success: true,
            data: analysis,
            period: range.period
        });
    } catch (error) {
        if (rangeError(res, error)) return;
        console.error('Peak hours analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze peak hours'
        });
    }
});

/**
 * GET /api/analytics/churn-rate
 * Calculate customer churn rate
 * Query params: periodDays (default 90)
 */
router.get('/churn-rate', authenticateToken, async (req, res) => {
    try {
        const periodDays = parseInt(req.query.periodDays) || 90;
        const range = parseAnalyticsRange(req.query, 12);

        const [customers, transactions] = await Promise.all([
            prisma.customer.findMany(),
            prisma.transaction.findMany({
                where: { date: { lt: range.endExclusive } },
                select: { customerPhone: true, date: true }
            })
        ]);

        const analysis = calculateChurnRate(customers, periodDays);
        const monthlyCohortRetention = calculateMonthlyCohortRetention(transactions);

        res.json({
            success: true,
            data: { ...analysis, monthlyCohortRetention, retentionMetric: 'observed monthly customer return rate' },
            periodDays,
            period: range.period
        });
    } catch (error) {
        if (rangeError(res, error)) return;
        console.error('Churn rate calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate churn rate'
        });
    }
});

/**
 * GET /api/analytics/customer-lifetime-value
 * Calculate Customer Lifetime Value (CLV)
 */
router.get('/customer-lifetime-value', authenticateToken, async (req, res) => {
    try {
        const range = parseAnalyticsRange(req.query, 12);

        const [customers, transactions] = await Promise.all([
            prisma.customer.findMany(),
            prisma.transaction.findMany({
                where: { date: range.where },
                select: {
                    customerPhone: true,
                    totalAmount: true,
                    date: true
                }
            })
        ]);

        const analysis = calculateCLV(customers, transactions);

        res.json({
            success: true,
            data: analysis,
            period: range.period
        });
    } catch (error) {
        if (rangeError(res, error)) return;
        console.error('CLV calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate customer lifetime value'
        });
    }
});

/**
 * GET /api/analytics/booking-history
 * Get comprehensive booking history with filters
 * Query params: startDate, endDate, barberId, status, customerPhone, limit, offset
 */
router.get('/booking-history', authenticateToken, async (req, res) => {
    try {
        const {
            barberId,
            status,
            customerPhone,
            limit = 50,
            offset = 0
        } = req.query;

        let range;
        try {
            range = parseDateRange(req.query);
        } catch (error) {
            return sendDateRangeError(res, error);
        }

        // Build filter
        const where = {};
        if (range.start || range.end) where.bookingDate = range.filter;

        if (barberId) where.barberId = parseInt(barberId);
        if (status) where.status = status;
        if (customerPhone) where.customerPhone = { contains: customerPhone };

        // Fetch bookings with pagination
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    barber: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { bookingDate: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.booking.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + bookings.length < total
                }
            }
        });
    } catch (error) {
        console.error('Booking history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch booking history'
        });
    }
});

/**
 * GET /api/analytics/insights
 * Generate AI-powered business insights
 */
router.get('/insights', authenticateToken, async (req, res) => {
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * DAY_MS);
        const previousStart = new Date(startDate.getTime() - 30 * DAY_MS);

        const [transactions, previousTransactions, expenses, services, customers] = await Promise.all([
            prisma.transaction.findMany({
                where: { date: { gte: startDate, lte: endDate } },
                include: { barber: { select: { name: true } } }
            }),
            prisma.transaction.findMany({ where: { date: { gte: previousStart, lt: startDate } } }),
            prisma.expense.findMany({ where: { date: { gte: startDate, lte: endDate } } }),
            prisma.service.findMany({ where: { isActive: true } }),
            prisma.customer.findMany()
        ]);

        const profitMargin = calculateProfitMargin(transactions, expenses, services);
        const churnRate = calculateChurnRate(customers);
        const previousRevenue = previousTransactions.reduce((sum, t) => sum + toNumber(t.totalAmount), 0);
        const current = profitMargin.overall;
        const servicesByContribution = Object.entries(profitMargin.byService)
            .sort((a, b) => b[1].contribution - a[1].contribution);
        const forecast = forecastRevenue(dailyRevenueSeries(transactions, startDate, 30), 30);

        const analysisData = {
            profitMargin,
            churnRate,
            forecast,
            comparison: {
                revenuePercent: percentDelta(current.totalRevenue, previousRevenue),
                transactionPercent: percentDelta(current.transactionCount, previousTransactions.length),
                averageTicketPercent: percentDelta(current.averageTicket, previousTransactions.length ? previousRevenue / previousTransactions.length : 0)
            },
            contributionServices: {
                strongest: servicesByContribution[0]?.[0] || null,
                weakest: servicesByContribution.at(-1)?.[0] || null
            }
        };

        const { generateAnalyticsInsights } = require('../lib/ai');
        const insights = await generateAnalyticsInsights(analysisData);

        res.json({
            success: true,
            data: { insights }
        });
    } catch (error) {
        console.error('AI Insights error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate insights'
        });
    }
});

/**
 * GET /api/analytics/barber-comparison
 * Compare barber performance side-by-side
 * Query params: startDate, endDate
 */
router.get('/barber-comparison', authenticateToken, async (req, res) => {
    try {
        const range = parseAnalyticsRange(req.query, 1);
        const duration = range.endExclusive - range.start;
        const previousRange = { gte: new Date(range.start - duration), lt: range.start };

        const [barbers, transactions, previousTransactions, services] = await Promise.all([
            prisma.user.findMany({ where: { role: { not: 'admin' } }, select: { id: true, name: true, username: true } }),
            prisma.transaction.findMany({ where: { date: range.where } }),
            prisma.transaction.findMany({ where: { date: previousRange } }),
            prisma.service.findMany({ select: { name: true, commissionType: true, commissionValue: true } })
        ]);

        const comparison = barbers.map(barber => {
            const barberTxs = transactions.filter(t => t.barberId === barber.id);
            const previousTxs = previousTransactions.filter(t => t.barberId === barber.id);
            const revenue = barberTxs.reduce((sum, t) => sum + toNumber(t.totalAmount), 0);
            const previousRevenue = previousTxs.reduce((sum, t) => sum + toNumber(t.totalAmount), 0);
            const transactionCount = barberTxs.length;
            const previousTransactionCount = previousTxs.length;
            const averageTicket = transactionCount ? revenue / transactionCount : 0;
            const commission = barberTxs.reduce((sum, transaction) => sum + (Array.isArray(transaction.items) ? transaction.items : []).reduce((itemSum, item) => {
                const service = services.find(entry => entry.name === item.name);
                if (!service) return itemSum;
                const quantity = item.qty || 1;
                return itemSum + (service.commissionType === 'fixed'
                    ? toNumber(service.commissionValue) * quantity
                    : toNumber(item.price) * quantity * toNumber(service.commissionValue) / 100);
            }, 0), 0);
            const contributionAfterCommission = revenue - commission;
            const uniqueCustomers = new Set(barberTxs.filter(t => t.customerPhone).map(t => t.customerPhone)).size;
            const serviceBreakdown = {};
            barberTxs.forEach(t => Array.isArray(t.items) && t.items.forEach(item => {
                const name = item.name || 'Unknown';
                if (!serviceBreakdown[name]) serviceBreakdown[name] = { count: 0, revenue: 0 };
                serviceBreakdown[name].count += item.qty || 1;
                serviceBreakdown[name].revenue += toNumber(item.price) * (item.qty || 1);
            }));
            return {
                barberId: barber.id,
                barberName: barber.name,
                username: barber.username,
                revenue: Math.round(revenue),
                totalRevenue: Math.round(revenue),
                contributionAfterCommission: Math.round(contributionAfterCommission),
                commission: Math.round(commission),
                transactionCount,
                totalTransactions: transactionCount,
                averageTicket: Math.round(averageTicket),
                avgTicket: Math.round(averageTicket),
                previousPeriod: { revenue: Math.round(previousRevenue), transactionCount: previousTransactionCount },
                deltas: {
                    revenue: Math.round(revenue - previousRevenue),
                    revenuePercent: previousRevenue ? (revenue - previousRevenue) / previousRevenue * 100 : null,
                    transactionCount: transactionCount - previousTransactionCount,
                    transactionCountPercent: previousTransactionCount ? (transactionCount - previousTransactionCount) / previousTransactionCount * 100 : null
                },
                uniqueCustomers,
                serviceBreakdown: Object.entries(serviceBreakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue)
            };
        }).sort((a, b) => b.revenue - a.revenue).map((barber, index) => ({ ...barber, rank: index + 1 }));

        res.json({
            success: true,
            data: comparison,
            period: range.period,
            previousPeriod: {
                startDate: previousRange.gte.toISOString().slice(0, 10),
                endDate: new Date(previousRange.lt - 1).toISOString().slice(0, 10)
            }
        });
    } catch (error) {
        if (rangeError(res, error)) return;
        console.error('Barber comparison error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate barber comparison' });
    }
});

module.exports = router;
