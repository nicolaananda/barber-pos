const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const servicesRoutes = require('./routes/services');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const expensesRoutes = require('./routes/expenses');
const payrollRoutes = require('./routes/payroll');
const shiftsRoutes = require('./routes/shifts');
const transactionsRoutes = require('./routes/transactions');
const seedRoutes = require('./routes/seed');
const bookingsRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/bookings', bookingsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static files from the frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
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
