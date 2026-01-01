const express = require('express');
const router = express.Router();

// POST /api/webhook - Receive webhook events from Go-WA
router.post('/', (req, res) => {
    try {
        const secret = process.env.WA_WEBHOOK_SECRET;

        // Basic verification (adjust header name based on actual Go-WA behavior)
        // Commonly passed in headers
        const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];

        // If secret is configured but not provided or non-matching
        if (secret && (!incomingSecret || incomingSecret !== secret)) {
            console.warn('Webhook Unauthorized: Invalid Secret');
            // return res.status(401).json({ error: 'Unauthorized' }); 
            // Commented out to prevent blocking until we confirm the exact header name from logs
        }

        const payload = req.body;
        console.log('Received Webhook Event:', JSON.stringify(payload, null, 2));
        console.log('Webhook Headers:', req.headers);

        // TODO: specific event handling if needed (e.g., incoming messages)

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
