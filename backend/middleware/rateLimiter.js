const rateLimit = require('express-rate-limit');

// 🔒 Trust proxy configuration for rate limiting behind reverse proxy
const trustProxyConfig = {
    validate: {
        trustProxy: false, // Disable validation - we explicitly trust our proxy
        xForwardedForHeader: false, // We handle this manually
    }
};

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased to 5000 to handle multiple devices on shared IP
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...trustProxyConfig,
});

// Strict limiter for sensitive endpoints
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased to 100 for safety
    message: 'Too many attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...trustProxyConfig,
});

// Very strict for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased to 100 to prevent staff lockouts
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful logins
    ...trustProxyConfig,
});

module.exports = {
    apiLimiter,
    strictLimiter,
    authLimiter
};
