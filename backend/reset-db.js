const prisma = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
    try {
        console.log('🚀 Starting Database Reset & Seed...');

        // 1. Clear all existing data
        console.log('🗑️  Clearing all tables...');
        // Delete in order to avoid foreign key constraints violations if any (though onDelete: Cascade might handle it, explicit is safer)
        await prisma.transaction.deleteMany({});
        await prisma.cashShift.deleteMany({});
        await prisma.expense.deleteMany({});
        await prisma.booking.deleteMany({});
        await prisma.payroll.deleteMany({});
        await prisma.customer.deleteMany({});
        // Delete users and services last
        await prisma.user.deleteMany({});
        await prisma.service.deleteMany({});

        console.log('✅ Tables cleared.');

        // 2. Create Users
        console.log('👤 Creating Users...');
        const hashedPassword = await bcrypt.hash('123456', 10);

        const users = await prisma.user.createMany({
            data: [
                {
                    name: 'Bagus',
                    username: 'bagus', // Owner
                    password: hashedPassword,
                    role: 'owner',
                    status: 'active',
                    availability: 'available'
                },
                {
                    name: 'Diva',
                    username: 'diva', // Staff
                    password: hashedPassword,
                    role: 'staff',
                    status: 'active',
                    availability: 'available'
                }
            ]
        });
        console.log('✅ Users created: Bagus (Owner) and Diva (Staff).');

        // 3. Create Services with Commission Rules
        console.log('✂️  Creating Services...');
        /*
            Requirements:
            1. Cukur: 50% for all barbers.
            2. Others (e.g. Coloring, Smoothing): Flat 40k or choice.
               I will implement a few examples.
        */
        const servicesData = [
            {
                name: 'Haircut',
                price: 40000,
                commissionType: 'percentage',
                commissionValue: 50 // 50%
            },
            {
                name: 'Haircut by Head Barber',
                price: 50000,
                commissionType: 'percentage',
                commissionValue: 50 // 50%
            },
            {
                name: 'Beard Trim',
                price: 15000,
                commissionType: 'flat',
                commissionValue: 7500 // 50% flat
            },
            {
                name: 'Beard Shave',
                price: 25000,
                commissionType: 'flat',
                commissionValue: 12500 // 50% flat
            },
            {
                name: 'Toning (Semir Hitam)',
                price: 40000,
                commissionType: 'flat',
                commissionValue: 40000 // 40k flat
            },
            {
                name: 'Fashion Colour',
                price: 200000, // start from 200k
                commissionType: 'flat',
                commissionValue: 40000 // 40k flat
            },
            {
                name: 'Perm',
                price: 200000, // start from 200k
                commissionType: 'flat',
                commissionValue: 40000 // 40k flat
            },
            {
                name: 'Home Service',
                price: 150000, // by appointment 150k
                commissionType: 'percentage',
                commissionValue: 50 // 50%
            }
        ];

        await prisma.service.createMany({
            data: servicesData
        });
        console.log(`✅ ${servicesData.length} Services created with commission rules.`);

        // 4. Create Dummy Customers (Optional, good for testing)
        console.log('👥 Creating Dummy Customers...');
        await prisma.customer.createMany({
            data: [
                { name: 'Customer 1', phone: '081234567890' },
                { name: 'Customer 2', phone: '081234567891' },
                { name: 'Customer 3', phone: '081234567892' }
            ]
        });
        console.log('✅ Dummy customers created.');

        console.log('✨ Database reset and seed completed successfully!');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
