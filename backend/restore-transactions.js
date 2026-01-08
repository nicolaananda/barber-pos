const fs = require('fs');
const path = require('path');
const prisma = require('./lib/prisma');

/**
 * Restore Transactions from Invoice Data
 * 
 * This script helps restore deleted transactions from invoice records.
 * 
 * Usage:
 * 1. Create a file called 'invoices.json' with your invoice data
 * 2. Run: node restore-transactions.js
 * 
 * Invoice JSON format:
 * [
 *   {
 *     "invoiceCode": "INV-20260108-001",
 *     "barberId": 3,
 *     "customerName": "John Doe",
 *     "customerPhone": "081234567890",
 *     "items": [
 *       {"name": "Haircut", "price": 40000, "qty": 1}
 *     ],
 *     "totalAmount": 40000,
 *     "paymentMethod": "cash",
 *     "date": "2026-01-08T10:00:00.000Z"
 *   }
 * ]
 */

async function restoreTransactions() {
    try {
        console.log('🔄 Starting Transaction Restoration...\n');

        // Read invoice data
        const invoiceFile = path.join(__dirname, 'invoices.json');

        if (!fs.existsSync(invoiceFile)) {
            console.log('❌ File invoices.json not found!');
            console.log('📝 Please create invoices.json with your invoice data.');
            console.log('\nExample format:');
            console.log(JSON.stringify([
                {
                    invoiceCode: "INV-20260108-001",
                    barberId: 3,
                    customerName: "John Doe",
                    customerPhone: "081234567890",
                    items: [
                        { name: "Haircut", price: 40000, qty: 1 }
                    ],
                    totalAmount: 40000,
                    paymentMethod: "cash",
                    date: "2026-01-08T10:00:00.000Z"
                }
            ], null, 2));
            process.exit(1);
        }

        const invoices = JSON.parse(fs.readFileSync(invoiceFile, 'utf8'));
        console.log(`📊 Found ${invoices.length} invoices to restore\n`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const invoice of invoices) {
            try {
                // Check if invoice already exists
                const existing = await prisma.transaction.findUnique({
                    where: { invoiceCode: invoice.invoiceCode }
                });

                if (existing) {
                    console.log(`⏭️  Skipped: ${invoice.invoiceCode} (already exists)`);
                    skipCount++;
                    continue;
                }

                // Create transaction
                await prisma.transaction.create({
                    data: {
                        invoiceCode: invoice.invoiceCode,
                        barberId: invoice.barberId,
                        customerName: invoice.customerName,
                        customerPhone: invoice.customerPhone,
                        items: invoice.items,
                        totalAmount: invoice.totalAmount,
                        paymentMethod: invoice.paymentMethod || 'cash',
                        date: new Date(invoice.date)
                    }
                });

                console.log(`✅ Restored: ${invoice.invoiceCode} - Rp ${invoice.totalAmount.toLocaleString('id-ID')}`);
                successCount++;

            } catch (error) {
                console.log(`❌ Error: ${invoice.invoiceCode} - ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n📈 Restoration Summary:');
        console.log(`   ✅ Successfully restored: ${successCount}`);
        console.log(`   ⏭️  Skipped (duplicates): ${skipCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total processed: ${invoices.length}`);

        // Show current transaction count
        const totalTransactions = await prisma.transaction.count();
        console.log(`\n💾 Current total transactions in database: ${totalTransactions}`);

    } catch (error) {
        console.error('❌ Restoration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

restoreTransactions();
