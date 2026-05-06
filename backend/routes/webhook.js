const express = require('express');
const router = express.Router();
const gowaAdapter = require('../lib/gowa-adapter');

router.post('/', (req, res) => {
    try {
        const secret = process.env.WA_WEBHOOK_SECRET;
        const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];

        if (!secret) {
            console.error('[Webhook] WA_WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Webhook not configured' });
        }
        if (!incomingSecret || incomingSecret !== secret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = req.body;
        const eventType = payload?.event || payload?.type || 'unknown';

        switch (eventType) {
            case 'message': {
                const baileysMessage = gowaAdapter.handleWebhook(payload);
                if (baileysMessage) {
                    if (baileysMessage.key.fromMe) break;

                    console.log('[Webhook] Incoming message from:', baileysMessage.pushName, '|', baileysMessage.key.remoteJid);

                    if (router.onMessage) {
                        router.onMessage(baileysMessage);
                    }
                }
                break;
            }

            case 'message.any': {
                const baileysMessage = gowaAdapter.handleWebhook(payload);
                if (baileysMessage && !baileysMessage.key.fromMe) {
                    console.log('[Webhook] Incoming message from:', baileysMessage.pushName, '|', baileysMessage.key.remoteJid);
                    if (router.onMessage) {
                        router.onMessage(baileysMessage);
                    }
                }
                break;
            }

            case 'message.ack':
                break;

            case 'session.status':
                if (payload?.payload?.status === 'STOPPED') {
                    console.error('[Webhook] WhatsApp session disconnected:', payload?.payload);
                }
                break;

            default:
                break;
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('[Webhook] Error:', error.message);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
