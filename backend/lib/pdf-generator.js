const puppeteer = require('puppeteer');
const { format } = require('date-fns');
const path = require('path');
const fs = require('fs').promises;

/**
 * Load and convert logo to base64
 */
async function getLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../logo.jpg');
        const logoBuffer = await fs.readFile(logoPath);
        return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Failed to load logo:', error.message);
        return null;
    }
}

/**
 * Generate invoice HTML (same as print invoice)
 */
function generateInvoiceHTML(transaction, barberName, cashReceived = 0, logoBase64 = null) {
    const changeAmount = cashReceived > 0 ? cashReceived - transaction.totalAmount : 0;

    return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Receipt ${transaction.invoiceCode}</title>
            <style>
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: white; }
              .container { width: 100%; max-width: 80mm; margin: 0 auto; padding: 10px; box-sizing: border-box; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .bold { font-weight: bold; }
              .mb-1 { margin-bottom: 5px; }
              .mb-2 { margin-bottom: 10px; }
              .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
              .border-t { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
              .row { display: flex; justify-content: space-between; width: 100%; }
              .col { display: flex; flex-direction: column; }
              .logo { width: 50px; height: 50px; border-radius: 50%; display: block; margin: 0 auto 5px; object-fit: cover; filter: grayscale(100%); }
              
              .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
              .item-name { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .item-qty { margin-right: 5px; font-size: 10px; }
              .item-price { flex: 1; text-align: right; }
            </style>
          </head>
          <body>
            <div class="container">
                <div class="text-center mb-2">
                    ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
                    <h2 style="margin:0; font-size: 16px; text-transform: uppercase;">Staycool Hairlab</h2>
                    <p style="margin:2px 0; font-size: 10px;">Jl. Imam Bonjol Pertigaan No.370</p>
                    <p style="margin:0; font-size: 10px;">Ngadirejo, Kota Kediri</p>
                    <p style="margin:2px 0; font-size: 10px;">0877-7099-5270</p>
                </div>

                <div class="border-b"></div>

                <div class="mb-2" style="font-size: 11px;">
                    <div class="row"><span>Invoice</span> <span class="bold">${transaction.invoiceCode}</span></div>
                    <div class="row"><span>Date</span> <span>${format(new Date(transaction.date || new Date()), 'dd/MM/yyyy HH:mm')}</span></div>
                    <div class="row"><span>Barber</span> <span>${barberName}</span></div>
                    ${transaction.customerName ? `<div class="row"><span>Cust</span> <span>${transaction.customerName}</span></div>` : ''}
                </div>

                <div class="border-b"></div>

                <div class="mb-2">
                    ${transaction.items.map(item => `
                    <div class="item-row">
                        <span class="item-name"><span class="item-qty">${item.qty}x</span> ${item.name}</span>
                        <span class="item-price">${(item.price * item.qty).toLocaleString('id-ID')}</span>
                    </div>
                    `).join('')}
                </div>

                <div class="border-t">
                    <div class="row bold" style="font-size: 14px; margin-top: 5px;">
                        <span>TOTAL</span>
                        <span>IDR ${transaction.totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="row" style="margin-top: 5px; font-size: 11px;">
                        <span>Payment</span>
                        <span style="text-transform: uppercase;">${transaction.paymentMethod}</span>
                    </div>
                    ${transaction.paymentMethod === 'cash' && cashReceived > 0 ? `
                    <div class="row" style="font-size: 11px;">
                       <span>Cash</span>
                       <span>IDR ${cashReceived.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="row" style="font-size: 11px;">
                       <span>Change</span>
                       <span>IDR ${changeAmount.toLocaleString('id-ID')}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="text-center" style="margin-top: 20px; font-size: 10px;">
                    <p style="margin-bottom: 5px;">Thank you for coming!</p>
                    <p>Follow us on Instagram<br>@staycool_hairlab</p>
                </div>
            </div>
          </body>
        </html>
    `;
}

/**
 * Generate PDF from transaction data
 */
async function generateInvoicePDF(transaction, barberName, cashReceived = 0) {
    try {
        // Load logo
        const logoBase64 = await getLogoBase64();

        // Generate HTML
        const html = generateInvoiceHTML(transaction, barberName, cashReceived, logoBase64);

        // Use html-pdf-node (lighter, no Chrome needed)
        const htmlPdf = require('html-pdf-node');

        const options = {
            format: 'A4',
            width: '80mm',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        };

        const file = { content: html };

        // Generate PDF
        const pdfBuffer = await htmlPdf.generatePdf(file, options);

        return pdfBuffer;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}

/**
 * Save PDF to public invoices directory
 */
async function savePDFToPublic(pdfBuffer, invoiceCode) {
    const publicDir = path.join(__dirname, '../../frontend/public/invoices');

    // Create directory if it doesn't exist
    try {
        await fs.mkdir(publicDir, { recursive: true });
    } catch (error) {
        // Directory might already exist
    }

    const filename = `${invoiceCode}.pdf`;
    const filepath = path.join(publicDir, filename);

    await fs.writeFile(filepath, pdfBuffer);

    return { filepath, filename };
}

/**
 * Delete temporary file
 */
async function deleteTempFile(filepath) {
    try {
        await fs.unlink(filepath);
    } catch (error) {
        console.error('Failed to delete temp file:', error.message);
    }
}

module.exports = {
    getLogoBase64,
    generateInvoiceHTML,
    generateInvoicePDF,
    savePDFToPublic,
    deleteTempFile
};
