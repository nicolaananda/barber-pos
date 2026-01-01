const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/payroll
router.get('/', authenticateToken, async (req, res) => {
    try {
        const month = parseInt(req.query.month || new Date().getMonth().toString());
        const year = parseInt(req.query.year || new Date().getFullYear().toString());

        // Calculate start and end date for the filter
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59); // End of month

        // Fetch all barbers (active users who are not just admins if needed)
        const barbers = await prisma.user.findMany({
            where: { role: { not: 'admin' } },
        });

        const payrollStats = await Promise.all(
            barbers.map(async (barber) => {
                // Aggregate transactions for this barber in this period
                // Fetch all services to get commission rules
                const services = await prisma.service.findMany();
                const serviceMap = services.reduce((acc, service) => {
                    acc[service.name] = service;
                    return acc;
                }, {});

                let estimatedCommission = 0;

                // Fetch full transactions to iterate items
                const transactions = await prisma.transaction.findMany({
                    where: {
                        barberId: barber.id,
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                });

                let totalRevenue = 0;
                let totalTransactions = transactions.length;

                for (const t of transactions) {
                    totalRevenue += t.totalAmount;
                    if (Array.isArray(t.items)) {
                        for (const item of t.items) {
                            const service = serviceMap[item.name];
                            if (service) {
                                if (service.commissionType === 'percentage') {
                                    // Calculate based on item price
                                    estimatedCommission += (item.price * service.commissionValue) / 100;
                                } else {
                                    // Flat rate
                                    estimatedCommission += service.commissionValue;
                                }
                            } else {
                                // Fallback or log if service not found (maybe deleted)
                                // For now, assume 0 or maybe try to match by loose name
                            }
                        }
                    }
                }

                return {
                    barberId: barber.id,
                    barberName: barber.name,
                    totalTransactions,
                    totalRevenue,
                    estimatedCommission,
                    period: startDate.toLocaleString('default', {
                        month: 'long',
                        year: 'numeric',
                    }),
                };
            })
        );

        res.json(payrollStats);
    } catch (error) {
        console.error('Payroll API Error:', error);
        res.status(500).json({ error: 'Failed to calculate payroll' });
    }
});

module.exports = router;
