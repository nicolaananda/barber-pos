const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login - with rate limiting
router.post('/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Create JWT
        // 🔒 SECURITY: No fallback for JWT_SECRET - fail fast if not configured
        if (!process.env.JWT_SECRET) {
            console.error('❌ CRITICAL: JWT_SECRET not configured in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // 7 days for better UX
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                availability: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

module.exports = router;
