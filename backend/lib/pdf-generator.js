const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const path = require('path');
const fs = require('fs');

/**
 * Generate PDF from transaction data using PDFKit
 * (Pure Node.js solution, no external dependencies like Chrome)
 */
async function generateInvoicePDF(transaction, barberName, cashReceived = 0) {
    return new Promise((resolve, reject) => {
        try {
            // Receipt width: 80mm approx 227 points
            // Manage height dynamically? PDFKit adds pages automatically.
            // We'll use a continuous roll-like size or just standard page. 
            // For simple PDF viewing, a single long page is often preferred for receipts.
            // Let's estimate height or use auto-pagination.

            const doc = new PDFDocument({
                size: [227, 800], // 80mm width, arbitrary long height
                margin: 10,
                autoFirstPage: false
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Start page
            doc.addPage({ margin: 10, size: [227, 800] });

            // Font settings
            doc.font('Courier');
            doc.fontSize(9);

            // LOGO
            const logoPath = path.join(__dirname, '../../logo.jpg');
            if (fs.existsSync(logoPath)) {
                // Center logo: (227 - 50) / 2 = 88.5
                doc.image(logoPath, 88, 15, { width: 50 });
                doc.moveDown(4.5); // Move past logo (50px / ~12 font-height)
            } else {
                doc.moveDown(1);
            }

            // HEADER
            doc.fontSize(11).font('Courier-Bold').text('STAYCOOL HAIRLAB', { align: 'center' });
            doc.fontSize(8).font('Courier').text('Jl. Imam Bonjol Pertigaan No.370', { align: 'center' });
            doc.text('Ngadirejo, Kota Kediri', { align: 'center' });
            doc.text('0877-7099-5270', { align: 'center' });
            doc.moveDown(0.5);

            // DIVIDER
            drawDivider(doc);
            doc.moveDown(0.5);

            // INFO
            const dateStr = format(new Date(transaction.date || new Date()), 'dd/MM/yyyy HH:mm');

            drawRow(doc, 'Invoice', transaction.invoiceCode, true);
            drawRow(doc, 'Date', dateStr);
            drawRow(doc, 'Barber', barberName);
            if (transaction.customerName) {
                drawRow(doc, 'Cust', transaction.customerName);
            }
            doc.moveDown(0.5);

            // DIVIDER
            drawDivider(doc);
            doc.moveDown(0.5);

            // ITEMS
            transaction.items.forEach(item => {
                const total = item.price * item.qty;
                // Left: "1x Item Name"
                // Right: "20.000"
                const itemText = item.qty + 'x ' + item.name;
                drawRow(doc, itemText, total.toLocaleString('id-ID'));
            });
            doc.moveDown(0.5);

            // DIVIDER
            drawDivider(doc);
            doc.moveDown(0.5);

            // TOTALS
            doc.fontSize(11).font('Courier-Bold');
            drawRow(doc, 'TOTAL', 'IDR ' + transaction.totalAmount.toLocaleString('id-ID'));

            doc.fontSize(9).font('Courier');
            drawRow(doc, 'Payment', transaction.paymentMethod.toUpperCase());

            const changeAmount = cashReceived > 0 ? cashReceived - transaction.totalAmount : 0;
            if (transaction.paymentMethod === 'cash' && cashReceived > 0) {
                drawRow(doc, 'Cash', 'IDR ' + cashReceived.toLocaleString('id-ID'));
                drawRow(doc, 'Change', 'IDR ' + changeAmount.toLocaleString('id-ID'));
            }

            doc.moveDown(2);

            // FOOTER
            doc.fontSize(8).text('Thank you for coming!', { align: 'center' });
            doc.text('Follow us on Instagram', { align: 'center' });
            doc.text('@staycool_hairlab', { align: 'center' });

            // Finalize PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// Helper to draw dashed divider
function drawDivider(doc) {
    const y = doc.y;
    doc.dash(3, { space: 2 })
        .moveTo(10, y)
        .lineTo(217, y)
        .stroke()
        .undash(); // Reset dash
}

// Helper to draw a key-value row
// Helper to draw a key-value row
function drawRow(doc, key, value, boldValue = false) {
    const y = doc.y;
    // Left col: x=10, width=120
    doc.text(key, 10, y, { width: 120, continued: true });

    if (boldValue) doc.font('Courier-Bold');

    // Right col: x=130, width=87 (Right aligned within this box ending at 217)
    doc.text(value, 130, y, { width: 87, align: 'right' });

    if (boldValue) doc.font('Courier');
}

/**
 * Save PDF buffer to public directory
 */
const savePDFToPublic = async (pdfBuffer, invoiceCode) => {
    try {
        const publicDir = path.join(__dirname, '../../frontend/public/invoices');
        // Ensure directory exists
        await fs.promises.mkdir(publicDir, { recursive: true });

        const filePath = path.join(publicDir, invoiceCode + '.pdf');
        await fs.promises.writeFile(filePath, pdfBuffer);

        return filePath;
    } catch (error) {
        throw new Error('Failed to save PDF: ' + error.message);
    }
};

/**
 * Delete temp file (not used anymore but kept for compatibility)
 */
const deleteTempFile = async (filePath) => {
    // No-op
};

module.exports = {
    generateInvoicePDF,
    savePDFToPublic,
    deleteTempFile
};
