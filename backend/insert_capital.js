const prisma = require('./lib/prisma');

async function main() {
    try {
        const capital = await prisma.capital.create({
            data: {
                description: 'Suntikan dana dari CEO',
                amount: 6665000,
                type: 'injection',
                date: new Date(), // Now
            },
        });
        console.log('Capital injection added:', capital);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
