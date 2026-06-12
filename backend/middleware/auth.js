const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { isBlacklisted } = require('../lib/tokenBlacklist');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    // 🔒 SECURITY: No fallback for JWT_SECRET - fail fast if not configured
    if (!process.env.JWT_SECRET) {
        console.error('❌ CRITICAL: JWT_SECRET not configured in environment');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 🔒 SECURITY: Check if token has been revoked (logout)
    try {
        if (await isBlacklisted(token)) {
            return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 🔒 SECURITY: Re-verify role from DB to handle role changes mid-session
        const dbUser = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, name: true, role: true, status: true, tokenVersion: true }
        });

        if (!dbUser || dbUser.status !== 'active') {
            return res.status(403).json({ error: 'Account deactivated or not found', code: 'ACCOUNT_INACTIVE' });
        }

        if (decoded.tokenVersion !== dbUser.tokenVersion) {
            return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
        }

        // Use DB role (authoritative) instead of JWT role (may be stale)
        req.user = {
            id: dbUser.id,
            username: dbUser.username,
            name: dbUser.name,
            role: dbUser.role,
            tokenVersion: dbUser.tokenVersion,
        };
        next();
    } catch (authError) {
        if (authError.name === 'JsonWebTokenError' || authError.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
        }

        console.error('Auth DB lookup error:', authError);
        return res.status(503).json({ error: 'Authentication service temporarily unavailable', code: 'AUTH_DB_UNAVAILABLE' });
    }
};

module.exports = authenticateToken;
