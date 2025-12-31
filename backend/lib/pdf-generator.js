const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');
const { uploadFile } = require('./r2');
const path = require('path');

/**
 * Generate PDF from transaction data using PDFKit and upload to R2
 */
async function generateInvoicePDF(transaction, barberName, cashReceived = 0) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: [227, 300], // 80mm width
                margin: 10,
                autoFirstPage: false
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                try {
                    const pdfBuffer = Buffer.concat(buffers);
                    // Filename: invoice-INV-XXXX.pdf
                    const filename = `invoices/${transaction.invoiceCode}.pdf`;

                    // Upload to R2
                    const pdfUrl = await uploadFile(pdfBuffer, filename, 'application/pdf');
                    resolve(pdfUrl);
                } catch (err) {
                    reject(err);
                }
            });

            // Start page
            doc.addPage({ margin: 10, size: [227, 300] });

            // Font settings
            doc.font('Courier');
            doc.fontSize(9);

            // LOGO
            const logoPath = path.join(__dirname, '../../logo.jpg');
            // Try/Catch for logo implementation to ensure it doesn't crash if missing
            try {
                if (require('fs').existsSync(logoPath)) {
                    const logoX = 88.5;
                    const logoY = 15;
                    const logoSize = 50;

                    doc.save();
                    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).clip();
                    doc.image(logoPath, logoX, logoY, { width: logoSize });
                    doc.restore();

                    doc.moveDown(6.5);
                } else {
                    doc.moveDown(5);
                }
            } catch (e) {
                doc.moveDown(5);
            }

            // HEADER
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
            let items = transaction.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }
            if (!Array.isArray(items)) items = [];

            items.forEach(item => {
                const total = item.price * item.qty;
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
            drawTotalRow(doc, 'Payment', transaction.paymentMethod ? transaction.paymentMethod.toUpperCase() : 'CASH');

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
        .undash();
}

function drawMetadataRow(doc, key, value, boldValue = false) {
    const startY = doc.y;
    doc.text(key, 10, startY, { width: 80, align: 'left' });
    const yAfterLeft = doc.y;
    doc.y = startY;
    if (boldValue) doc.font('Courier-Bold');
    doc.text(value, 90, startY, { width: 127, align: 'right' });
    const yAfterRight = doc.y;
    if (boldValue) doc.font('Courier');
    doc.y = Math.max(yAfterLeft, yAfterRight);
}

function drawItemRow(doc, key, value) {
    const startY = doc.y;
    doc.text(key, 10, startY, { width: 140, align: 'left' });
    const yAfterLeft = doc.y;
    doc.y = startY;
    doc.text(value, 150, startY, { width: 67, align: 'right' });
    const yAfterRight = doc.y;
    doc.y = Math.max(yAfterLeft, yAfterRight);
}

function drawTotalRow(doc, key, value) {
    const startY = doc.y;
    doc.text(key, 10, startY, { width: 100, align: 'left' });
    const yAfterLeft = doc.y;
    doc.y = startY;
    doc.text(value, 110, startY, { width: 107, align: 'right' });
    const yAfterRight = doc.y;
    doc.y = Math.max(yAfterLeft, yAfterRight);
}

module.exports = {
    generateInvoicePDF
};
