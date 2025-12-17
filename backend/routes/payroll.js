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
                const aggregate = await prisma.transaction.aggregate({
                    where: {
                        barberId: barber.id,
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _sum: {
                        totalAmount: true,
                    },
                    _count: {
                        id: true,
                    },
                });

                const totalRevenue = aggregate._sum.totalAmount || 0;
                const totalTransactions = aggregate._count.id || 0;

                let estimatedCommission = 0;
                if (barber.commissionType === 'percentage') {
                    estimatedCommission = totalRevenue * (barber.commissionValue / 100);
                } else {
                    estimatedCommission = totalTransactions * barber.commissionValue;
                }

                return {
                    barberId: barber.id,
                    barberName: barber.name,
                    totalTransactions,
                    totalRevenue,
                    commissionType: barber.commissionType,
                    commissionRate: barber.commissionValue,
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
