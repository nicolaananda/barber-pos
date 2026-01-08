const prisma = require('./lib/prisma');
const fs = require('fs');
const path = require('path');

async function resetAndRestore() {
    try {
        console.log('🔄 Starting Fresh Restore Process...');

        // 1. Delete transactions from Jan 1 - Jan 8 2026
        console.log('🗑️  Cleaning up existing transactions (Jan 1-8)...');
        const deleteResult = await prisma.transaction.deleteMany({
            where: {
                date: {
                    gte: new Date('2026-01-01T00:00:00.000Z'),
                    lte: new Date('2026-01-08T23:59:59.999Z')
                }
            }
        });
        console.log(`✅ Deleted ${deleteResult.count} existing transactions`);

        // 2. Load the 103 fix data
        const invoiceFile = path.join(__dirname, 'invoices.json');
        const invoices = JSON.parse(fs.readFileSync(invoiceFile, 'utf8'));
        console.log(`📂 Loaded ${invoices.length} transactions to restore`);

        // 3. Insert new data
        let successCount = 0;
        let errorCount = 0;

        for (const invoice of invoices) {
            try {
                await prisma.transaction.create({
                    data: {
                        invoiceCode: invoice.invoiceCode,
                        date: new Date(invoice.date),
                        customerName: invoice.customerName,
                        customerPhone: invoice.customerPhone,
                        barberId: invoice.barberId,
                        items: invoice.items,
                        totalAmount: invoice.totalAmount,
                        paymentMethod: invoice.paymentMethod
                    }
                });
                successCount++;
                process.stdout.write('.');
            } catch (error) {
                console.error(`\n❌ Error restoring ${invoice.invoiceCode}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('📊 FINAL RESTORATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Successfully Restored: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`📈 TOTAL TARGET: 103`);
        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAndRestore();
