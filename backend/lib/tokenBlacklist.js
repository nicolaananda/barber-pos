const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getTokenExpiry(token) {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded.exp === 'number') {
        return new Date(decoded.exp * 1000);
    }

    return new Date(Date.now() + 4 * 60 * 60 * 1000);
}

async function addToBlacklist(token, userId) {
    await prisma.revokedToken.upsert({
        where: { tokenHash: hashToken(token) },
        create: {
            tokenHash: hashToken(token),
            userId: userId || null,
            expiresAt: getTokenExpiry(token)
        },
        update: {
            userId: userId || null,
            expiresAt: getTokenExpiry(token)
        }
    });
}

async function isBlacklisted(token) {
    const tokenHash = hashToken(token);
    const revoked = await prisma.revokedToken.findUnique({
        where: { tokenHash },
        select: { id: true, expiresAt: true }
    });

    if (!revoked) return false;

    if (revoked.expiresAt < new Date()) {
        await prisma.revokedToken.delete({ where: { id: revoked.id } }).catch(() => {});
        return false;
    }

    return true;
}

async function cleanupExpiredTokens() {
    await prisma.revokedToken.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    });
}

module.exports = { addToBlacklist, cleanupExpiredTokens, isBlacklisted };
