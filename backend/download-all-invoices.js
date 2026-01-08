const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
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
 * Download all invoice PDFs from R2 to local folder
 */
async function downloadAllInvoices() {
    try {
        console.log('📥 Downloading all invoices from R2...\n');

        // Create download directory
        const downloadDir = path.join(__dirname, 'downloaded-invoices');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        // List all objects in invoices/ folder
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'invoices/',
        });

        const listResponse = await s3Client.send(listCommand);
        const invoiceFiles = listResponse.Contents || [];

        // Filter only PDF files
        const pdfFiles = invoiceFiles.filter(file => file.Key.endsWith('.pdf'));
        console.log(`📄 Found ${pdfFiles.length} PDF invoices to download\n`);

        if (pdfFiles.length === 0) {
            console.log('❌ No PDF invoices found in R2 bucket');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const file of pdfFiles) {
            try {
                const filename = path.basename(file.Key);
                const localPath = path.join(downloadDir, filename);

                // Download file
                const getCommand = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: file.Key,
                });

                const response = await s3Client.send(getCommand);
                const chunks = [];

                for await (const chunk of response.Body) {
                    chunks.push(chunk);
                }

                const buffer = Buffer.concat(chunks);
                fs.writeFileSync(localPath, buffer);

                console.log(`✅ Downloaded: ${filename}`);
                successCount++;

            } catch (error) {
                console.log(`❌ Error downloading ${file.Key}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n📊 Download Summary:');
        console.log(`   ✅ Successfully downloaded: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📁 Saved to: ${downloadDir}\n`);

        console.log('📋 Next Steps:');
        console.log('1. Open the downloaded PDFs to review transaction details');
        console.log('2. Use the invoice-entry-helper.js script to create invoices.json');
        console.log('3. Run: node restore-transactions.js\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
downloadAllInvoices();
