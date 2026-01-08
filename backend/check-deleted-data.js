const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const prisma = require('./lib/prisma');
require('dotenv').config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

/**
 * Compare invoices in R2 with transactions in database to find missing data
 */
async function checkDeletedData() {
    try {
        console.log('🔍 Analyzing deleted data...\n');

        // 1. Get all invoice codes from R2
        console.log('📄 Fetching invoices from R2...');
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'invoices/',
        });

        const listResponse = await s3Client.send(listCommand);
        const invoiceFiles = listResponse.Contents || [];
        const pdfFiles = invoiceFiles.filter(file => file.Key.endsWith('.pdf'));

        const invoiceCodesInR2 = pdfFiles.map(file => {
            const filename = file.Key.split('/').pop();
            return filename.replace('.pdf', '');
        }).sort();

        console.log(`✅ Found ${invoiceCodesInR2.length} invoices in R2\n`);

        // 2. Get all invoice codes from database
        console.log('💾 Fetching transactions from database...');
        const transactions = await prisma.transaction.findMany({
            select: {
                invoiceCode: true,
                date: true,
                totalAmount: true,
                customerName: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        const invoiceCodesInDB = transactions.map(t => t.invoiceCode).sort();
        console.log(`✅ Found ${invoiceCodesInDB.length} transactions in database\n`);

        // 3. Find missing invoices (in R2 but not in DB)
        const missingInDB = invoiceCodesInR2.filter(code => !invoiceCodesInDB.includes(code));

        // 4. Find extra invoices (in DB but not in R2)
        const extraInDB = invoiceCodesInDB.filter(code => !invoiceCodesInR2.includes(code));

        // 5. Calculate statistics
        const dbStats = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            _count: true,
            _min: { date: true },
            _max: { date: true }
        });

        // Print results
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 DATA ANALYSIS SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📄 INVOICES IN R2 (PDF Files):');
        console.log(`   Total: ${invoiceCodesInR2.length}`);
        console.log(`   Range: ${invoiceCodesInR2[0]} to ${invoiceCodesInR2[invoiceCodesInR2.length - 1]}\n`);

        console.log('💾 TRANSACTIONS IN DATABASE:');
        console.log(`   Total: ${dbStats._count}`);
        console.log(`   Revenue: Rp ${dbStats._sum.totalAmount?.toLocaleString('id-ID') || 0}`);
        console.log(`   Date Range: ${dbStats._min.date?.toISOString().split('T')[0]} to ${dbStats._max.date?.toISOString().split('T')[0]}\n`);

        console.log('❌ MISSING FROM DATABASE (Have PDF, No DB Record):');
        console.log(`   Count: ${missingInDB.length}`);
        if (missingInDB.length > 0) {
            console.log('   Invoice Codes:');
            missingInDB.forEach(code => console.log(`   - ${code}`));
        } else {
            console.log('   ✅ None! All invoices are in database.');
        }
        console.log('');

        console.log('⚠️  EXTRA IN DATABASE (No PDF, Has DB Record):');
        console.log(`   Count: ${extraInDB.length}`);
        if (extraInDB.length > 0) {
            console.log('   Invoice Codes (first 20):');
            extraInDB.slice(0, 20).forEach(code => console.log(`   - ${code}`));
            if (extraInDB.length > 20) {
                console.log(`   ... and ${extraInDB.length - 20} more`);
            }
        } else {
            console.log('   ✅ None! All database records have PDFs.');
        }
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('📈 RECOVERY STATUS');
        console.log('═══════════════════════════════════════════════════════\n');

        const recoveryRate = invoiceCodesInR2.length > 0
            ? ((invoiceCodesInR2.length - missingInDB.length) / invoiceCodesInR2.length * 100).toFixed(1)
            : 0;

        console.log(`✅ Recovery Rate: ${recoveryRate}% (${invoiceCodesInR2.length - missingInDB.length}/${invoiceCodesInR2.length})`);
        console.log(`📊 Database has ${dbStats._count} total transactions`);
        console.log(`💰 Total Revenue: Rp ${dbStats._sum.totalAmount?.toLocaleString('id-ID') || 0}\n`);

        if (missingInDB.length > 0) {
            console.log('⚠️  ACTION REQUIRED:');
            console.log(`   ${missingInDB.length} invoices need to be restored`);
            console.log('   Run: node restore-transactions.js\n');
        } else {
            console.log('✅ ALL INVOICES RECOVERED!');
            console.log('   No action needed.\n');
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                invoicesInR2: invoiceCodesInR2.length,
                transactionsInDB: dbStats._count,
                missingFromDB: missingInDB.length,
                extraInDB: extraInDB.length,
                recoveryRate: `${recoveryRate}%`,
                totalRevenue: dbStats._sum.totalAmount
            },
            missingInvoices: missingInDB,
            extraTransactions: extraInDB,
            dateRange: {
                earliest: dbStats._min.date,
                latest: dbStats._max.date
            }
        };

        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(
            path.join(__dirname, 'data-analysis-report.json'),
            JSON.stringify(report, null, 2)
        );
        console.log('📄 Detailed report saved to: data-analysis-report.json\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkDeletedData();
