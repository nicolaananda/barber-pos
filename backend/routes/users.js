const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/users/barbers - Get all barbers (PUBLIC - for Status page)
router.get('/barbers', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                availability: true
            }
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
                availability: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PATCH /api/users/:id/availability
router.patch('/:id/availability', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log('Updating availability for user:', id, 'to:', status);

        if (!status || (status !== 'idle' && status !== 'busy')) {
            return res.status(400).json({ error: 'Invalid status. Must be "idle" or "busy"' });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { availability: status }
        });

        console.log('User updated successfully:', user.id);
        res.json(user);
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability', details: error.message });
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
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                availability: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { name: 'asc' }
        });
        console.log(`Found ${barbers.length} barbers for owner ${req.user.id}`);
        res.json(barbers);
    } catch (error) {
        console.error('Error fetching barbers:', error);
        res.status(500).json({ error: 'Failed to fetch barbers', details: error.message });
    }
});

// POST /api/users/barbers - Create new barber (owner only)
router.post('/barbers', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { username, password, name, status } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Username, password, and name are required' });
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
                status: finalStatus,
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                availability: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        res.status(201).json(barber);
    } catch (error) {
        console.error('Error creating barber:', error);
        // Handle Prisma errors
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({
            error: 'Failed to create barber',
            details: error.message || 'Unknown error occurred'
        });
    }
});

// PUT /api/users/barbers/:id - Update barber (owner only)
router.put('/barbers/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, status } = req.body;

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
            } else {
                return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive"' });
            }
        }

        // If password is provided, hash it
        if (password && password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Check if username already exists (if changing username)
        if (username) {
            const existingUser = await prisma.user.findUnique({
                where: { username: username.trim() }
            });

            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        const barber = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                availability: true,
                createdAt: true,
                updatedAt: true,
            }
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
            error: 'Failed to update barber',
            details: error.message || 'Unknown error occurred'
        });
    }
});

// DELETE /api/users/barbers/:id - Delete barber (owner only)
router.delete('/barbers/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if barber has transactions
        const transactionCount = await prisma.transaction.count({
            where: { barberId: parseInt(id) }
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete barber with existing transactions. Consider deactivating instead.'
            });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Barber deleted successfully' });
    } catch (error) {
        console.error('Error deleting barber:', error);
        res.status(500).json({ error: 'Failed to delete barber', details: error.message });
    }
});

module.exports = router;
