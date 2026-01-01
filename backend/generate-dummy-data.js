const prisma = require('./lib/prisma');

// Helper function untuk generate invoice code
function generateInvoiceCode(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
}

// Helper function untuk generate time slot
function generateTimeSlot() {
    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const startHour = hours[Math.floor(Math.random() * hours.length)];
    const endHour = startHour + 1;
    return `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
}

// Customer names pool
const customerNames = [
    'Ahmad Rizki', 'Budi Santoso', 'Cahyo Pratama', 'Dedi Kurniawan', 'Eko Wijaya',
    'Fajar Nugroho', 'Gunawan Setiawan', 'Hadi Susanto', 'Indra Permana', 'Joko Widodo',
    'Kurniawan Adi', 'Lukman Hakim', 'Muhammad Ali', 'Nur Hadi', 'Oki Setiawan',
    'Prasetyo Budi', 'Qodir Ahmad', 'Rizki Pratama', 'Surya Wijaya', 'Teguh Santoso',
    'Udin Sedunia', 'Vino G Bastian', 'Wahyu Kurniawan', 'Yoga Pratama', 'Zainal Abidin',
    'Agus Supriyadi', 'Bambang Sutrisno', 'Candra Wijaya', 'Doni Salmanan', 'Erik Setiawan'
];

// Service names (akan diambil dari database)
// Customer phone generator
function generatePhone() {
    const prefixes = ['0812', '0813', '0821', '0822', '0823', '0852', '0853', '0857', '0858', '0819'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${number}`;
}

// Expense categories
const expenseCategories = ['operational', 'supplies', 'utilities', 'maintenance', 'other'];
const expenseDescriptions = {
    operational: ['Bensin', 'Parkir', 'Snack', 'Minuman', 'Konsumsi'],
    supplies: ['Shampoo', 'Pomade', 'Gunting', 'Razor', 'Towel', 'Apron'],
    utilities: ['Listrik', 'Air', 'Internet', 'Telepon'],
    maintenance: ['Service AC', 'Perbaikan Kursi', 'Cat Ulang'],
    other: ['Lain-lain', 'Dana Darurat']
};

async function generateDummyData() {
    try {
        console.log('🚀 Starting dummy data generation for Dec 1-31, 2025...\n');

        // Get all barbers (staff)
        const barbers = await prisma.user.findMany({
            where: { role: 'staff', status: 'active' }
        });

        if (barbers.length === 0) {
            console.log('❌ No barbers found! Please seed users first.');
            return;
        }

        console.log(`✅ Found ${barbers.length} barber(s): ${barbers.map(b => b.name).join(', ')}\n`);

        // Get all services
        const services = await prisma.service.findMany({
            where: { isActive: true }
        });

        if (services.length === 0) {
            console.log('❌ No services found! Please seed services first.');
            return;
        }

        console.log(`✅ Found ${services.length} service(s)\n`);

        // Date range: Dec 1-31, 2025
        const startDate = new Date('2025-12-01T00:00:00.000Z');
        const endDate = new Date('2025-12-31T23:59:59.999Z');

        // Create customers
        console.log('📝 Creating customers...');
        const createdCustomers = [];
        for (let i = 0; i < 30; i++) {
            const phone = generatePhone();
            const existing = await prisma.customer.findUnique({
                where: { phone }
            });
            if (!existing) {
                const customer = await prisma.customer.create({
                    data: {
                        name: customerNames[i % customerNames.length],
                        phone: phone,
                        totalVisits: 0,
                        lastVisit: startDate
                    }
                });
                createdCustomers.push(customer);
            }
        }
        console.log(`✅ Created ${createdCustomers.length} customers\n`);

        // Get all customers (including existing)
        const allCustomers = await prisma.customer.findMany();

        // Generate data for each day
        let totalTransactions = 0;
        let totalBookings = 0;
        let totalExpenses = 0;
        let totalShifts = 0;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const currentDate = new Date(d);
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

            // Skip Sunday (assuming closed on Sunday)
            if (dayOfWeek === 0) {
                continue;
            }

            console.log(`📅 Processing ${currentDate.toISOString().split('T')[0]}...`);

            // Generate shifts and transactions for each barber
            for (const barber of barbers) {
                // Create cash shift (open in morning, close at night)
                const shiftOpenTime = new Date(currentDate);
                shiftOpenTime.setHours(8, 0, 0, 0); // 8:00 AM

                const shiftCloseTime = new Date(currentDate);
                shiftCloseTime.setHours(21, 0, 0, 0); // 9:00 PM

                const startCash = Math.floor(Math.random() * 500000) + 100000; // 100k - 600k

                const shift = await prisma.cashShift.create({
                    data: {
                        openedById: barber.id,
                        closedById: barber.id,
                        startCash: startCash,
                        status: 'closed',
                        startTime: shiftOpenTime,
                        endTime: shiftCloseTime,
                        actualEndCash: startCash,
                        totalRevenue: 0
                    }
                });
                totalShifts++;

                // Generate transactions (3-8 transactions per barber per day)
                const numTransactions = Math.floor(Math.random() * 6) + 3; // 3-8
                let shiftRevenue = 0;

                for (let i = 0; i < numTransactions; i++) {
                    // Random time during the day (9 AM - 8 PM)
                    const transactionTime = new Date(currentDate);
                    const hour = Math.floor(Math.random() * 11) + 9; // 9-19
                    const minute = Math.floor(Math.random() * 60);
                    transactionTime.setHours(hour, minute, 0, 0);

                    // Select random customer
                    const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];

                    // Select 1-3 random services
                    const numServices = Math.floor(Math.random() * 3) + 1; // 1-3
                    const selectedServices = [];
                    for (let j = 0; j < numServices; j++) {
                        const service = services[Math.floor(Math.random() * services.length)];
                        selectedServices.push({
                            name: service.name,
                            price: service.price,
                            qty: 1
                        });
                    }

                    const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
                    const paymentMethod = Math.random() > 0.3 ? 'cash' : 'qris'; // 70% cash, 30% qris

                    const invoiceCode = generateInvoiceCode(transactionTime);

                    await prisma.transaction.create({
                        data: {
                            invoiceCode: invoiceCode,
                            barberId: barber.id,
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            items: selectedServices,
                            totalAmount: totalAmount,
                            paymentMethod: paymentMethod,
                            date: transactionTime
                        }
                    });

                    shiftRevenue += totalAmount;
                    totalTransactions++;

                    // Update customer visit
                    await prisma.customer.update({
                        where: { id: customer.id },
                        data: {
                            totalVisits: { increment: 1 },
                            lastVisit: transactionTime
                        }
                    });
                }

                // Update shift revenue and end cash
                const actualEndCash = startCash + shiftRevenue;
                await prisma.cashShift.update({
                    where: { id: shift.id },
                    data: {
                        totalRevenue: shiftRevenue,
                        actualEndCash: actualEndCash
                    }
                });
            }

            // Generate bookings (some completed, some pending)
            const numBookings = Math.floor(Math.random() * 5) + 2; // 2-6 bookings per day
            for (let i = 0; i < numBookings; i++) {
                const barber = barbers[Math.floor(Math.random() * barbers.length)];
                const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];

                const bookingTime = new Date(currentDate);
                const hour = Math.floor(Math.random() * 11) + 9; // 9-19
                bookingTime.setHours(hour, 0, 0, 0);

                const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending']; // Mostly completed
                const status = statuses[Math.floor(Math.random() * statuses.length)];

                await prisma.booking.create({
                    data: {
                        barberId: barber.id,
                        customerName: customer.name,
                        customerPhone: customer.phone,
                        bookingDate: bookingTime,
                        timeSlot: generateTimeSlot(),
                        status: status
                    }
                });
                totalBookings++;
            }

            // Generate expenses (1-3 expenses per day)
            const numExpenses = Math.floor(Math.random() * 3) + 1; // 1-3
            for (let i = 0; i < numExpenses; i++) {
                const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
                const descriptions = expenseDescriptions[category];
                const description = descriptions[Math.floor(Math.random() * descriptions.length)];
                const amount = Math.floor(Math.random() * 200000) + 10000; // 10k - 210k

                const expenseTime = new Date(currentDate);
                const hour = Math.floor(Math.random() * 12) + 8; // 8-19
                expenseTime.setHours(hour, 0, 0, 0);

                await prisma.expense.create({
                    data: {
                        description: description,
                        amount: amount,
                        category: category,
                        date: expenseTime
                    }
                });
                totalExpenses++;
            }
        }

        // Generate payroll for December 2025
        console.log('\n💰 Generating payroll for December 2025...');
        for (const barber of barbers) {
            // Calculate total services and commission from transactions
            const transactions = await prisma.transaction.findMany({
                where: {
                    barberId: barber.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            const totalServices = transactions.length;
            let totalCommission = 0;

            // Create service map for commission lookup
            const serviceMap = services.reduce((acc, s) => {
                acc[s.name] = s;
                return acc;
            }, {});

            for (const transaction of transactions) {
                if (Array.isArray(transaction.items)) {
                    for (const item of transaction.items) {
                        const service = serviceMap[item.name];
                        if (service) {
                            if (service.commissionType === 'percentage') {
                                totalCommission += (item.price * service.commissionValue) / 100;
                            } else {
                                totalCommission += service.commissionValue;
                            }
                        }
                    }
                }
            }

            const baseSalary = 0;
            const bonuses = Math.random() > 0.7 ? Math.floor(Math.random() * 500000) : 0; // 30% chance
            const deductions = Math.random() > 0.8 ? Math.floor(Math.random() * 200000) : 0; // 20% chance
            const totalPayout = baseSalary + totalCommission + bonuses - deductions;

            await prisma.payroll.create({
                data: {
                    barberId: barber.id,
                    period: '2025-12',
                    totalServices: totalServices,
                    totalCommission: Math.round(totalCommission),
                    baseSalary: baseSalary,
                    bonuses: bonuses,
                    deductions: deductions,
                    totalPayout: Math.round(totalPayout),
                    status: 'paid'
                }
            });
        }
        console.log(`✅ Generated payroll for ${barbers.length} barber(s)\n`);

        console.log('✅ Dummy data generation completed!\n');
        console.log('📊 Summary:');
        console.log(`   - Shifts: ${totalShifts}`);
        console.log(`   - Transactions: ${totalTransactions}`);
        console.log(`   - Bookings: ${totalBookings}`);
        console.log(`   - Expenses: ${totalExpenses}`);
        console.log(`   - Payroll records: ${barbers.length}`);
        console.log(`   - Period: Dec 1-31, 2025\n`);

    } catch (error) {
        console.error('❌ Error generating dummy data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
generateDummyData()
    .then(() => {
        console.log('✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });

