const express = require('express');
const router = express.Router();

// POST /api/webhook - Receive webhook events from Go-WA
router.post('/', (req, res) => {
    try {
        const payload = req.body;
        console.log('Received Webhook Event:', JSON.stringify(payload, null, 2));

        // TODO: specific event handling if needed (e.g., incoming messages)

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
