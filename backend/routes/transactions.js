const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');
const { format } = require('date-fns');
const whatsappService = require('../lib/whatsapp');
const backupService = require('../lib/backupService');
const { logAudit } = require('../lib/auditLogger');

// POST /api/transactions
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, totalAmount, paymentMethod, customerName, customerPhone, barberId } = req.body;

        const bId = parseInt(barberId);
        if (isNaN(bId)) {
            return res.status(400).json({ error: 'Invalid Barber ID' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }
        const calculatedTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty || 1)), 0);
        if (Math.abs(calculatedTotal - totalAmount) > 1) {
            return res.status(400).json({ error: 'Total amount does not match items' });
        }

        // Find active shift
        const activeShift = await prisma.cashShift.findFirst({
            where: { status: 'open' },
        });

        // Wrap invoice generation + transaction creation in a transaction with retry on P2002
        let transaction;
        const MAX_RETRIES = 3;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                transaction = await prisma.$transaction(async (tx) => {
                    // Generate Invoice Code INV-YYMMDD-XXX
                    const today = new Date();
                    const todayStr = format(today, 'yyMMdd');
                    const prefix = `INV-${todayStr}-`;

                    // Find the highest existing sequence number for today
                    // This handles gaps from deleted invoices
                    const lastInvoice = await tx.transaction.findFirst({
                        where: {
                            invoiceCode: { startsWith: prefix }
                        },
                        orderBy: { invoiceCode: 'desc' },
                        select: { invoiceCode: true }
                    });

                    let nextSeq = 1;
                    if (lastInvoice) {
                        const lastSeq = parseInt(lastInvoice.invoiceCode.slice(-3));
                        nextSeq = lastSeq + 1;
                    }

                    const invoiceCode = `${prefix}${nextSeq.toString().padStart(3, '0')}`;

                    return await tx.transaction.create({
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
                });
                break; // Success, exit retry loop
            } catch (err) {
                if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
                    continue; // Retry on unique constraint violation
                }
                throw err;
            }
        }

        // Auto-complete booking if bookingId is provided, and link to transaction
        console.log(`[Transaction] bookingId in request body:`, req.body.bookingId, typeof req.body.bookingId);
        if (req.body.bookingId != null) {
            try {
                await prisma.booking.update({
                    where: { id: parseInt(req.body.bookingId) },
                    data: {
                        status: 'completed',
                    }
                });
                console.log(`[Auto] Booking #${req.body.bookingId} marked as completed.`);
            } catch (err) {
                console.error(`Failed to mark booking #${req.body.bookingId} as completed:`, err);
            }
        }

        // Update Shift Revenue if active
        if (activeShift) {
            await prisma.cashShift.update({
                where: { id: activeShift.id },
                data: {
                    totalRevenue: { increment: totalAmount },
                },
            });
        }

        // 🔒 AUTOMATIC BACKUP: Trigger backup after transaction
        backupService.backupAfterTransaction(transaction).catch(err => {
            console.error('Background backup error:', err);
            // Don't fail the request if backup fails
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Transaction Error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// GET /api/transactions
router.get('/', authenticateToken, async (req, res) => {
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

// PUT /api/transactions/:id
router.put('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const { items, totalAmount, paymentMethod, customerName, customerPhone, barberId } = req.body;

        if (isNaN(transactionId)) return res.status(400).json({ error: 'Invalid ID' });

        // 1. Get Old Transaction
        const oldTransaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!oldTransaction) return res.status(404).json({ error: 'Transaction not found' });

        const amountDiff = totalAmount - oldTransaction.totalAmount;

        // 2. Update Transaction
        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                items, // Json
                totalAmount,
                paymentMethod,
                customerName,
                customerPhone,
                barberId: parseInt(barberId) // Allow changing barber too
            }
        });

        // 3. Update Active Shift if applicable (Simple logic: if transaction is recent)
        // Only update if shift is OPEN. If closed, we probably shouldn't touch provided 'totalRevenue'.
        // Or we should? 'totalRevenue' in Shift is meant to track cash in drawer? 
        // If payment method is QRIS, it affects 'totalRevenue' only if we track all revenue there.
        // Let's assume we update active shift if exists.

        if (amountDiff !== 0) {
            const activeShift = await prisma.cashShift.findFirst({
                where: { status: 'open' }
            });

            // Only update shift if the transaction date is "current" (e.g. today). 
            // If I edit a transaction from last month, I should NOT update today's shift.
            // Check if transaction.date is same day as activeShift.startTime?
            // Simplification: If activeShift exists and transaction date is > activeShift.startTime
            if (activeShift && new Date(updatedTransaction.date) >= new Date(activeShift.startTime)) {
                await prisma.cashShift.update({
                    where: { id: activeShift.id },
                    data: {
                        totalRevenue: { increment: amountDiff }
                    }
                });
            }
        }

        logAudit('transaction.edit', req.user.id, { transactionId });

        res.json(updatedTransaction);
    } catch (error) {
        console.error('Update Transaction Error:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// GET /api/transactions/export/csv - Export transactions as CSV
router.get('/export/csv', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { barber: { select: { name: true } } },
        });

        // Build CSV
        const header = 'Invoice,Date,Barber,Customer,Items,Total,Payment Method\n';
        const rows = transactions.map(t => {
            const items = Array.isArray(t.items)
                ? t.items.map(i => `${i.name} x${i.qty || 1}`).join('; ')
                : '';
            const date = format(new Date(t.date), 'yyyy-MM-dd HH:mm');
            return `"${t.invoiceCode}","${date}","${t.barber.name}","${t.customerName || 'Walk-in'}","${items}",${t.totalAmount},"${t.paymentMethod}"`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions-${format(new Date(), 'yyyyMMdd')}.csv`);
        res.send(header + rows);
    } catch (error) {
        console.error('Export CSV Error:', error);
        res.status(500).json({ error: 'Failed to export transactions' });
    }
});

// DELETE /api/transactions/:id - Void/delete a transaction (owner only, PIN required)
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) return res.status(400).json({ error: 'Invalid ID' });

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        // Reverse shift revenue if applicable
        const activeShift = await prisma.cashShift.findFirst({
            where: { status: 'open' }
        });

        if (activeShift && new Date(transaction.date) >= new Date(activeShift.startTime)) {
            await prisma.cashShift.update({
                where: { id: activeShift.id },
                data: {
                    totalRevenue: { decrement: transaction.totalAmount }
                }
            });
        }

        // Delete the transaction
        await prisma.transaction.delete({ where: { id: transactionId } });

        logAudit('transaction.void', req.user.id, {
            transactionId,
            invoiceCode: transaction.invoiceCode,
            amount: transaction.totalAmount,
            reason: req.body.reason || 'No reason provided'
        });

        res.json({ message: 'Transaction voided successfully', invoiceCode: transaction.invoiceCode });
    } catch (error) {
        console.error('Void Transaction Error:', error);
        res.status(500).json({ error: 'Failed to void transaction' });
    }
});

module.exports = router;
