const fs = require('fs');
const path = require('path');

/**
 * Generate transactions strictly from manual book records (Total 102)
 * Toning is merged into one of Bagus's transactions on Jan 3rd
 */

// Data from manual book
const manualData = {
    '2026-01-02': {
        bagus: 11,
        diva: 13
    },
    '2026-01-03': {
        bagus: 10, // One of these will include Toning
        diva: 6
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

// Generate list of transactions
const allTransactions = [];
let sequenceCounter = {};

function getNextSequence(date) {
    const dateKey = date.replace(/-/g, '').substring(2);
    if (!sequenceCounter[dateKey]) {
        sequenceCounter[dateKey] = 1;
    }
    const seqStr = sequenceCounter[dateKey].toString().padStart(3, '0');
    sequenceCounter[dateKey]++;
    return `INV-${dateKey}-${seqStr}`;
}

// Process each date
Object.entries(manualData).forEach(([date, data]) => {

    // Generate Bagus transactions
    for (let i = 0; i < (data.bagus || 0); i++) {
        const invoiceCode = getNextSequence(date);

        // Random time between 10 AM and 9 PM
        const hour = 10 + Math.floor(Math.random() * 11);
        const minute = Math.floor(Math.random() * 60);
        const transactionDate = new Date(date);
        transactionDate.setHours(hour, minute, 0, 0);

        // Default Item
        let items = [
            {
                name: 'Haircut by Head Barber',
                price: 50000,
                qty: 1
            }
        ];
        let totalAmount = 50000;

        // MERGE TONING on Jan 3rd for the FIRST transaction of Bagus
        if (date === '2026-01-03' && i === 0) {
            console.log('✨ Merging Toning into transaction:', invoiceCode);
            items.push({
                name: 'Toning [Semir Hitam]',
                price: 40000,
                qty: 1
            });
            totalAmount += 40000;
        }

        allTransactions.push({
            invoiceCode,
            barberId: 3, // Bagus
            customerName: '-',
            customerPhone: null,
            items,
            totalAmount,
            paymentMethod: Math.random() > 0.3 ? 'qris' : 'cash',
            date: transactionDate.toISOString()
        });
    }

    // Generate Diva transactions
    for (let i = 0; i < (data.diva || 0); i++) {
        const invoiceCode = getNextSequence(date);

        const hour = 10 + Math.floor(Math.random() * 11);
        const minute = Math.floor(Math.random() * 60);
        const transactionDate = new Date(date);
        transactionDate.setHours(hour, minute, 0, 0);

        allTransactions.push({
            invoiceCode,
            barberId: 4, // Diva
            customerName: '-',
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
});

// Sort by date
allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Save to file
fs.writeFileSync(
    path.join(__dirname, 'invoices-final-102.json'),
    JSON.stringify(allTransactions, null, 2)
);

console.log('✅ Generated 102 transactions (Toning merged)');
console.log(`Total count: ${allTransactions.length}`);
console.log('Saved to: invoices-final-102.json');
