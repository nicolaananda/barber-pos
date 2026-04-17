const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const { authLimiter, pinLimiter } = require('../middleware/rateLimiter');
const { addToBlacklist } = require('../lib/tokenBlacklist');

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
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
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
            { expiresIn: '24h' }
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

// POST /api/auth/verify-pin - Verify edit PIN server-side
router.post('/verify-pin', pinLimiter, authenticateToken, async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ error: 'PIN is required' });
        }

        // Only owners can verify edit PIN
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Only owners can authorize edits' });
        }

        // 🔒 SECURITY: No fallback for EDIT_PIN - fail fast if not configured
        if (!process.env.EDIT_PIN) {
            console.error('❌ CRITICAL: EDIT_PIN not configured in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const EDIT_PIN = process.env.EDIT_PIN;

        if (pin !== EDIT_PIN) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('PIN verification error:', error);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

// POST /api/auth/logout - Revoke current token
router.post('/logout', authenticateToken, (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            addToBlacklist(token);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

module.exports = router;
