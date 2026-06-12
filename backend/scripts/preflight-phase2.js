const prisma = require('../lib/prisma');

async function main() {
    const duplicateActiveSlots = await prisma.$queryRaw`
        SELECT
            barberId,
            DATE(bookingDate) AS slotDate,
            timeSlot,
            COUNT(*) AS duplicateCount
        FROM Booking
        WHERE status IN ('pending', 'confirmed')
        GROUP BY barberId, DATE(bookingDate), timeSlot
        HAVING COUNT(*) > 1
        LIMIT 20
    `;

    if (duplicateActiveSlots.length > 0) {
        console.error('❌ Duplicate active booking slots found. Resolve these before running Phase 2 migration:');
        console.error(JSON.stringify(duplicateActiveSlots, (_key, value) => (
            typeof value === 'bigint' ? value.toString() : value
        ), 2));
        process.exit(1);
    }

    console.log('✅ Phase 2 preflight passed: no duplicate active booking slots.');
}

main()
    .catch((error) => {
        console.error('❌ Phase 2 preflight failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
