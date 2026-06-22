const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const { validate, requiredString, optionalString, requiredInt, requiredEnum } = require('../lib/validators');
const { logAudit } = require('../lib/auditLogger');
const upload = require('../middleware/upload');
const { validateImageContent } = require('../middleware/upload');
const { uploadFile } = require('../lib/r2');
const path = require('path');

const barberSelect = {
    id: true,
    username: true,
    name: true,
    role: true,
    status: true,
    availability: true,
    defaultOffDay: true,
    photoUrl: true,
    createdAt: true,
    updatedAt: true,
};

const publicBarberSelect = {
    id: true,
    username: true,
    name: true,
    role: true,
    availability: true,
    defaultOffDay: true,
    photoUrl: true,
};

const getRequestBody = (req) => req.body || {};

const uploadBarberPhoto = async (file, targetId) => {
    if (!file) return null;
    if (!validateImageContent(file.buffer)) {
        const error = new Error('Invalid image file');
        error.statusCode = 400;
        throw error;
    }

    const ext = path.extname(file.originalname || '').toLowerCase() || '.webp';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.webp';
    const filename = `barbers/barber-${targetId}-${Date.now()}${safeExt}`;
    return uploadFile(file.buffer, filename, file.mimetype || 'image/webp');
};

// GET /api/users/barbers - Get all barbers (PUBLIC - for Status page)
router.get('/barbers', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                status: 'active',
                OR: [
                    { role: 'staff' },
                    { username: 'bagus' }
                ]
            },
            select: publicBarberSelect,
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching barbers:', error);
        res.status(500).json({ error: 'Failed to fetch barbers' });
    }
});

// GET /api/users
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Return all active users (owners and staff)
        // Manually exclude password
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                availability: true,
                defaultOffDay: true,
                photoUrl: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PATCH /api/users/:id/availability
router.patch('/:id/availability', authenticateToken, validate((req) => ({
    targetId: requiredInt(req.params.id, 'id', { min: 1 }),
    status: requiredEnum(req.body.status, 'status', ['available', 'working', 'offday'])
})), async (req, res) => {
    try {
        const { targetId, status } = req.validated;

        // IDOR protection: only owner or self can update
        if (req.user.role !== 'owner' && req.user.id !== targetId) {
            return res.status(403).json({ error: 'You can only update your own availability' });
        }

        console.log('Updating availability for user:', targetId, 'to:', status);

        const user = await prisma.user.update({
            where: { id: targetId },
            data: { availability: status }
        });

        logAudit('user.availability.update', req.user.id, { targetId, status });

        console.log('User updated successfully:', user.id);
        res.json(user);
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// PATCH /api/users/:id/default-offday - Update recurring weekly off-day
router.patch('/:id/default-offday', authenticateToken, validate((req) => ({
    targetId: requiredInt(req.params.id, 'id', { min: 1 }),
    defaultOffDay: req.body.defaultOffDay === null ? null : requiredInt(req.body.defaultOffDay, 'defaultOffDay', { min: 0, max: 6 })
})), async (req, res) => {
    try {
        const { targetId, defaultOffDay } = req.validated;

        // IDOR protection: only owner can update default off-day
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Only owners can update default off-day' });
        }

        const user = await prisma.user.update({
            where: { id: targetId },
            data: { defaultOffDay },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                availability: true,
                defaultOffDay: true,
                photoUrl: true
            }
        });

        logAudit('user.defaultOffDay.update', req.user.id, { targetId, defaultOffDay });

        res.json(user);
    } catch (error) {
        console.error('Error updating default off-day:', error);
        res.status(500).json({ error: 'Failed to update default off-day' });
    }
});

// Middleware to check if user is owner
const requireOwner = (req, res, next) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owners can perform this action' });
    }
    next();
};

// GET /api/users/barbers-list - Get all barbers with full details (for owner)
router.get('/barbers-list', authenticateToken, requireOwner, async (req, res) => {
    console.log('Use requesting /barbers-list:', req.user.username);
    try {
        // Get all users except owner (barbers are staff members)
        const barbers = await prisma.user.findMany({
            where: {
                role: {
                    not: 'owner' // Get all users except owner
                }
            },
            select: barberSelect,
            orderBy: { name: 'asc' }
        });
        console.log(`Found ${barbers.length} barbers for owner ${req.user.id}`);
        res.json(barbers);
    } catch (error) {
        console.error('Error fetching barbers:', error);
        res.status(500).json({ error: 'Failed to fetch barbers' });
    }
});

// POST /api/users/barbers - Create new barber (owner only)
router.post('/barbers', authenticateToken, requireOwner, upload.single('photo'), validate((req) => ({
    username: requiredString(getRequestBody(req).username, 'username', { min: 3, max: 80 }),
    password: requiredString(getRequestBody(req).password, 'password', { min: 6, max: 200 }),
    name: requiredString(getRequestBody(req).name, 'name', { min: 2, max: 100 }),
    status: optionalString(getRequestBody(req).status || 'active', 'status', { max: 20 })
})), async (req, res) => {
    try {
        const { username, password, name, status } = req.validated;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status', code: 'VALIDATION_ERROR' });
        }



        // Check if username already exists
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const barber = await prisma.user.create({
            data: {
                username: username.trim(),
                password: hashedPassword,
                name: name.trim(),
                role: 'staff',
                status: status || 'active',
            },
            select: barberSelect
        });

        let responseBarber = barber;
        if (req.file) {
            const photoUrl = await uploadBarberPhoto(req.file, barber.id);
            responseBarber = await prisma.user.update({
                where: { id: barber.id },
                data: { photoUrl },
                select: barberSelect
            });
        }

        logAudit('user.barber.create', req.user.id, { targetId: responseBarber.id, username: responseBarber.username, photoChanged: Boolean(req.file) });

        res.status(201).json(responseBarber);
    } catch (error) {
        console.error('Error creating barber:', error);
        // Handle Prisma errors
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({
            error: 'Failed to create barber'
        });
    }
});

// PUT /api/users/barbers/:id - Update barber (owner only)
router.put('/barbers/:id', authenticateToken, requireOwner, upload.single('photo'), validate((req) => ({
    targetId: requiredInt(req.params.id, 'id', { min: 1 }),
    username: optionalString(getRequestBody(req).username, 'username', { min: 3, max: 80 }),
    password: optionalString(getRequestBody(req).password, 'password', { min: 6, max: 200 }),
    name: optionalString(getRequestBody(req).name, 'name', { min: 2, max: 100 }),
    status: optionalString(getRequestBody(req).status, 'status', { max: 20 })
})), async (req, res) => {
    try {
        const { targetId, username, password, name, status } = req.validated;

        const updateData = {};

        // Validate and set username
        if (username) {
            updateData.username = username.trim();
        }

        // Validate and set name
        if (name) {
            updateData.name = name.trim();
        }



        // Validate and set status
        if (status) {
            const validStatuses = ['active', 'inactive'];
            if (validStatuses.includes(status)) {
                updateData.status = status;
                updateData.tokenVersion = { increment: 1 };
            } else {
                return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive"' });
            }
        }

        // If password is provided, hash it
        if (password && password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
            updateData.tokenVersion = { increment: 1 };
        }

        if (req.file) {
            updateData.photoUrl = await uploadBarberPhoto(req.file, targetId);
        }

        // Check if username already exists (if changing username)
        if (username) {
            const existingUser = await prisma.user.findUnique({
                where: { username: username.trim() }
            });

            if (existingUser && existingUser.id !== targetId) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        const barber = await prisma.user.update({
            where: { id: targetId },
            data: updateData,
            select: barberSelect
        });

        logAudit('user.barber.update', req.user.id, {
            targetId,
            username: barber.username,
            passwordChanged: Boolean(password),
            statusChanged: Boolean(status),
            photoChanged: Boolean(req.file)
        });

        res.json(barber);
    } catch (error) {
        console.error('Error updating barber:', error);
        // Handle Prisma errors
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Barber not found' });
        }
        res.status(500).json({
            error: 'Failed to update barber'
        });
    }
});

// DELETE /api/users/barbers/:id - Delete barber (owner only)
router.delete('/barbers/:id', authenticateToken, requireOwner, validate((req) => ({
    targetId: requiredInt(req.params.id, 'id', { min: 1 })
})), async (req, res) => {
    try {
        const { targetId } = req.validated;

        // Check if barber has transactions
        const transactionCount = await prisma.transaction.count({
            where: { barberId: targetId }
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete barber with existing transactions. Consider deactivating instead.'
            });
        }

        await prisma.user.delete({
            where: { id: targetId }
        });

        logAudit('user.barber.delete', req.user.id, { targetId });

        res.json({ message: 'Barber deleted successfully' });
    } catch (error) {
        console.error('Error deleting barber:', error);
        res.status(500).json({ error: 'Failed to delete barber' });
    }
});

module.exports = router;
