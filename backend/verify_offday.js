// const fetch = require('node-fetch'); // Unused

const BASE_URL = 'http://localhost:3001/api';
// We need a valid token. Since we can't easily login via script without credentials, 
// we might need to bypass auth or use a known test user if available.
// However, the route protects with authenticateToken.
// I will just check if the model works by running a prisma script instead, 
// avoiding the auth middleware complication for this quick test.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying OffDay Logic ---');

    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No users found. Seeding might be needed.');
        return;
    }
    console.log(`Using user: ${user.username} (ID: ${user.id})`);

    const date = new Date('2030-01-01'); // Future date
    console.log(`Creating off-day for ${date.toISOString()}...`);

    // Create
    try {
        const created = await prisma.offDay.create({
            data: {
                userId: user.id,
                date: date,
                reason: 'Test Off Day'
            }
        });
        console.log('Created:', created);

        // Read
        const fetched = await prisma.offDay.findFirst({
            where: { userId: user.id, date: date }
        });
        console.log('Fetched:', fetched ? 'Found' : 'Not Found');

        // Delete
        if (fetched) {
            await prisma.offDay.delete({
                where: { id: fetched.id }
            });
            console.log('Deleted successfully.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
