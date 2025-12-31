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
                size: [227, 300], // 80mm width, arbitrary long height
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
            doc.addPage({ margin: 10, size: [227, 300] });

            // Font settings
            doc.font('Courier');
            doc.fontSize(9);

            // LOGO
            const logoPath = path.join(__dirname, '../../logo.jpg');
            if (fs.existsSync(logoPath)) {
                // Center logo: (227 - 50) / 2 = 88.5
                const logoX = 88.5;
                const logoY = 15;
                const logoSize = 50;

                doc.save();
                doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).clip();
                doc.image(logoPath, logoX, logoY, { width: logoSize });
                doc.restore();

                doc.moveDown(6.5); // Move past logo (50px / ~12 font-height)
            } else {
                doc.moveDown(5);
            }

            // HEADER
            // Width 207 (227 - 20) ensures center is relative to printable area
            doc.fontSize(11).font('Courier-Bold').text('STAYCOOL HAIRLAB', 10, doc.y, { width: 207, align: 'center' });
            doc.fontSize(8).font('Courier').text('Jl. Imam Bonjol Pertigaan No.370', 10, doc.y, { width: 207, align: 'center' });
            doc.text('Ngadirejo, Kota Kediri', 10, doc.y, { width: 207, align: 'center' });
            doc.text('0877-7099-5270', 10, doc.y, { width: 207, align: 'center' });
            doc.moveDown(0.5);

            // DIVIDER
            drawDivider(doc);
            doc.moveDown(0.5);

            // INFO
            const dateStr = format(new Date(transaction.date || new Date()), 'dd/MM/yyyy HH:mm');

            drawMetadataRow(doc, 'Invoice', transaction.invoiceCode, true);
            drawMetadataRow(doc, 'Date', dateStr);
            drawMetadataRow(doc, 'Barber', barberName);
            if (transaction.customerName) {
                drawMetadataRow(doc, 'Cust', transaction.customerName);
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
                drawItemRow(doc, itemText, total.toLocaleString('id-ID'));
            });
            doc.moveDown(0.5);

            // DIVIDER
            drawDivider(doc);
            doc.moveDown(0.5);

            // TOTALS
            doc.fontSize(11).font('Courier-Bold');
            drawTotalRow(doc, 'TOTAL', 'IDR ' + transaction.totalAmount.toLocaleString('id-ID'));

            doc.fontSize(9).font('Courier');
            drawTotalRow(doc, 'Payment', transaction.paymentMethod.toUpperCase());

            const changeAmount = cashReceived > 0 ? cashReceived - transaction.totalAmount : 0;
            if (transaction.paymentMethod === 'cash' && cashReceived > 0) {
                drawTotalRow(doc, 'Cash', 'IDR ' + cashReceived.toLocaleString('id-ID'));
                drawTotalRow(doc, 'Change', 'IDR ' + changeAmount.toLocaleString('id-ID'));
            }

            doc.moveDown(2);

            // FOOTER
            doc.fontSize(8).text('Thank you for coming!', 10, doc.y, { width: 207, align: 'center' });
            doc.text('Follow us on Instagram', 10, doc.y, { width: 207, align: 'center' });
            doc.text('@staycool_hairlab', 10, doc.y, { width: 207, align: 'center' });

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


// Draw Metadata (Left narrow, Right wide)
// Left: 80pt, Right: 127pt
// Draw Metadata (Left narrow, Right wide)
// Left: 80pt, Right: 127pt
function drawMetadataRow(doc, key, value, boldValue = false) {
    const startY = doc.y;

    // Draw Left
    doc.text(key, 10, startY, { width: 80, align: 'left' });
    const yAfterLeft = doc.y;

    // Reset Y for Right column
    doc.y = startY;

    // Draw Right
    if (boldValue) doc.font('Courier-Bold');
    doc.text(value, 90, startY, { width: 127, align: 'right' });
    const yAfterRight = doc.y;
    if (boldValue) doc.font('Courier');

    // Move to max Y
    doc.y = Math.max(yAfterLeft, yAfterRight);
}

// Draw Item (Left wide, Right narrow)
// Left: 140pt, Right: 67pt
function drawItemRow(doc, key, value) {
    const startY = doc.y;

    // Draw Left
    doc.text(key, 10, startY, { width: 140, align: 'left' });
    const yAfterLeft = doc.y;

    // Reset Y for Right column
    doc.y = startY;

    // Draw Right
    doc.text(value, 150, startY, { width: 67, align: 'right' });
    const yAfterRight = doc.y;

    doc.y = Math.max(yAfterLeft, yAfterRight);
}

// Draw Total (Balanced)
// Left: 100pt, Right: 107pt
function drawTotalRow(doc, key, value) {
    const startY = doc.y;

    // Draw Left
    doc.text(key, 10, startY, { width: 100, align: 'left' });
    const yAfterLeft = doc.y;

    // Reset Y for Right column
    doc.y = startY;

    // Draw Right
    doc.text(value, 110, startY, { width: 107, align: 'right' });
    const yAfterRight = doc.y;

    doc.y = Math.max(yAfterLeft, yAfterRight);
}

module.exports = {
    generateInvoicePDF,
    savePDFToPublic,
    deleteTempFile
};
