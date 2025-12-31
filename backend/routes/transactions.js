const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const { format } = require('date-fns');
const whatsappService = require('../lib/whatsapp');

// POST /api/transactions
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, totalAmount, paymentMethod, customerName, customerPhone, barberId } = req.body;

        const bId = parseInt(barberId);
        if (isNaN(bId)) {
            return res.status(400).json({ error: 'Invalid Barber ID' });
        }

        // Generate Invoice Code INV-YYMMDD-XXX
        const today = new Date();
        const todayStr = format(today, 'yyMMdd');

        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const countToday = await prisma.transaction.count({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const sequence = (countToday + 1).toString().padStart(3, '0');
        const invoiceCode = `INV-${todayStr}-${sequence}`;

        // Find active shift
        const activeShift = await prisma.cashShift.findFirst({
            where: { status: 'open' },
        });

        const transaction = await prisma.transaction.create({
            data: {
                invoiceCode,
                date: new Date(),
                customerName,
                customerPhone,
                barberId: bId,
                items, // Json type
                totalAmount,
                paymentMethod,
            },
        });

        // Update Shift Revenue if active
        if (activeShift) {
            await prisma.cashShift.update({
                where: { id: activeShift.id },
                data: {
                    totalRevenue: { increment: totalAmount },
                },
            });
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Transaction Error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// GET /api/transactions
router.get('/', async (req, res) => {
    try {
        const { date } = req.query;

        const where = {};

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }

        if (req.query.phone) {
            where.customerPhone = req.query.phone;
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                barber: {
                    select: { name: true },
                },
            },
        });

        const formatted = transactions.map((t) => ({
            ...t,
            barberId: { name: t.barber.name }, // Mocking nested structure for frontend compat
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// POST /api/transactions/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticateToken, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);

        if (isNaN(transactionId)) {
            return res.status(400).json({ error: 'Invalid transaction ID' });
        }

        // Fetch transaction with barber info
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                barber: {
                    select: { name: true }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (!transaction.customerPhone) {
            return res.status(400).json({ error: 'Customer phone number not available' });
        }

        // Send invoice via WhatsApp
        const result = await whatsappService.sendInvoice(transaction, transaction.barber.name);

        if (result.success) {
            res.json({
                success: true,
                message: 'Invoice sent successfully via WhatsApp',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Send WhatsApp Error:', error);
        res.status(500).json({ error: 'Failed to send invoice via WhatsApp' });
    }
});

module.exports = router;
