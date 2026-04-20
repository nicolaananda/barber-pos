const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

// GET /api/services
// GET /api/services - Public
router.get('/', async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
        res.json(services);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST /api/services
router.post('/', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { name, price, commissionType, commissionValue } = req.body;

        // Input validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({ error: 'Valid price is required' });
        }

        const service = await prisma.service.create({
            data: {
                name,
                price: parseInt(price),
                commissionType: commissionType || 'percentage',
                commissionValue: parseFloat(commissionValue) || 0,
                isActive: true
            }
        });
        res.status(201).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// PATCH /api/services/:id
router.patch('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, commissionType, commissionValue } = req.body;

        // Input validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({ error: 'Valid price is required' });
        }

        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price: parseInt(price),
                commissionType,
                commissionValue: parseFloat(commissionValue)
            }
        });
        res.json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete
        await prisma.service.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.json({ message: 'Service deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
