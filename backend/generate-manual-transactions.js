const fs = require('fs');
const path = require('path');

/**
 * Generate missing transactions from manual book records
 */

// Data from manual book
const manualData = {
    '2026-01-02': {
        bagus: 11,
        diva: 13
    },
    '2026-01-03': {
        bagus: 10,
        diva: 6,
        special: [
            { barber: 'bagus', service: 'Toning [Semir Hitam]', price: 40000 }
        ]
    },
    '2026-01-04': {
        bagus: 6,
        diva: 5
    },
    '2026-01-05': {
        bagus: 9,
        diva: 10
    },
    '2026-01-06': {
        bagus: 6,
        diva: 6
    },
    '2026-01-07': {
        bagus: 5,
        diva: 5
    },
    '2026-01-08': {
        bagus: 5,
        diva: 5
    }
};

// Load existing invoices
const existingInvoices = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'invoices.json'), 'utf8')
);

const existingCodes = new Set(existingInvoices.map(inv => inv.invoiceCode));

// Generate missing transactions
const missingTransactions = [];
let sequenceCounter = {};

// Helper to generate invoice code
function generateInvoiceCode(date, sequence) {
    const dateStr = date.replace(/-/g, '').substring(2); // YYMMDD
    const seqStr = sequence.toString().padStart(3, '0');
    return `INV-${dateStr}-${seqStr}`;
}

// Helper to get next available sequence for a date
function getNextSequence(date) {
    const dateKey = date.replace(/-/g, '').substring(2);
    if (!sequenceCounter[dateKey]) {
        sequenceCounter[dateKey] = 1;
    }

    let code;
    do {
        code = generateInvoiceCode(date, sequenceCounter[dateKey]);
        sequenceCounter[dateKey]++;
    } while (existingCodes.has(code));

    return code;
}

// Process each date
Object.entries(manualData).forEach(([date, data]) => {
    const dateObj = new Date(date);

    // Generate Bagus transactions (Haircut by Head Barber - Rp 50,000)
    for (let i = 0; i < (data.bagus || 0); i++) {
        const invoiceCode = getNextSequence(date);
        const hour = 12 + Math.floor(Math.random() * 10); // Random hour 12-21
        const minute = Math.floor(Math.random() * 60);
        const transactionDate = new Date(date);
        transactionDate.setHours(hour, minute, 0, 0);

        missingTransactions.push({
            invoiceCode,
            barberId: 3, // Bagus
            customerName: `Customer ${invoiceCode}`,
            customerPhone: null,
            items: [
                {
                    name: 'Haircut by Head Barber',
                    price: 50000,
                    qty: 1
                }
            ],
            totalAmount: 50000,
            paymentMethod: Math.random() > 0.3 ? 'qris' : 'cash',
            date: transactionDate.toISOString()
        });
    }

    // Generate Diva transactions (Haircut - Rp 40,000)
    for (let i = 0; i < (data.diva || 0); i++) {
        const invoiceCode = getNextSequence(date);
        const hour = 12 + Math.floor(Math.random() * 10);
        const minute = Math.floor(Math.random() * 60);
        const transactionDate = new Date(date);
        transactionDate.setHours(hour, minute, 0, 0);

        missingTransactions.push({
            invoiceCode,
            barberId: 4, // Diva
            customerName: `Customer ${invoiceCode}`,
            customerPhone: null,
            items: [
                {
                    name: 'Haircut',
                    price: 40000,
                    qty: 1
                }
            ],
            totalAmount: 40000,
            paymentMethod: Math.random() > 0.3 ? 'qris' : 'cash',
            date: transactionDate.toISOString()
        });
    }

    // Generate special transactions (e.g., toning)
    if (data.special) {
        data.special.forEach(special => {
            const invoiceCode = getNextSequence(date);
            const hour = 12 + Math.floor(Math.random() * 10);
            const minute = Math.floor(Math.random() * 60);
            const transactionDate = new Date(date);
            transactionDate.setHours(hour, minute, 0, 0);

            missingTransactions.push({
                invoiceCode,
                barberId: special.barber === 'bagus' ? 3 : 4,
                customerName: `Customer ${invoiceCode}`,
                customerPhone: null,
                items: [
                    {
                        name: special.service,
                        price: special.price,
                        qty: 1
                    }
                ],
                totalAmount: special.price,
                paymentMethod: 'qris',
                date: transactionDate.toISOString()
            });
        });
    }
});

// Sort by date
missingTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Combine with existing
const allTransactions = [...existingInvoices, ...missingTransactions];
allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Save to file
fs.writeFileSync(
    path.join(__dirname, 'invoices-complete.json'),
    JSON.stringify(allTransactions, null, 2)
);

// Statistics
const totalBagus = manualData['2026-01-02'].bagus + manualData['2026-01-03'].bagus +
    manualData['2026-01-04'].bagus + manualData['2026-01-05'].bagus +
    manualData['2026-01-06'].bagus + manualData['2026-01-07'].bagus +
    manualData['2026-01-08'].bagus;

const totalDiva = manualData['2026-01-02'].diva + manualData['2026-01-03'].diva +
    manualData['2026-01-04'].diva + manualData['2026-01-05'].diva +
    manualData['2026-01-06'].diva + manualData['2026-01-07'].diva +
    manualData['2026-01-08'].diva;

const totalRevenue = (totalBagus * 50000) + (totalDiva * 40000) + 40000; // +40k for toning

console.log('📊 Manual Book Data Summary:');
console.log('');
console.log(`Total Bagus transactions: ${totalBagus}`);
console.log(`Total Diva transactions: ${totalDiva}`);
console.log(`Special transactions: 1 (Toning)`);
console.log(`Total transactions: ${totalBagus + totalDiva + 1}`);
console.log('');
console.log(`Estimated Revenue:`);
console.log(`  Bagus: Rp ${(totalBagus * 50000).toLocaleString('id-ID')}`);
console.log(`  Diva: Rp ${(totalDiva * 40000).toLocaleString('id-ID')}`);
console.log(`  Toning: Rp 40.000`);
console.log(`  TOTAL: Rp ${totalRevenue.toLocaleString('id-ID')}`);
console.log('');
console.log(`📄 Existing invoices (from PDF): ${existingInvoices.length}`);
console.log(`📝 Missing invoices (from manual book): ${missingTransactions.length}`);
console.log(`📊 Total invoices: ${allTransactions.length}`);
console.log('');
console.log('✅ Created: invoices-complete.json');
console.log('');
console.log('Next step: Review invoices-complete.json, then run:');
console.log('  cp invoices-complete.json invoices.json');
console.log('  node restore-transactions.js');
