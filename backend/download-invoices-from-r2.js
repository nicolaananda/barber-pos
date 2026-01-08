const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
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
 * Download all invoices from R2 bucket and extract transaction data
 */
async function downloadAndExtractInvoices() {
    try {
        console.log('🔍 Listing all invoices from R2 bucket...\n');

        // List all objects in invoices/ folder
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'invoices/',
        });

        const listResponse = await s3Client.send(listCommand);
        const invoiceFiles = listResponse.Contents || [];

        console.log(`📊 Found ${invoiceFiles.length} files in invoices/ folder\n`);

        // Filter only PDF files
        const pdfFiles = invoiceFiles.filter(file => file.Key.endsWith('.pdf'));
        console.log(`📄 Found ${pdfFiles.length} PDF invoices\n`);

        if (pdfFiles.length === 0) {
            console.log('❌ No PDF invoices found in R2 bucket');
            return;
        }

        // Extract invoice codes from filenames
        const invoiceCodes = pdfFiles.map(file => {
            const filename = path.basename(file.Key, '.pdf');
            return filename;
        });

        console.log('📋 Invoice codes found:');
        invoiceCodes.forEach(code => console.log(`   - ${code}`));
        console.log('');

        // Fetch transactions from database that match these invoice codes
        console.log('🔍 Checking which invoices exist in database...\n');

        const existingTransactions = await prisma.transaction.findMany({
            where: {
                invoiceCode: {
                    in: invoiceCodes
                }
            },
            select: {
                invoiceCode: true,
                barberId: true,
                customerName: true,
                customerPhone: true,
                items: true,
                totalAmount: true,
                paymentMethod: true,
                date: true
            }
        });

        console.log(`✅ Found ${existingTransactions.length} transactions in database`);
        console.log(`❌ Missing ${invoiceCodes.length - existingTransactions.length} transactions\n`);

        // Find missing invoice codes
        const existingCodes = new Set(existingTransactions.map(t => t.invoiceCode));
        const missingCodes = invoiceCodes.filter(code => !existingCodes.has(code));

        if (missingCodes.length === 0) {
            console.log('✅ All invoices already exist in database!');
            console.log('💾 No restoration needed.');
            return;
        }

        console.log('⚠️  Missing invoices:');
        missingCodes.forEach(code => console.log(`   - ${code}`));
        console.log('');

        // Create invoices.json with existing transaction data as template
        console.log('📝 Creating invoices.json template...\n');

        const invoicesData = existingTransactions.map(t => ({
            invoiceCode: t.invoiceCode,
            barberId: t.barberId,
            customerName: t.customerName,
            customerPhone: t.customerPhone,
            items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
            totalAmount: t.totalAmount,
            paymentMethod: t.paymentMethod,
            date: t.date.toISOString()
        }));

        // Save to file
        const outputFile = path.join(__dirname, 'invoices-from-r2.json');
        fs.writeFileSync(outputFile, JSON.stringify(invoicesData, null, 2));

        console.log(`✅ Created: ${outputFile}`);
        console.log(`📊 Contains ${invoicesData.length} existing transactions as reference\n`);

        console.log('📋 Next Steps:');
        console.log('1. Review the missing invoice codes above');
        console.log('2. Use invoices-from-r2.json as a template');
        console.log('3. Add missing transactions manually or from your records');
        console.log('4. Run: node restore-transactions.js\n');

        // Also create a summary file
        const summaryFile = path.join(__dirname, 'invoice-summary.txt');
        const summary = `
Invoice Summary from R2 Bucket
================================

Total invoices in R2: ${pdfFiles.length}
Existing in database: ${existingTransactions.length}
Missing from database: ${missingCodes.length}

Missing Invoice Codes:
${missingCodes.map(code => `- ${code}`).join('\n')}

Files Created:
- invoices-from-r2.json (existing transactions as reference)
- invoice-summary.txt (this file)

Next Steps:
1. Check your records for the missing invoices
2. Add them to invoices.json
3. Run: node restore-transactions.js
`;

        fs.writeFileSync(summaryFile, summary);
        console.log(`✅ Created: ${summaryFile}\n`);

        console.log('🎯 Summary:');
        console.log(`   Total invoices in R2: ${pdfFiles.length}`);
        console.log(`   Already in database: ${existingTransactions.length}`);
        console.log(`   Need to restore: ${missingCodes.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
downloadAndExtractInvoices();
