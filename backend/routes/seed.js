const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// GET /api/seed
router.get('/', async (req, res) => {
    try {
        // 🔒 SECURITY: IP Whitelist (optional - uncomment to enable)
        // const allowedIPs = ['127.0.0.1', '::1', 'YOUR_IP_HERE'];
        // const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        // if (!allowedIPs.includes(clientIP)) {
        //     console.warn(`⚠️ Unauthorized seed attempt from IP: ${clientIP}`);
        //     return res.status(403).json({ error: 'Access denied - IP not whitelisted' });
        // }

        // ⚠️ SAFETY CHECK: Prevent accidental data loss in production
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Seed endpoint is disabled in production to prevent data loss',
                message: 'Use the reset-db.js script manually if you really need to reset the database'
            });
        }

        // Clear existing data in correct order (child tables first to avoid foreign key violations)
        console.log('Clearing database tables...');

        // 1. Delete child tables that reference User
        await prisma.offDay.deleteMany({});
        await prisma.booking.deleteMany({});
        await prisma.transaction.deleteMany({});
        await prisma.payroll.deleteMany({});

        // 2. Delete CashShift (references User via openedBy/closedBy)
        await prisma.cashShift.deleteMany({});

        // 3. Delete independent tables
        await prisma.expense.deleteMany({});
        await prisma.capital.deleteMany({});
        await prisma.customer.deleteMany({});

        // 4. Finally delete parent tables
        await prisma.user.deleteMany({});
        await prisma.service.deleteMany({});

        const hashedPassword = await bcrypt.hash('123456', 10);

        // Create Users
        const owner = await prisma.user.create({
            data: {
                name: 'Staycool Owner',
                username: 'owner',
                password: hashedPassword,
                role: 'owner',
            },
        });

        const staff1 = await prisma.user.create({
            data: {
                name: 'Barber Andi',
                username: 'andi',
                password: hashedPassword,
                role: 'staff',
            },
        });

        const staff2 = await prisma.user.create({
            data: {
                name: 'Barber Budi',
                username: 'budi',
                password: hashedPassword,
                role: 'staff',
            },
        });

        // Create Services
        await prisma.service.createMany({
            data: [
                {
                    name: 'Regular Cut',
                    price: 40000,
                    commissionType: 'percentage',
                    commissionValue: 50
                },
                {
                    name: 'Shaving',
                    price: 20000,
                    commissionType: 'flat',
                    commissionValue: 10000
                },
                {
                    name: 'Coloring',
                    price: 100000,
                    commissionType: 'flat',
                    commissionValue: 40000
                },
            ],
        });

        res.json({
            message: 'Database seeded successfully (PostgreSQL)',
            users: {
                owner: owner.username,
                staff1: staff1.username,
                staff2: staff2.username,
            },
        });
    } catch (error) {
        console.error('Seed Error:', error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

module.exports = router;
