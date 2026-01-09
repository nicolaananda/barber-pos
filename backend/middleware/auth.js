const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    // 🔒 SECURITY: No fallback for JWT_SECRET - fail fast if not configured
    if (!process.env.JWT_SECRET) {
        console.error('❌ CRITICAL: JWT_SECRET not configured in environment');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
