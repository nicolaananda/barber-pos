/**
 * Simple in-memory token blacklist for logout revocation.
 * Tokens are stored with their expiry time and cleaned up periodically.
 * 
 * NOTE: This is in-memory only. If the server restarts, the blacklist is cleared.
 * For a multi-instance deployment, use Redis instead.
 */

const blacklist = new Map(); // token -> expiresAt (timestamp)

// Clean up expired tokens every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of blacklist) {
        if (expiresAt < now) {
            blacklist.delete(token);
        }
    }
}, 10 * 60 * 1000);

/**
 * Add a token to the blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresInMs - Time until token naturally expires (default 24h)
 */
function addToBlacklist(token, expiresInMs = 24 * 60 * 60 * 1000) {
    blacklist.set(token, Date.now() + expiresInMs);
}

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean}
 */
function isBlacklisted(token) {
    if (!blacklist.has(token)) return false;
    // Also check if the blacklist entry has expired
    if (blacklist.get(token) < Date.now()) {
        blacklist.delete(token);
        return false;
    }
    return true;
}

module.exports = { addToBlacklist, isBlacklisted };
