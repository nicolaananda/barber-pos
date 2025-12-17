const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// POST /api/shifts (Open Shift)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { openingCash } = req.body;
        // openingCash comes as string or number? Standardize to Float.
        // openedBy is the current user.

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Invalid User' });
        }

        const userId = parseInt(req.user.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        // Check if there is already an open shift
        const existingOpenShift = await prisma.cashShift.findFirst({
            where: { status: 'open' },
        });

        if (existingOpenShift) {
            return res.status(400).json({ error: 'A shift is already open' });
        }

        const shift = await prisma.cashShift.create({
            data: {
                openedById: userId,
                startCash: parseFloat(openingCash),
                status: 'open',
                startTime: new Date(),
            },
        });

        res.status(201).json(shift);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to open shift' });
    }
});

// GET /api/shifts
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;

        const where = {};
        if (status) where.status = status;

        const shifts = await prisma.cashShift.findMany({
            where,
            orderBy: { startTime: 'desc' },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
        });

        res.json(shifts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch shifts' });
    }
});

// GET /api/shifts/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await prisma.cashShift.findUnique({
            where: { id: parseInt(id) },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
        });

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        res.json(shift);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /api/shifts/:id (Close Shift)
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { closingCash, closedBy, totalSystemRevenue } = req.body;

        const shiftId = parseInt(id);

        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId },
        });

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        if (shift.status === 'closed') {
            return res.status(400).json({ error: 'Shift is already closed' });
        }

        const updatedShift = await prisma.cashShift.update({
            where: { id: shiftId },
            data: {
                actualEndCash: closingCash,
                closedById: closedBy ? parseInt(closedBy) : undefined,
                totalRevenue: totalSystemRevenue,
                status: 'closed',
                endTime: new Date(),
            },
        });

        res.json(updatedShift);
    } catch (error) {
        console.error('Shift Close Error:', error);
        res.status(500).json({ error: 'Failed to close shift' });
    }
});

module.exports = router;
