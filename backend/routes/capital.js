const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

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

        const capitalList = await prisma.capital.findMany({
            where,
            orderBy: { date: 'desc' },
        });
        res.json(capitalList);
    } catch (error) {
        console.error('Get Capital Error:', error);
        res.status(500).json({ error: 'Failed to fetch capital data' });
    }
});

// POST new capital entry
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { description, amount, date } = req.body;
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
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
