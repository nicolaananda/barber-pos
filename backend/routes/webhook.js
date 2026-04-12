const express = require('express');
const router = express.Router();

// POST /api/webhook - Receive webhook events from Go-WA
router.post('/', (req, res) => {
    try {
        const secret = process.env.WA_WEBHOOK_SECRET;
        const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];

        if (!secret) {
            console.error('❌ WA_WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Webhook not configured' });
        }
        if (!incomingSecret || incomingSecret !== secret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = req.body;
        const eventType = payload?.event || payload?.type || 'unknown';

        switch (eventType) {
            case 'message':
            case 'message.any':
                // Incoming message dari pelanggan — abaikan untuk sekarang
                break;

            case 'message.ack':
                // Delivery/read receipt — tidak perlu ditangani
                break;

            case 'session.status':
                // Status koneksi WA berubah
                if (payload?.payload?.status === 'STOPPED') {
                    console.error('[Webhook] Sesi WhatsApp terputus:', payload?.payload);
                }
                break;

            default:
                // Event tidak dikenal, abaikan
                break;
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('[Webhook] Error:', error.message);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
