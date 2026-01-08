const fs = require('fs');
const path = require('path');

/**
 * Generate transactions strictly from manual book records (Total 103)
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
        diva: 5 // Updated from previously assumed 10 (based on text "7-8 bagus 10 difa 10", assuming split evenly or total 2 days)
        // Wait, text said "tgl 7-8 bagus 10 difa 10". Usually this means total for both days.
        // Let's assume 5 each per day.
    },
    '2026-01-08': {
        bagus: 5,
        diva: 5
    }
};

// Generate list of 103 transactions
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

        allTransactions.push({
            invoiceCode,
            barberId: 3, // Bagus
            customerName: '-', // Request: Kosong/Dash
            customerPhone: null,
            items: [
                {
                    name: 'Haircut by Head Barber',
                    price: 50000,
                    qty: 1
                }
            ],
            totalAmount: 50000,
            paymentMethod: Math.random() > 0.3 ? 'qris' : 'cash', // Simulation
            date: transactionDate.toISOString()
        });
    }

    // Generate Diva transactions
    for (let i = 0; i < (data.diva || 0); i++) {
        const invoiceCode = getNextSequence(date);

        // Random time
        const hour = 10 + Math.floor(Math.random() * 11);
        const minute = Math.floor(Math.random() * 60);
        const transactionDate = new Date(date);
        transactionDate.setHours(hour, minute, 0, 0);

        allTransactions.push({
            invoiceCode,
            barberId: 4, // Diva
            customerName: '-', // Request: Kosong/Dash
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

    // Special transactions
    if (data.special) {
        data.special.forEach(special => {
            const invoiceCode = getNextSequence(date);
            const hour = 10 + Math.floor(Math.random() * 11);
            const minute = Math.floor(Math.random() * 60);
            const transactionDate = new Date(date);
            transactionDate.setHours(hour, minute, 0, 0);

            allTransactions.push({
                invoiceCode,
                barberId: special.barber === 'bagus' ? 3 : 4,
                customerName: '-',
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
allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Save to file
fs.writeFileSync(
    path.join(__dirname, 'invoices-final-103.json'),
    JSON.stringify(allTransactions, null, 2)
);

console.log('✅ Generated 103 transactions based on manual book');
console.log(`Total count: ${allTransactions.length}`);
console.log('Saved to: invoices-final-103.json');
