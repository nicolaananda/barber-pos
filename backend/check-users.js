const prisma = require('./lib/prisma');

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log('\n=== CHECK USERS ===');
        console.log(`Total users found: ${users.length}\n`);

        if (users.length === 0) {
            console.log('❌ No users found in database.');
            console.log('💡 Run seed script: curl http://localhost:3001/api/seed\n');
        } else {
            console.log('✅ Users in database:');
            users.forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.name} (${user.username})`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Status: ${user.status}`);
                console.log(`   Created: ${user.createdAt.toISOString()}`);
            });
            console.log('');
        }

        // Check for owner
        const owner = users.find(u => u.role === 'owner');
        if (!owner) {
            console.log('⚠️  No owner found!');
        } else {
            console.log(`✅ Owner found: ${owner.name} (${owner.username})`);
        }

        // Check for staff
        const staff = users.filter(u => u.role === 'staff');
        console.log(`📊 Staff count: ${staff.length}`);

    } catch (error) {
        console.error('❌ Error checking users:', error.message);
        if (error.code === 'P1001') {
            console.error('💡 Database connection failed. Check DATABASE_URL in .env');
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();

