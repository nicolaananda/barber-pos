const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const servicesRoutes = require('./routes/services');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const webhookRoutes = require('./routes/webhook');
const expensesRoutes = require('./routes/expenses');
const capitalRoutes = require('./routes/capital');
const payrollRoutes = require('./routes/payroll');
const shiftsRoutes = require('./routes/shifts');
const transactionsRoutes = require('./routes/transactions');
const seedRoutes = require('./routes/seed');
const bookingsRoutes = require('./routes/bookings');
const analyticsRoutes = require('./routes/analytics');
const { sendError } = require('./lib/apiError');

// Rate limiting middleware
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// 🔒 SECURITY: Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    crossOriginEmbedderPolicy: false, // Allow external resources
}));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path !== '/health') {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// Middleware
const corsOrigins = [
    'https://staycoolhairlab.id',
    'https://www.staycoolhairlab.id',
    'https://pos.staycoolhairlab.id',
];
// Only allow localhost origins in development
if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:7781');
}
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Apply rate limiting to auth routes (stricter)
app.use('/api/auth', authLimiter);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/capital', capitalRoutes);
// Seed route — disabled in production, CLI only recommended
// app.use('/api/seed', seedRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/offdays', require('./routes/offdays'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/analytics', analyticsRoutes);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found', code: 'NOT_FOUND' });
});

// Health check (with database connectivity verification)
app.get('/health', async (req, res) => {
    try {
        const prismaHealth = require('./lib/prisma');
        await prismaHealth.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
    } catch (error) {
        res.status(503).json({ status: 'error', database: 'disconnected', timestamp: new Date() });
    }
});

// Serve static files from the frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    sendError(res, err);
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start reminder cron service
    try {
        const { startReminderCron } = require('./lib/reminderService');
        startReminderCron();
    } catch (err) {
        console.error('Failed to start reminder service:', err);
    }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
        console.log('HTTP server closed.');

        try {
            // Disconnect Prisma
            const prisma = require('./lib/prisma');
            await prisma.$disconnect();
            console.log('Database connections closed.');
        } catch (error) {
            console.error('Error closing database connections:', error);
        }

        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
