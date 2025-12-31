const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

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
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, price } = req.body;
        const service = await prisma.service.create({
            data: {
                name,
                price: parseInt(price),
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
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price: parseInt(price)
            }
        });
        res.json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', authenticateToken, async (req, res) => {
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
