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
    max: 15, // Strict limit for auth attempts
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful logins
    ...trustProxyConfig,
});

// Very strict for PIN verification (brute-force protection)
const pinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 PIN attempts per 15 minutes
    message: 'Too many PIN attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: false, // Count ALL attempts
    ...trustProxyConfig,
});

const bookingCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many booking attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...trustProxyConfig,
});

const bookingStatusLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: 'Too many status checks, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...trustProxyConfig,
});

const publicReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...trustProxyConfig,
});

module.exports = {
    apiLimiter,
    strictLimiter,
    authLimiter,
    pinLimiter,
    bookingCreateLimiter,
    bookingStatusLimiter,
    publicReadLimiter
};
