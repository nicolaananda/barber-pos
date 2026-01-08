const prisma = require('./lib/prisma');

async function fixCustomerNames() {
    try {
        console.log('🔄 Updating customer names to NULL (Walk-in)...');

        const result = await prisma.transaction.updateMany({
            where: {
                customerName: '-', // Target yang tadi kita isi '-'
                date: {
                    gte: new Date('2026-01-01'),
                    lte: new Date('2026-01-08')
                }
            },
            data: {
                customerName: null // Set to NULL
            }
        });

        console.log(`✅ Updated ${result.count} transactions.`);
        console.log('Customer names are now NULL (will show as Walk-in)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixCustomerNames();
