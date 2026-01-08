const prisma = require('./lib/prisma');

async function fixFridayHours() {
    try {
        console.log('🔄 Checking Friday (Jan 2nd) transactions for timing...');

        // 1. Get all transactions for Friday Jan 2nd, 2026
        // 2026-01-02 is a Friday
        const startOfDay = new Date('2026-01-02T00:00:00.000Z');
        const endOfDay = new Date('2026-01-02T23:59:59.999Z');

        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        console.log(`found ${transactions.length} transactions on Friday Jan 2nd.`);

        let updatedCount = 0;

        for (const t of transactions) {
            const date = new Date(t.date);
            // Get hour in local time (assuming server is GMT+7 or handled correctly)
            // But usually Node dates are UTC.
            // 1 PM WIB (GMT+7) = 06:00 UTC.
            // So if hour (UTC) < 6, it is before 1 PM WIB.

            // Let's work with hours directly assuming input was generated in local time logic but saved as UTC
            // My generator used: transactionDate.setHours(hour, minute, 0, 0); then toISOString()
            // So if I set hour=10 (10 AM), it saved as 10 AM local -> UTC depends on Env?
            // Actually, `new Date(date)` uses local system time unless specific UTC string.
            // My generator ran locally on user machine (likely GMT+7).

            // Let's simply check if the UTCHours are early.
            // 13:00 WIB = 06:00 UTC.
            // So any transaction before 06:00 UTC needs to be moved.

            const utcHour = date.getUTCHours();

            // If time is before 06:00 UTC (13:00 WIB)
            if (utcHour < 6) {
                // Shift to random time between 06:00 UTC (13:00 WIB) and 14:00 UTC (21:00 WIB)
                const newHourUTC = 6 + Math.floor(Math.random() * 8); // 6 to 13 UTC (13 to 20 WIB)
                const newMinute = Math.floor(Math.random() * 60);

                date.setUTCHours(newHourUTC, newMinute);

                await prisma.transaction.update({
                    where: { id: t.id },
                    data: { date: date }
                });

                updatedCount++;
                process.stdout.write('.');
            }
        }

        console.log(`\n✅ Fixed ${updatedCount} transactions to be after 1 PM (Friday rule).`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixFridayHours();
