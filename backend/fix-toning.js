const prisma = require('./lib/prisma');

async function fixToning() {
    try {
        console.log('🔄 Merging Toning into Bagus Haircut transaction...');

        // 1. Cari transaksi Toning yang terpisah (tanggal 3 Jan)
        const toningTransaction = await prisma.transaction.findFirst({
            where: {
                date: {
                    gte: new Date('2026-01-03T00:00:00.000Z'),
                    lte: new Date('2026-01-03T23:59:59.999Z')
                },
                items: {
                    path: '$[0].name',
                    string_contains: 'Toning'
                }
            }
        });

        if (!toningTransaction) {
            console.log('⚠️  Toning transaction not found (maybe already merged?)');
        } else {
            console.log(`✅ Found Toning transaction: ${toningTransaction.invoiceCode}`);
        }

        // 2. Cari transaksi Haircut Bagus di tanggal yang sama untuk digabung
        const bagusTransaction = await prisma.transaction.findFirst({
            where: {
                barberId: 3, // Bagus
                date: {
                    gte: new Date('2026-01-03T00:00:00.000Z'),
                    lte: new Date('2026-01-03T23:59:59.999Z')
                },
                id: { not: toningTransaction?.id } // Jangan pilih diri sendiri
            }
        });

        if (!bagusTransaction) {
            console.error('❌ Could not find a Bagus Haircut transaction on Jan 3rd to merge into!');
            return;
        }

        console.log(`✅ Found target transaction: ${bagusTransaction.invoiceCode} (Current total: ${bagusTransaction.totalAmount})`);

        // 3. Update transaksi Bagus (Merge)
        const currentItems = Array.isArray(bagusTransaction.items) ? bagusTransaction.items : JSON.parse(bagusTransaction.items);

        const newItems = [
            ...currentItems,
            {
                name: 'Toning [Semir Hitam]',
                price: 40000,
                qty: 1
            }
        ];

        const newTotal = bagusTransaction.totalAmount + 40000;

        await prisma.transaction.update({
            where: { id: bagusTransaction.id },
            data: {
                items: newItems,
                totalAmount: newTotal
            }
        });

        console.log(`✅ Merged Toning into ${bagusTransaction.invoiceCode}. New Total: ${newTotal}`);

        // 4. Hapus transaksi Toning yang lama (kalau ada)
        if (toningTransaction) {
            await prisma.transaction.delete({
                where: { id: toningTransaction.id }
            });
            console.log(`🗑️  Deleted separate Toning transaction: ${toningTransaction.invoiceCode}`);
        }

        console.log('\n🎉 Fix Complete!');
        console.log('Total transactions should now be 102.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixToning();
