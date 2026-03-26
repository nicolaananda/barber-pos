const { format } = require('date-fns');
const fs = require('fs').promises;
const pdfGenerator = require('./pdf-generator');
const { Blob } = require('buffer');

const WA_GATEWAY_URL = process.env.WA_GATEWAY_URL || 'http://localhost:3000';
const WA_DEVICE_ID = process.env.WA_DEVICE_ID || '';
const WA_GATEWAY_USER = process.env.WA_GATEWAY_USER || '';
const WA_GATEWAY_PASS = process.env.WA_GATEWAY_PASS || '';

// Helper to generate Basic Auth header
const getAuthHeader = () => {
    if (WA_GATEWAY_USER && WA_GATEWAY_PASS) {
        const token = Buffer.from(`${WA_GATEWAY_USER}:${WA_GATEWAY_PASS}`).toString('base64');
        return { 'Authorization': `Basic ${token}` };
    }
    return {};
};

// API Key might not be needed for internal Go-WA, or user can set WA_DEVICE_KEY if they use Basic Auth.
// Go-WA often uses Basic Auth if configured. Assuming simple setup for now or header based.
const WAHA_API_KEY = process.env.WAHA_API_KEY || ''; // Keep for compatibility if user reuses it, but mostly unused.

/**
 * Format phone number to WhatsApp format (628xxx)
 * Accepts: 08xxx, 628xxx, +628xxx
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.substring(1);
    }
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
    message += `Jl. Imam Bonjol  No.370 (Pertigaan Kodim 0809)\n`;
    message += `Ngadirejo, Kota Kediri\n`;
    message += `📞 0877-7099-5270\n\n`;
    message += `Terima kasih atas kunjungan Anda! 🙏\n`;
    message += `Follow us: @staycoolhair_lab`;

    return message;
}

/**
 * 🔄 Retry helper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (result.success) return result;

            // If not success but not last attempt, retry
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                        await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Last attempt failed
            return result;
        } catch (error) {
            if (attempt === maxRetries) {
                return { success: false, error: error.message };
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Send WhatsApp text message via Go-WA API (with retry)
 */
async function sendWhatsAppMessage(phoneNumber, message) {
    return retryWithBackoff(async () => {
        try {
            const formattedPhone = formatPhoneNumber(phoneNumber);
            if (!formattedPhone) throw new Error('Invalid phone number');

            const payload = {
                phone: formattedPhone,
                message: message
            };


            const response = await fetch(`${WA_GATEWAY_URL}/send/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': WA_DEVICE_ID,
                    ...getAuthHeader()
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to send message');
            }

            return { success: true, data };
        } catch (error) {
            console.error('WhatsApp Send Error:', error.message);
            throw error; // Let retry handler catch it
        }
    }, 3, 1000); // 3 retries, starting with 1 second delay
}

/**
 * Send file via WhatsApp (Go-WA API)
 */
async function sendWhatsAppFile(phoneNumber, filepath, caption = '') {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!formattedPhone) throw new Error('Invalid phone number');

        const fileBuffer = await fs.readFile(filepath);
        const filename = filepath.split('/').pop();

        const formData = new FormData();
        formData.append('phone', formattedPhone);
        formData.append('caption', caption);
        // 'file' is the field name expected by typical go-whatsapp implementations or 'image'
        // Plan said /send/file, usually expects 'file'.
        formData.append('file', new Blob([fileBuffer]), filename);


        const response = await fetch(`${WA_GATEWAY_URL}/send/file`, {
            method: 'POST',
            headers: {
                'X-Device-Id': WA_DEVICE_ID,
                ...getAuthHeader()
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to send file');
        }

        return { success: true, data };
    } catch (error) {
        console.error('WhatsApp Send File Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send invoice via WhatsApp as PDF link
 * Note: Keeping this as fallback or primary if file upload fails, 
 * but Go-WA supports file upload so we can use sendWhatsAppFile if we wanted to attach PDF directly.
 * For now, I'll keep the link logic but maybe switch to file upload if desired?
 * The original code sent a LINK. Let's keep sending LINK to avoid file size issues, 
 * unless user explicitly asked to send the FILE. 
 * Wait, existing code uses sendWhatsAppMessage for link. 
 * I will keep it as is (sending Link) since it's reliable.
 */
async function sendInvoice(transaction, barberName, cashReceived = 0) {
    if (!transaction.customerPhone) {
        return { success: false, error: 'Customer phone number not available' };
    }

    try {
        const pdfUrl = await pdfGenerator.generateInvoicePDF(transaction, barberName, cashReceived);

        const message = `🧾 *INVOICE STAYCOOL HAIRLAB*\n\n` +
            `📋 Invoice: *${transaction.invoiceCode}*\n` +
            `💰 Total: *Rp ${transaction.totalAmount.toLocaleString('id-ID')}*\n\n` +
            `📄 Lihat invoice lengkap di:\n${pdfUrl}\n\n` +
            `Terima kasih atas kunjungan Anda! 🙏`;

        const result = await sendWhatsAppMessage(transaction.customerPhone, message);
        return result;
    } catch (error) {
        console.error('Send Invoice Error:', error);
        return { success: false, error: error.message || 'Failed to send invoice' };
    }
}

module.exports = {
    formatPhoneNumber,
    generateInvoiceMessage,
    sendWhatsAppMessage,
    sendWhatsAppFile,
    sendInvoice
};
