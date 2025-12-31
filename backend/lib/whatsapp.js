const axios = require('axios');
const { format } = require('date-fns');
const fs = require('fs').promises;
const pdfGenerator = require('./pdf-generator');

const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';

/**
 * Format phone number to WhatsApp format (628xxx)
 * Accepts: 08xxx, 628xxx, +628xxx
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Convert 08xxx to 628xxx
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.substring(1);
    }

    // Ensure it starts with 62
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }

    return cleaned;
}

/**
 * Generate invoice message for WhatsApp
 */
function generateInvoiceMessage(transaction, barberName) {
    const date = format(new Date(transaction.date), 'dd/MM/yyyy HH:mm');

    let message = `🧾 *INVOICE STAYCOOL HAIRLAB*\n\n`;
    message += `📋 Invoice: *${transaction.invoiceCode}*\n`;
    message += `📅 Tanggal: ${date}\n`;
    message += `✂️ Barber: ${barberName}\n`;

    if (transaction.customerName) {
        message += `👤 Customer: ${transaction.customerName}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `*DETAIL LAYANAN*\n\n`;

    // Items
    transaction.items.forEach((item, index) => {
        const subtotal = item.price * item.qty;
        message += `${index + 1}. ${item.name}\n`;
        message += `   ${item.qty}x @ Rp ${item.price.toLocaleString('id-ID')}\n`;
        message += `   Subtotal: Rp ${subtotal.toLocaleString('id-ID')}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *TOTAL: Rp ${transaction.totalAmount.toLocaleString('id-ID')}*\n`;
    message += `💳 Pembayaran: ${transaction.paymentMethod.toUpperCase()}\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📍 Staycool Hairlab\n`;
    message += `Jl. Imam Bonjol Pertigaan No.370\n`;
    message += `Ngadirejo, Kota Kediri\n`;
    message += `📞 0877-7099-5270\n\n`;
    message += `Terima kasih atas kunjungan Anda! 🙏\n`;
    message += `Follow us: @staycool_hairlab`;

    return message;
}

/**
 * Send WhatsApp message via WAHA API
 */
async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);

        if (!formattedPhone) {
            throw new Error('Invalid phone number');
        }

        const chatId = `${formattedPhone}@c.us`;

        console.log('Sending WhatsApp message:', {
            wahaUrl: WAHA_URL,
            session: WAHA_SESSION,
            chatId: chatId,
            phoneNumber: phoneNumber,
            formattedPhone: formattedPhone
        });

        const response = await axios.post(
            `${WAHA_URL}/api/sendText`,
            {
                session: WAHA_SESSION,
                chatId: chatId,
                text: message
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(WAHA_API_KEY && { 'X-Api-Key': WAHA_API_KEY })
                },
                timeout: 10000 // 10 second timeout
            }
        );

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('WhatsApp Send Error Details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });

        let errorMessage = 'Failed to send WhatsApp message';

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to WhatsApp service. Check WAHA_URL in .env';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'WhatsApp service URL not found. Check WAHA_URL in .env';
        } else if (error.response) {
            // Server responded with error
            const responseError = error.response.data?.error || error.response.data?.message;
            errorMessage = responseError || `Server error: ${error.response.status} ${error.response.statusText}`;
        } else if (error.request) {
            errorMessage = 'No response from WhatsApp service. Is WAHA running?';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Send file via WhatsApp
 */
async function sendWhatsAppFile(phoneNumber, filepath, caption = '') {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);

        if (!formattedPhone) {
            throw new Error('Invalid phone number');
        }

        const chatId = `${formattedPhone}@c.us`;

        // Read file and convert to base64
        const fileBuffer = await fs.readFile(filepath);
        const base64File = fileBuffer.toString('base64');
        const filename = filepath.split('/').pop();

        console.log('Sending WhatsApp file:', {
            wahaUrl: WAHA_URL,
            session: WAHA_SESSION,
            chatId: chatId,
            filename: filename
        });

        const response = await axios.post(
            `${WAHA_URL}/api/sendFile`,
            {
                session: WAHA_SESSION,
                chatId: chatId,
                file: {
                    mimetype: 'application/pdf',
                    filename: filename,
                    data: base64File
                },
                caption: caption
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(WAHA_API_KEY && { 'X-Api-Key': WAHA_API_KEY })
                },
                timeout: 30000 // 30 second timeout for file upload
            }
        );

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('WhatsApp Send File Error Details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });

        let errorMessage = 'Failed to send WhatsApp file';

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to WhatsApp service. Check WAHA_URL in .env';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'WhatsApp service URL not found. Check WAHA_URL in .env';
        } else if (error.response) {
            const responseError = error.response.data?.error || error.response.data?.message;
            errorMessage = responseError || `Server error: ${error.response.status} ${error.response.statusText}`;
        } else if (error.request) {
            errorMessage = 'No response from WhatsApp service. Is WAHA running?';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Send invoice via WhatsApp as PDF link
 */
async function sendInvoice(transaction, barberName, cashReceived = 0) {
    if (!transaction.customerPhone) {
        return {
            success: false,
            error: 'Customer phone number not available'
        };
    }

    try {
        // Generate PDF
        console.log('Generating PDF for invoice:', transaction.invoiceCode);
        const pdfBuffer = await pdfGenerator.generateInvoicePDF(transaction, barberName, cashReceived);

        // Save to public directory
        const filePath = await pdfGenerator.savePDFToPublic(pdfBuffer, transaction.invoiceCode);
        const filename = `${transaction.invoiceCode}.pdf`; // or path.basename(filePath)
        console.log('PDF saved to public/invoices:', filename);

        // Generate link (assuming frontend is served from same domain)
        const pdfLink = `${process.env.FRONTEND_URL || 'http://localhost:7763'}/invoices/${filename}`;

        // Create message with link
        const message = `🧾 *INVOICE STAYCOOL HAIRLAB*\n\n` +
            `📋 Invoice: *${transaction.invoiceCode}*\n` +
            `💰 Total: *Rp ${transaction.totalAmount.toLocaleString('id-ID')}*\n\n` +
            `📄 Lihat invoice lengkap di:\n${pdfLink}\n\n` +
            `Terima kasih atas kunjungan Anda! 🙏`;

        // Send via WhatsApp
        const result = await sendWhatsAppMessage(transaction.customerPhone, message);

        return result;
    } catch (error) {
        console.error('Send Invoice Error:', error);

        return {
            success: false,
            error: error.message || 'Failed to send invoice'
        };
    }
}

module.exports = {
    formatPhoneNumber,
    generateInvoiceMessage,
    sendWhatsAppMessage,
    sendWhatsAppFile,
    sendInvoice
};
