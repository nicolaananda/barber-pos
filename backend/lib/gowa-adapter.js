/**
 * Gowa v8.5.0 Webhook Adapter
 * 
 * Converts Gowa webhook payloads to Baileys-compatible message format.
 * Handles the v8.5.0 payload structure: { event, device_id, payload: {...} }
 */

class GowaAdapter {
    constructor() {
        this._messageCounter = 0;
    }

    /**
     * Main webhook handler - entry point for all Gowa webhook events
     */
    handleWebhook(webhookData) {
        try {
            // Gowa v8.5.0+ wraps data in { event, device_id, payload: {...} }
            if (webhookData.event && webhookData.payload) {
                if (webhookData.event !== 'message') {
                    console.log('[GOWA-ADAPTER] Non-message event, skipping:', webhookData.event);
                    return null;
                }
                webhookData = webhookData.payload;
            }

            // Convert Gowa webhook to Baileys message format
            const baileysMessage = this._convertToBaileysFormat(webhookData);

            if (!baileysMessage) {
                console.warn('[GOWA-ADAPTER] Failed to convert webhook data');
                return null;
            }

            return baileysMessage;
        } catch (error) {
            console.error('[GOWA-ADAPTER] Webhook handling error:', error.message);
            return null;
        }
    }

    /**
     * Convert Gowa webhook payload to Baileys message format
     */
    _convertToBaileysFormat(webhookData) {
        try {
            let remoteJid = webhookData.chat_id ||
                webhookData.from ||
                webhookData.chat ||
                (webhookData.message && (webhookData.message.from || webhookData.message.chat || webhookData.message.jid));

            const messageContent = webhookData.message || webhookData;
            const messageId = webhookData.id || (messageContent && (messageContent.id || messageContent.messageId)) || this._generateMessageId();

            const fromMe = webhookData.is_from_me || webhookData.fromMe || (messageContent && (messageContent.is_from_me || messageContent.fromMe)) || false;

            let participant = webhookData.participant || (messageContent && messageContent.participant);

            // Group messages: chat_id is group, from is sender
            if (remoteJid && remoteJid.endsWith('@g.us') && webhookData.from && webhookData.from !== remoteJid) {
                participant = webhookData.from;
            }

            // Handle "sender in group" format (e.g. "628xxx@s.whatsapp.net in 123xxx@g.us")
            if (typeof remoteJid === 'string' && remoteJid.includes(' in ')) {
                const parts = remoteJid.split(' in ');
                if (parts.length === 2) {
                    participant = parts[0];
                    remoteJid = parts[1];
                }
            }

            return {
                key: {
                    remoteJid: this._formatJid(remoteJid),
                    fromMe: fromMe,
                    id: messageId,
                    participant: participant ? this._formatJid(participant) : undefined
                },
                message: this._buildMessageContent(messageContent),
                messageTimestamp: messageContent.timestamp || Math.floor(Date.now() / 1000),
                pushName: webhookData.from_name || messageContent.pushName || messageContent.senderName || 'Unknown'
            };
        } catch (error) {
            console.error('[GOWA-ADAPTER] Message conversion error:', error.message);
            return null;
        }
    }

    /**
     * Build Baileys-compatible message content from Gowa payload
     * Supports both v8.5.0 (image/video/audio/document/sticker) and legacy (imageMessage/videoMessage/etc)
     */
    _buildMessageContent(message) {
        const content = {};

        if (message.text || message.body) {
            content.conversation = message.text || message.body;
        } else if (message.image) {
            content.imageMessage = typeof message.image === 'object'
                ? { url: message.image.path || message.image.url, caption: message.image.caption || message.body || '' }
                : { url: message.image, caption: message.body || '' };
        } else if (message.video) {
            content.videoMessage = typeof message.video === 'object'
                ? { url: message.video.path || message.video.url, caption: message.video.caption || message.body || '' }
                : { url: message.video, caption: message.body || '' };
        } else if (message.document) {
            content.documentMessage = typeof message.document === 'object'
                ? { url: message.document.path || message.document.url, fileName: message.document.filename || '', caption: message.document.caption || message.body || '' }
                : { url: message.document, caption: message.body || '' };
        } else if (message.audio) {
            content.audioMessage = typeof message.audio === 'object'
                ? { url: message.audio.path || message.audio.url }
                : { url: message.audio };
        } else if (message.sticker) {
            content.stickerMessage = typeof message.sticker === 'object'
                ? { url: message.sticker.path || message.sticker.url }
                : { url: message.sticker };
        } else if (message.imageMessage) {
            content.imageMessage = message.imageMessage;
        } else if (message.videoMessage) {
            content.videoMessage = message.videoMessage;
        } else if (message.documentMessage) {
            content.documentMessage = message.documentMessage;
        } else if (message.audioMessage) {
            content.audioMessage = message.audioMessage;
        } else if (message.stickerMessage) {
            content.stickerMessage = message.stickerMessage;
        }

        return content;
    }

    /**
     * Format JID to standard WhatsApp format
     */
    _formatJid(jid) {
        if (!jid) return '';

        // Already formatted
        if (jid.includes('@')) return jid;

        // Phone number without suffix - assume personal chat
        const cleaned = jid.replace(/\D/g, '');
        return `${cleaned}@s.whatsapp.net`;
    }

    /**
     * Generate a unique message ID
     */
    _generateMessageId() {
        this._messageCounter++;
        return `GOWA_${Date.now()}_${this._messageCounter}`;
    }
}

module.exports = new GowaAdapter();
