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

module.exports = router;
