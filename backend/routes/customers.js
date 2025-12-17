const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            // Return top 10 most recent
            const customers = await prisma.customer.findMany({
                orderBy: { updatedAt: 'desc' },
                take: 10,
            });
            return res.json(customers);
        }

        // Search by name or phone
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 20,
        });

        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// POST /api/customers
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone required' });
        }

        const customer = await prisma.customer.upsert({
            where: { phone },
            update: {
                name, // Update name just in case
                totalVisits: { increment: 1 },
                lastVisit: new Date(), // updated to use JS Date
            },
            create: {
                name,
                phone,
                totalVisits: 1,
                lastVisit: new Date(),
            },
        });

        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save customer' });
    }
});

// PATCH /api/customers/:id
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;

        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: { name, phone }
        });

        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

module.exports = router;
