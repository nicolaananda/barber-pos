const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const { authLimiter, pinLimiter } = require('../middleware/rateLimiter');
const { addToBlacklist } = require('../lib/tokenBlacklist');
const { validate, requiredString } = require('../lib/validators');
const { logAudit } = require('../lib/auditLogger');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '4h';

// POST /api/auth/login - with rate limiting
router.post('/login', authLimiter, validate((req) => ({
    username: requiredString(req.body.username, 'username', { max: 80 }),
    password: requiredString(req.body.password, 'password', { max: 200 })
})), async (req, res) => {
    const { username, password } = req.validated;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            logAudit('auth.login.failed', null, { username, reason: 'user_not_found' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            logAudit('auth.login.failed', user.id, { username, reason: 'invalid_password' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            logAudit('auth.login.failed', user.id, { username, reason: 'inactive_account' });
            return res.status(403).json({ error: 'Account is not active' });
        }

        // Create JWT
        // 🔒 SECURITY: No fallback for JWT_SECRET - fail fast if not configured
        if (!process.env.JWT_SECRET) {
            console.error('❌ CRITICAL: JWT_SECRET not configured in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name, tokenVersion: user.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        logAudit('auth.login.success', user.id, { username, expiresIn: JWT_EXPIRES_IN });

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
router.post('/verify-pin', pinLimiter, authenticateToken, validate((req) => ({
    pin: requiredString(req.body.pin, 'PIN', { max: 20 })
})), async (req, res) => {
    try {
        const { pin } = req.validated;

        // Only owners can verify edit PIN
        if (req.user.role !== 'owner') {
            logAudit('auth.pin.failed', req.user.id, { reason: 'not_owner' });
            return res.status(403).json({ error: 'Only owners can authorize edits' });
        }

        // 🔒 SECURITY: No fallback for EDIT_PIN - fail fast if not configured
        if (!process.env.EDIT_PIN) {
            console.error('❌ CRITICAL: EDIT_PIN not configured in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const EDIT_PIN = process.env.EDIT_PIN;

        if (pin !== EDIT_PIN) {
            logAudit('auth.pin.failed', req.user.id, { reason: 'invalid_pin' });
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        logAudit('auth.pin.success', req.user.id);

        res.json({ success: true });
    } catch (error) {
        console.error('PIN verification error:', error);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

// POST /api/auth/logout - Revoke current token
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            await addToBlacklist(token, req.user.id);
        }
        logAudit('auth.logout', req.user.id);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

module.exports = router;
