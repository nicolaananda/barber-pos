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

        // Fetch all services to get commission rules (outside the loop to avoid N+1)
        const services = await prisma.service.findMany();
        // Build maps by both ID and name for backward compatibility
        const serviceByIdMap = services.reduce((acc, service) => {
            acc[service.id] = service;
            return acc;
        }, {});
        const serviceByNameMap = services.reduce((acc, service) => {
            acc[service.name] = service;
            return acc;
        }, {});

        const payrollStats = await Promise.all(
            barbers.map(async (barber) => {
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
                            const qty = item.qty || 1;
                            // Try matching by serviceId first (reliable), fallback to name matching (legacy)
                            const service = (item.serviceId && serviceByIdMap[item.serviceId]) || serviceByNameMap[item.name];
                            if (service) {
                                if (service.commissionType === 'percentage') {
                                    // Calculate based on item price * qty
                                    estimatedCommission += ((item.price * qty) * service.commissionValue) / 100;
                                } else {
                                    // Flat rate * qty
                                    estimatedCommission += service.commissionValue * qty;
                                }
                            } else {
                                // Fallback or log if service not found (maybe deleted)
                                // For now, assume 0
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

// GET /api/payroll/export/csv - Export payroll as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
    try {
        const month = parseInt(req.query.month || new Date().getMonth().toString());
        const year = parseInt(req.query.year || new Date().getFullYear().toString());
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const barbers = await prisma.user.findMany({ where: { role: { not: 'admin' } } });
        const services = await prisma.service.findMany();
        const serviceByIdMap = services.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
        const serviceByNameMap = services.reduce((acc, s) => { acc[s.name] = s; return acc; }, {});

        const rows = [];
        for (const barber of barbers) {
            const transactions = await prisma.transaction.findMany({
                where: { barberId: barber.id, date: { gte: startDate, lte: endDate } },
            });

            let totalRevenue = 0;
            let estimatedCommission = 0;
            for (const t of transactions) {
                totalRevenue += t.totalAmount;
                if (Array.isArray(t.items)) {
                    for (const item of t.items) {
                        const qty = item.qty || 1;
                        const service = (item.serviceId && serviceByIdMap[item.serviceId]) || serviceByNameMap[item.name];
                        if (service) {
                            if (service.commissionType === 'percentage') {
                                estimatedCommission += ((item.price * qty) * service.commissionValue) / 100;
                            } else {
                                estimatedCommission += service.commissionValue * qty;
                            }
                        }
                    }
                }
            }

            rows.push(`"${barber.name}",${transactions.length},${totalRevenue},${estimatedCommission}`);
        }

        const { format } = require('date-fns');
        const header = 'Barber,Total Transactions,Total Revenue,Estimated Commission\n';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll-${year}-${String(month + 1).padStart(2, '0')}.csv`);
        res.send(header + rows.join('\n'));
    } catch (error) {
        console.error('Export Payroll CSV Error:', error);
        res.status(500).json({ error: 'Failed to export payroll' });
    }
});

module.exports = router;
