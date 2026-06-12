const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { isBlacklisted } = require('../lib/tokenBlacklist');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    // 🔒 SECURITY: No fallback for JWT_SECRET - fail fast if not configured
    if (!process.env.JWT_SECRET) {
        console.error('❌ CRITICAL: JWT_SECRET not configured in environment');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 🔒 SECURITY: Check if token has been revoked (logout)
    if (isBlacklisted(token)) {
        return res.status(401).json({ error: 'Token has been revoked' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);

        try {
            // 🔒 SECURITY: Re-verify role from DB to handle role changes mid-session
            const dbUser = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, username: true, name: true, role: true, status: true }
            });

            if (!dbUser || dbUser.status !== 'active') {
                return res.status(403).json({ error: 'Account deactivated or not found' });
            }

            // Use DB role (authoritative) instead of JWT role (may be stale)
            req.user = {
                id: dbUser.id,
                username: dbUser.username,
                name: dbUser.name,
                role: dbUser.role,
            };
            next();
        } catch (dbError) {
            console.error('Auth DB lookup error:', dbError);
            return res.status(503).json({ error: 'Authentication service temporarily unavailable', code: 'AUTH_DB_UNAVAILABLE' });
        }
    });
};

module.exports = authenticateToken;
