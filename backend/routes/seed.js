const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// GET /api/seed
router.get('/', async (req, res) => {
    try {
        // Clear existing data
        await prisma.transaction.deleteMany({});
        await prisma.expense.deleteMany({});
        await prisma.cashShift.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.service.deleteMany({});
        await prisma.customer.deleteMany({});

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
