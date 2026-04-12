const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

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
router.post('/', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { description, amount, date } = req.body;

        // Input validation
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description is required' });
        }
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const newCapital = await prisma.capital.create({
            data: {
                description,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                type: 'injection'
            },
        });
        res.json(newCapital);
    } catch (error) {
        console.error('Create Capital Error:', error);
        res.status(500).json({ error: 'Failed to create capital entry' });
    }
});

// PUT update capital entry
router.put('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, date } = req.body;
        const updatedCapital = await prisma.capital.update({
            where: { id: parseInt(id) },
            data: {
                description,
                amount: parseFloat(amount),
                date: date ? new Date(date) : undefined,
            },
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
        await prisma.capital.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Capital entry deleted' });
    } catch (error) {
        console.error('Delete Capital Error:', error);
        res.status(500).json({ error: 'Failed to delete capital entry' });
    }
});

module.exports = router;
