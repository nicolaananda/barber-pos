const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const prisma = require('./lib/prisma');

/**
 * Parse invoice PDFs and extract transaction data
 */
async function parseInvoicePDFs() {
    try {
        console.log('📄 Parsing invoice PDFs...\n');

        const invoicesDir = path.join(__dirname, 'downloaded-invoices');

        if (!fs.existsSync(invoicesDir)) {
            console.log('❌ Downloaded invoices folder not found!');
            console.log('   Run: node download-all-invoices.js first');
            process.exit(1);
        }

        const pdfFiles = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.pdf'));
        console.log(`📊 Found ${pdfFiles.length} PDF files to parse\n`);

        const transactions = [];
        let successCount = 0;
        let errorCount = 0;

        for (const filename of pdfFiles) {
            try {
                const filePath = path.join(invoicesDir, filename);
                const dataBuffer = fs.readFileSync(filePath);
                const data = await PDFParse(dataBuffer);
                const text = data.text;

                // Extract invoice code from filename
                const invoiceCode = path.basename(filename, '.pdf');

                // Parse the PDF text
                const parsed = parseInvoiceText(text, invoiceCode);

                if (parsed) {
                    transactions.push(parsed);
                    console.log(`✅ Parsed: ${invoiceCode} - ${parsed.customerName || 'No name'} - Rp ${parsed.totalAmount.toLocaleString('id-ID')}`);
                    successCount++;
                } else {
                    console.log(`⚠️  Could not parse: ${invoiceCode}`);
                    errorCount++;
                }

            } catch (error) {
                console.log(`❌ Error parsing ${filename}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n📊 Parsing Summary:');
        console.log(`   ✅ Successfully parsed: ${successCount}`);
        console.log(`   ❌ Errors/Skipped: ${errorCount}`);
        console.log(`   📄 Total: ${pdfFiles.length}\n`);

        if (transactions.length === 0) {
            console.log('❌ No transactions parsed successfully');
            return;
        }

        // Save to invoices.json
        const outputFile = path.join(__dirname, 'invoices.json');
        fs.writeFileSync(outputFile, JSON.stringify(transactions, null, 2));
        console.log(`✅ Created: ${outputFile}`);
        console.log(`📊 Contains ${transactions.length} transactions\n`);

        console.log('📋 Next Steps:');
        console.log('1. Review invoices.json');
        console.log('2. Run: node restore-transactions.js\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Parse invoice text and extract transaction data
 */
function parseInvoiceText(text, invoiceCode) {
    try {
        // Extract data using regex patterns
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        // Extract invoice code (already have from filename)

        // Extract date (format: dd/MM/yyyy HH:mm)
        const dateMatch = text.match(/Date\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
        let date = new Date();
        if (dateMatch) {
            const [day, month, yearTime] = dateMatch[1].split('/');
            const [year, time] = yearTime.split(' ');
            const [hour, minute] = time.split(':');
            date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        }

        // Extract barber name
        const barberMatch = text.match(/Barber\s+(.+?)(?:\n|Cust|$)/);
        const barberName = barberMatch ? barberMatch[1].trim() : 'Unknown';

        // Map barber name to ID (adjust based on your database)
        let barberId = 3; // Default to Bagus
        if (barberName.toLowerCase().includes('diva')) {
            barberId = 4;
        } else if (barberName.toLowerCase().includes('bagus')) {
            barberId = 3;
        }

        // Extract customer name
        const custMatch = text.match(/Cust\s+(.+?)(?:\n|$)/);
        const customerName = custMatch ? custMatch[1].trim() : null;

        // Extract items (between dividers and before TOTAL)
        const items = [];
        const itemsSection = text.match(/---+\s*([\s\S]*?)\s*---+\s*TOTAL/);
        if (itemsSection) {
            const itemLines = itemsSection[1].split('\n').filter(l => l.trim());

            for (const line of itemLines) {
                // Format: "1x Service Name    Price"
                const itemMatch = line.match(/(\d+)x\s+(.+?)\s+([\d,]+)$/);
                if (itemMatch) {
                    const qty = parseInt(itemMatch[1]);
                    const name = itemMatch[2].trim();
                    const price = parseInt(itemMatch[3].replace(/,/g, ''));
                    items.push({ name, price: price / qty, qty });
                }
            }
        }

        // Extract total amount
        const totalMatch = text.match(/TOTAL\s+IDR\s+([\d,]+)/);
        const totalAmount = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;

        // Extract payment method
        const paymentMatch = text.match(/Payment\s+(CASH|QRIS)/i);
        const paymentMethod = paymentMatch ? paymentMatch[1].toLowerCase() : 'cash';

        // Validate required fields
        if (!invoiceCode || totalAmount === 0 || items.length === 0) {
            return null;
        }

        return {
            invoiceCode,
            barberId,
            customerName,
            customerPhone: null, // Not in PDF
            items,
            totalAmount,
            paymentMethod,
            date: date.toISOString()
        };

    } catch (error) {
        console.error(`Error parsing text: ${error.message}`);
        return null;
    }
}

// Run the script
parseInvoicePDFs();
