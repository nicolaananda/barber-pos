const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');
const { validate, requiredString, requiredMoney, optionalDate } = require('../lib/validators');
const { logAudit } = require('../lib/auditLogger');

// GET all capital entries
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const capitalList = await prisma.capital.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        });

        if (req.query.page) {
            const total = await prisma.capital.count({ where });
            return res.json({
                data: capitalList,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        }
        res.json(capitalList);
    } catch (error) {
        console.error('Get Capital Error:', error);
        res.status(500).json({ error: 'Failed to fetch capital data' });
    }
});

// POST new capital entry
router.post('/', authenticateToken, requireOwner, validate((req) => ({
    description: requiredString(req.body.description, 'description', { max: 200 }),
    amount: requiredMoney(req.body.amount, 'amount', { min: 0 }),
    date: optionalDate(req.body.date, 'date')
})), async (req, res) => {
    try {
        const { description, amount, date } = req.validated;

        const newCapital = await prisma.capital.create({
            data: {
                description,
                amount,
                date: date || new Date(),
                type: 'injection'
            },
        });
        logAudit('capital.create', req.user.id, {
            capitalId: newCapital.id,
            amount: Number(newCapital.amount),
            description: newCapital.description,
        });
        res.json(newCapital);
    } catch (error) {
        console.error('Create Capital Error:', error);
        res.status(500).json({ error: 'Failed to create capital entry' });
    }
});

// PUT update capital entry
router.put('/:id', authenticateToken, requireOwner, validate((req) => ({
    description: requiredString(req.body.description, 'description', { max: 200 }),
    amount: requiredMoney(req.body.amount, 'amount', { min: 0 }),
    date: optionalDate(req.body.date, 'date')
})), async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, date } = req.validated;
        const previousCapital = await prisma.capital.findUnique({ where: { id: parseInt(id) } });

        if (!previousCapital) return res.status(404).json({ error: 'Capital entry not found' });

        const updatedCapital = await prisma.capital.update({
            where: { id: parseInt(id) },
            data: {
                description,
                amount,
                date,
            },
        });
        logAudit('capital.edit', req.user.id, {
            capitalId: updatedCapital.id,
            previousAmount: Number(previousCapital.amount),
            amount: Number(updatedCapital.amount),
            previousDescription: previousCapital.description,
            description: updatedCapital.description,
        });
        res.json(updatedCapital);
    } catch (error) {
        console.error('Update Capital Error:', error);
        res.status(500).json({ error: 'Failed to update capital entry' });
    }
});

// DELETE capital entry
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const capital = await prisma.capital.delete({
            where: { id: parseInt(id) },
        });
        logAudit('capital.delete', req.user.id, {
            capitalId: capital.id,
            amount: Number(capital.amount),
            description: capital.description,
        });
        res.json({ message: 'Capital entry deleted' });
    } catch (error) {
        console.error('Delete Capital Error:', error);
        res.status(500).json({ error: 'Failed to delete capital entry' });
    }
});

module.exports = router;
