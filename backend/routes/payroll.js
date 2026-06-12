const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');
const { validate, requiredInt, optionalMoney } = require('../lib/validators');

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

// GET /api/payroll/paid - Get paid payroll records for a period
router.get('/paid', authenticateToken, async (req, res) => {
    try {
        const month = parseInt(req.query.month || new Date().getMonth().toString());
        const year = parseInt(req.query.year || new Date().getFullYear().toString());
        const period = `${year}-${String(month + 1).padStart(2, '0')}`;

        const records = await prisma.payroll.findMany({
            where: { period, status: 'paid' }
        });

        // Return a map of barberId -> payroll record
        const paidMap = {};
        for (const r of records) {
            paidMap[r.barberId] = r;
        }

        res.json(paidMap);
    } catch (error) {
        console.error('Payroll Paid Status Error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll status' });
    }
});

// POST /api/payroll/mark-paid - Mark a barber's payroll as paid for a period
router.post('/mark-paid', authenticateToken, requireOwner, validate((req) => ({
    barberId: requiredInt(req.body.barberId, 'barberId', { min: 1 }),
    month: requiredInt(req.body.month, 'month', { min: 0, max: 11 }),
    year: requiredInt(req.body.year, 'year', { min: 2020, max: 2100 }),
    totalServices: requiredInt(req.body.totalServices || 0, 'totalServices', { min: 0 }),
    totalCommission: optionalMoney(req.body.totalCommission || 0, 'totalCommission', { min: 0 }),
    baseSalary: optionalMoney(req.body.baseSalary || 0, 'baseSalary', { min: 0 }),
    bonuses: optionalMoney(req.body.bonuses || 0, 'bonuses', { min: 0 }),
    deductions: optionalMoney(req.body.deductions || 0, 'deductions', { min: 0 })
})), async (req, res) => {
    try {
        const { barberId, month, year, totalServices, totalCommission, baseSalary, bonuses, deductions } = req.validated;

        const period = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;
        const totalPayout = (totalCommission || 0) + (baseSalary || 0) + (bonuses || 0) - (deductions || 0);

        // Check if already paid
        const existing = await prisma.payroll.findFirst({
            where: { barberId: parseInt(barberId), period, status: 'paid' }
        });

        if (existing) {
            return res.status(400).json({ error: 'Payroll already marked as paid for this period' });
        }

        // Get barber name for expense description
        const barber = await prisma.user.findUnique({
            where: { id: parseInt(barberId) },
            select: { name: true }
        });

        const barberName = barber ? barber.name : `Barber #${barberId}`;

        // Use transaction to ensure both records are created atomically
        const [payroll, expense] = await prisma.$transaction([
            prisma.payroll.create({
                data: {
                    barberId: parseInt(barberId),
                    period,
                    totalServices: totalServices || 0,
                    totalCommission: totalCommission || 0,
                    baseSalary: baseSalary || 0,
                    bonuses: bonuses || 0,
                    deductions: deductions || 0,
                    totalPayout,
                    status: 'paid',
                }
            }),
            prisma.expense.create({
                data: {
                    description: `Gaji ${barberName} - ${period}`,
                    amount: totalPayout,
                    category: 'Salary',
                    date: new Date(),
                }
            }),
        ]);

        res.status(201).json(payroll);
    } catch (error) {
        console.error('Mark Payroll Paid Error:', error);
        res.status(500).json({ error: 'Failed to mark payroll as paid' });
    }
});

// DELETE /api/payroll/unmark-paid - Cancel a barber's paid payroll for a period
router.delete('/unmark-paid', authenticateToken, requireOwner, validate((req) => ({
    barberId: requiredInt(req.body.barberId, 'barberId', { min: 1 }),
    month: requiredInt(req.body.month, 'month', { min: 0, max: 11 }),
    year: requiredInt(req.body.year, 'year', { min: 2020, max: 2100 })
})), async (req, res) => {
    try {
        const { barberId, month, year } = req.validated;

        const period = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;

        const existing = await prisma.payroll.findFirst({
            where: { barberId: parseInt(barberId), period, status: 'paid' }
        });

        if (!existing) {
            return res.status(404).json({ error: 'No paid payroll record found for this period' });
        }

        const barber = await prisma.user.findUnique({
            where: { id: parseInt(barberId) },
            select: { name: true }
        });
        const barberName = barber ? barber.name : `Barber #${barberId}`;
        const expenseDescription = `Gaji ${barberName} - ${period}`;

        const matchingExpense = await prisma.expense.findFirst({
            where: {
                description: expenseDescription,
                category: 'Salary',
            }
        });

        const deleteOps = [prisma.payroll.delete({ where: { id: existing.id } })];
        if (matchingExpense) {
            deleteOps.push(prisma.expense.delete({ where: { id: matchingExpense.id } }));
        }

        await prisma.$transaction(deleteOps);

        res.json({ message: 'Payroll payment cancelled successfully' });
    } catch (error) {
        console.error('Unmark Payroll Paid Error:', error);
        res.status(500).json({ error: 'Failed to cancel payroll payment' });
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
