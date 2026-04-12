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
    calculateCLV
} = require('../lib/analytics');

/**
 * GET /api/analytics/profit-margin
 * Calculate profit margin per service and per barber
 * Query params: startDate, endDate
 */
router.get('/profit-margin', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[Analytics] Profit Margin Request: ${startDate} to ${endDate}`);

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) {
            // Set end date to end of day 23:59:59.999
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        console.log('[Analytics] Date Filter:', dateFilter);

        // Fetch data
        const [transactions, expenses, services] = await Promise.all([
            prisma.transaction.findMany({
                where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
                include: { barber: { select: { id: true, name: true } } }
            }),
            prisma.expense.findMany({
                where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {}
            }),
            prisma.service.findMany({
                where: { isActive: true }
            })
        ]);

        console.log(`[Analytics] Found ${transactions.length} transactions, ${expenses.length} expenses, ${services.length} services`);

        const analysis = calculateProfitMargin(transactions, expenses, services);

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
            error: 'Failed to calculate profit margin: ' + error.message
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
        const periods = parseInt(req.query.periods) || 30;

        // Get daily revenue for the past 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: ninetyDaysAgo }
            },
            select: {
                date: true,
                totalAmount: true
            }
        });

        // Aggregate by date
        const dailyRevenue = {};
        transactions.forEach(t => {
            const dateKey = t.date.toISOString().split('T')[0];
            if (!dailyRevenue[dateKey]) {
                dailyRevenue[dateKey] = 0;
            }
            dailyRevenue[dateKey] += t.totalAmount;
        });

        const historicalData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
            date,
            revenue
        }));

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
        const defaultStart = new Date();
        defaultStart.setMonth(defaultStart.getMonth() - 12);
        const dateFilter = {};
        if (req.query.startDate) dateFilter.gte = new Date(req.query.startDate);
        else dateFilter.gte = defaultStart;
        if (req.query.endDate) {
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        const [customers, transactions] = await Promise.all([
            prisma.customer.findMany(),
            prisma.transaction.findMany({
                where: { date: dateFilter },
                select: {
                    customerPhone: true,
                    totalAmount: true,
                    date: true
                }
            })
        ]);

        const segmentation = segmentCustomers(customers, transactions);

        res.json({
            success: true,
            data: segmentation
        });
    } catch (error) {
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
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const transactions = await prisma.transaction.findMany({
            where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
            select: {
                date: true,
                totalAmount: true
            }
        });

        const analysis = analyzePeakHours(transactions);

        res.json({
            success: true,
            data: analysis,
            period: {
                startDate: startDate || 'all',
                endDate: endDate || 'all'
            }
        });
    } catch (error) {
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

        const customers = await prisma.customer.findMany();

        const analysis = calculateChurnRate(customers, periodDays);

        res.json({
            success: true,
            data: analysis,
            periodDays
        });
    } catch (error) {
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
        const defaultStart = new Date();
        defaultStart.setMonth(defaultStart.getMonth() - 12);
        const dateFilter = {};
        if (req.query.startDate) dateFilter.gte = new Date(req.query.startDate);
        else dateFilter.gte = defaultStart;
        if (req.query.endDate) {
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        const [customers, transactions] = await Promise.all([
            prisma.customer.findMany(),
            prisma.transaction.findMany({
                where: { date: dateFilter },
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
            data: analysis
        });
    } catch (error) {
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
            startDate,
            endDate,
            barberId,
            status,
            customerPhone,
            limit = 50,
            offset = 0
        } = req.query;

        // Build filter
        const where = {};

        if (startDate || endDate) {
            where.bookingDate = {};
            if (startDate) where.bookingDate.gte = new Date(startDate);
            if (endDate) where.bookingDate.lte = new Date(endDate);
        }

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
        // Gather data for analysis
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days

        const [transactions, expenses, services, customers] = await Promise.all([
            prisma.transaction.findMany({
                where: { date: { gte: startDate } },
                include: { barber: { select: { name: true } } }
            }),
            prisma.expense.findMany({
                where: { date: { gte: startDate } }
            }),
            prisma.service.findMany({ where: { isActive: true } }),
            prisma.customer.findMany()
        ]);

        // Calculate metrics
        const profitMargin = calculateProfitMargin(transactions, expenses, services);
        const churnRate = calculateChurnRate(customers);

        // Prepare data for AI
        const analysisData = {
            profitMargin,
            churnRate,
            forecast: { trend: 'stable' } // Simplified for now
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

module.exports = router;
