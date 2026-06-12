const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

// GET /api/offdays
// Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), barberId (optional)
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { userId, date, endDate, reason } = req.body;

        if (!userId || !date) {
            return res.status(400).json({ error: 'User ID and Date are required' });
        }

        const parsedUserId = parseInt(userId);
        const startDate = new Date(`${date}T00:00:00`);
        const finishDate = new Date(`${endDate || date}T00:00:00`);

        if (Number.isNaN(parsedUserId) || Number.isNaN(startDate.getTime()) || Number.isNaN(finishDate.getTime())) {
            return res.status(400).json({ error: 'Invalid user or date' });
        }

        if (finishDate < startDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        const dates = [];
        const cursor = new Date(startDate);
        while (cursor <= finishDate) {
            dates.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        const existingOffDays = await prisma.offDay.findMany({
            where: {
                userId: parsedUserId,
                date: {
                    in: dates
                }
            },
            select: { date: true }
        });

        const existingDates = new Set(existingOffDays.map((offDay) => offDay.date.toISOString().slice(0, 10)));
        const datesToCreate = dates.filter((day) => !existingDates.has(day.toISOString().slice(0, 10)));

        if (datesToCreate.length === 0) {
            return res.status(409).json({ error: 'All selected off day dates already exist for this user' });
        }

        await prisma.offDay.createMany({
            data: datesToCreate.map((day) => ({
                userId: parsedUserId,
                date: day,
                reason
            }))
        });

        const createdOffDays = await prisma.offDay.findMany({
            where: {
                userId: parsedUserId,
                date: {
                    in: datesToCreate
                }
            },
            orderBy: { date: 'asc' }
        });

        res.status(201).json({
            created: createdOffDays,
            skippedExistingDates: Array.from(existingDates)
        });
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
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
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
