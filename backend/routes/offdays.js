const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/offdays
// Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), barberId (optional)
router.get('/', async (req, res) => {
    try {
        const { start, end, barberId } = req.query;

        const whereClause = {};

        if (start && end) {
            whereClause.date = {
                gte: new Date(start),
                lte: new Date(end)
            };
        }

        if (barberId) {
            whereClause.userId = parseInt(barberId);
        }

        const offDays = await prisma.offDay.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, username: true }
                }
            },
            orderBy: { date: 'asc' }
        });

        res.json(offDays);
    } catch (error) {
        console.error('Error fetching off days:', error);
        res.status(500).json({ error: 'Failed to fetch off days' });
    }
});

// POST /api/offdays
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { userId, date, reason } = req.body;

        if (!userId || !date) {
            return res.status(400).json({ error: 'User ID and Date are required' });
        }

        const offDay = await prisma.offDay.create({
            data: {
                userId: parseInt(userId),
                date: new Date(date),
                reason
            }
        });

        res.status(201).json(offDay);
    } catch (error) {
        // Unique constraint violation P2002
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Off day for this user and date already exists' });
        }
        console.error('Error creating off day:', error);
        res.status(500).json({ error: 'Failed to create off day' });
    }
});

// DELETE /api/offdays/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.offDay.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Off day deleted' });
    } catch (error) {
        console.error('Error deleting off day:', error);
        res.status(500).json({ error: 'Failed to delete off day' });
    }
});

module.exports = router;
