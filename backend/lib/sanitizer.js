const validator = require('validator');

/**
 * 🔒 SECURITY: Sanitize and validate user inputs
 */

// Sanitize text input (prevent XSS)
const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') return '';

    // Remove HTML tags and trim
    return validator.escape(text.trim());
};

// Validate and sanitize Indonesian phone number
const sanitizePhone = (phone) => {
    if (!phone || typeof phone !== 'string') return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('62')) {
        // +62 format
        cleaned = '0' + cleaned.slice(2);
    } else if (cleaned.startsWith('0')) {
        // Already in 08xxx format
        // Keep as is
    } else {
        // Invalid format
        return null;
    }

    // Validate Indonesian mobile number pattern
    // Must be: 08 followed by 8-11 digits (total 10-13 digits)
    if (!/^08\d{8,11}$/.test(cleaned)) {
        return null;
    }

    return cleaned;
};

// Validate Indonesian phone number (strict)
const isValidIndonesianPhone = (phone) => {
    const sanitized = sanitizePhone(phone);
    if (!sanitized) return false;

    // Check if it's a valid Indonesian operator prefix
    const validPrefixes = [
        '0811', '0812', '0813', '0814', '0815', '0816', '0817', '0818', '0819', // Telkomsel
        '0821', '0822', '0823', // Telkomsel
        '0851', '0852', '0853', // Telkomsel
        '0895', '0896', '0897', '0898', '0899', // Three
        '0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889', // Smartfren
        '0831', '0832', '0833', '0838', // Axis
        '0859', // XL
        '0877', '0878', // XL
        '0856', '0857', '0858', // Indosat
    ];

    // Check if starts with any valid prefix
    return validPrefixes.some(prefix => sanitized.startsWith(prefix));
};

module.exports = {
    sanitizeText,
    sanitizePhone,
    isValidIndonesianPhone
};
