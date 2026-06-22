const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');
const { validate, requiredString, requiredMoney, optionalMoney, optionalEnum } = require('../lib/validators');
const { publicReadLimiter } = require('../middleware/rateLimiter');

const optionalAuthenticate = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return authenticateToken(req, res, next);
};

// GET /api/services
// GET /api/services - Public
router.get('/', publicReadLimiter, optionalAuthenticate, async (req, res) => {
    try {
        const isOwner = req.user?.role === 'owner';
        const services = await prisma.service.findMany({
            where: { isActive: true },
            select: isOwner ? undefined : {
                id: true,
                name: true,
                price: true,
                isActive: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(services);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST /api/services
router.post('/', authenticateToken, requireOwner, validate((req) => ({
    name: requiredString(req.body.name, 'name', { max: 100 }),
    price: requiredMoney(req.body.price, 'price', { min: 0 }),
    commissionType: optionalEnum(req.body.commissionType || 'percentage', 'commissionType', ['percentage', 'flat']),
    commissionValue: optionalMoney(req.body.commissionValue || 0, 'commissionValue', { min: 0 })
})), async (req, res) => {
    try {
        const { name, price, commissionType, commissionValue } = req.validated;

        const service = await prisma.service.create({
            data: {
                name,
                price,
                commissionType: commissionType || 'percentage',
                commissionValue: commissionValue || 0,
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
router.patch('/:id', authenticateToken, requireOwner, validate((req) => ({
    name: requiredString(req.body.name, 'name', { max: 100 }),
    price: requiredMoney(req.body.price, 'price', { min: 0 }),
    commissionType: optionalEnum(req.body.commissionType || 'percentage', 'commissionType', ['percentage', 'flat']),
    commissionValue: optionalMoney(req.body.commissionValue || 0, 'commissionValue', { min: 0 })
})), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, commissionType, commissionValue } = req.validated;

        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price,
                commissionType,
                commissionValue
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
