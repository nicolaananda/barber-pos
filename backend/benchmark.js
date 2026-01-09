#!/usr/bin/env node
/**
 * Performance Benchmark Script
 * Tests database query performance with and without indexes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function benchmark() {
    console.log('🔥 Performance Benchmark Test\n');
    console.log('='.repeat(60));

    // Test 1: Booking by Date and Barber
    console.log('\n📊 Test 1: Get bookings by date and barber');
    const test1Start = Date.now();
    const bookings = await prisma.booking.findMany({
        where: {
            barberId: 3,
            bookingDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
            },
            status: { in: ['pending', 'confirmed'] }
        },
        include: {
            barber: {
                select: { id: true, name: true }
            }
        }
    });
    const test1Time = Date.now() - test1Start;
    console.log(`   Results: ${bookings.length} bookings found`);
    console.log(`   ⏱️  Time: ${test1Time}ms`);
    console.log(`   ${test1Time < 20 ? '✅ EXCELLENT' : test1Time < 50 ? '⚠️  GOOD' : '❌ SLOW'}`);

    // Test 2: Customer Lookup by Phone
    console.log('\n📊 Test 2: Customer lookup by phone');
    const test2Start = Date.now();
    const customer = await prisma.customer.findUnique({
        where: { phone: '081389592985' }
    });
    const test2Time = Date.now() - test2Start;
    console.log(`   Results: ${customer ? 'Customer found' : 'Not found'}`);
    console.log(`   ⏱️  Time: ${test2Time}ms`);
    console.log(`   ${test2Time < 10 ? '✅ EXCELLENT' : test2Time < 30 ? '⚠️  GOOD' : '❌ SLOW'}`);

    // Test 3: Transaction Report by Barber
    console.log('\n📊 Test 3: Transaction report by barber (last 30 days)');
    const test3Start = Date.now();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const transactions = await prisma.transaction.findMany({
        where: {
            barberId: 3,
            date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'desc' },
        take: 100
    });
    const test3Time = Date.now() - test3Start;
    console.log(`   Results: ${transactions.length} transactions found`);
    console.log(`   ⏱️  Time: ${test3Time}ms`);
    console.log(`   ${test3Time < 30 ? '✅ EXCELLENT' : test3Time < 80 ? '⚠️  GOOD' : '❌ SLOW'}`);

    // Test 4: Recent Customers
    console.log('\n📊 Test 4: Recent customers (last 7 days)');
    const test4Start = Date.now();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCustomers = await prisma.customer.findMany({
        where: {
            lastVisit: { gte: sevenDaysAgo }
        },
        orderBy: { lastVisit: 'desc' },
        take: 50
    });
    const test4Time = Date.now() - test4Start;
    console.log(`   Results: ${recentCustomers.length} customers found`);
    console.log(`   ⏱️  Time: ${test4Time}ms`);
    console.log(`   ${test4Time < 20 ? '✅ EXCELLENT' : test4Time < 50 ? '⚠️  GOOD' : '❌ SLOW'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY:');
    console.log('='.repeat(60));

    const avgTime = (test1Time + test2Time + test3Time + test4Time) / 4;
    console.log(`\n   Average Query Time: ${avgTime.toFixed(2)}ms`);

    if (avgTime < 20) {
        console.log('   🎉 EXCELLENT! Queries are blazing fast!');
        console.log('   💚 Indexes are working perfectly.');
    } else if (avgTime < 50) {
        console.log('   ✅ GOOD! Performance is solid.');
        console.log('   💛 Consider running migration if not done yet.');
    } else {
        console.log('   ⚠️  SLOW! Queries need optimization.');
        console.log('   💡 Run: mysql -u stay_cool -p stay_cool < migrations/add_performance_indexes.sql');
    }

    console.log('\n' + '='.repeat(60));

    await prisma.$disconnect();
}

benchmark().catch(console.error);
