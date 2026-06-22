const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');
const { validate, requiredInt, requiredDate, optionalString } = require('../lib/validators');
const { publicReadLimiter } = require('../middleware/rateLimiter');

const optionalAuthenticate = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return authenticateToken(req, res, next);
};

const parseDateOnly = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

// GET /api/offdays
// Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), barberId (optional)
router.get('/', publicReadLimiter, optionalAuthenticate, async (req, res) => {
    try {
        const { start, end, barberId } = req.query;
        const isOwner = req.user?.role === 'owner';

        const whereClause = {};

        if (!start || !end) {
            return res.status(400).json({ error: 'start and end query parameters are required' });
        }

        const startDate = parseDateOnly(start);
        const endDate = parseDateOnly(end);
        if (!startDate || !endDate || endDate < startDate) {
            return res.status(400).json({ error: 'Invalid date range' });
        }

        const maxRange = new Date(startDate);
        maxRange.setDate(maxRange.getDate() + (isOwner ? 120 : 14));
        if (endDate > maxRange) {
            return res.status(400).json({ error: `Date range too large. Maximum ${isOwner ? 120 : 14} days.` });
        }

        if (startDate && endDate) {
            whereClause.date = {
                gte: startDate,
                lte: endDate
            };
        }

        if (barberId) {
            const parsedBarberId = parseInt(barberId, 10);
            if (Number.isNaN(parsedBarberId) || parsedBarberId < 1) {
                return res.status(400).json({ error: 'Invalid barberId' });
            }
            whereClause.userId = parsedBarberId;
        }

        const offDays = await prisma.offDay.findMany({
            where: whereClause,
            select: isOwner ? {
                id: true,
                userId: true,
                date: true,
                reason: true,
                user: { select: { name: true, username: true } }
            } : {
                userId: true,
                date: true,
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
router.post('/', authenticateToken, requireOwner, validate((req) => ({
    userId: requiredInt(req.body.userId, 'userId', { min: 1 }),
    date: requiredDate(req.body.date, 'date'),
    endDate: req.body.endDate ? requiredDate(req.body.endDate, 'endDate') : undefined,
    reason: optionalString(req.body.reason, 'reason', { max: 200 })
})), async (req, res) => {
    try {
        const { userId, reason } = req.validated;
        const date = req.body.date;
        const endDate = req.body.endDate;

        const parsedUserId = userId;
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
            })),
            skipDuplicates: true
        });

        const offDaysInRange = await prisma.offDay.findMany({
            where: {
                userId: parsedUserId,
                date: {
                    in: dates
                }
            },
            orderBy: { date: 'asc' }
        });

        const storedDates = new Set(offDaysInRange.map((offDay) => offDay.date.toISOString().slice(0, 10)));
        const requestedDates = dates.map((day) => day.toISOString().slice(0, 10));
        const skippedExistingDates = requestedDates.filter((day) => existingDates.has(day));
        const createdDates = requestedDates.filter((day) => !existingDates.has(day) && storedDates.has(day));

        res.status(201).json({
            created: offDaysInRange.filter((offDay) => createdDates.includes(offDay.date.toISOString().slice(0, 10))),
            skippedExistingDates
        });
    } catch (error) {
        // Unique constraint violation P2002
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Selected off day dates already exist for this user' });
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
