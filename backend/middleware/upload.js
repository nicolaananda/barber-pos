const multer = require('multer');
const path = require('path');

// Storage Configuration - Use Memory Storage for R2 Uploads
const storage = multer.memoryStorage();

// File Filter (Images Only) - Lenient for compressed images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    // Allow if extension is valid OR mimetype is valid
    // This handles compressed images where mimetype might be missing
    if (extname || mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'));
    }
};

// Content Validator - Check file magic bytes to prevent malicious uploads
const validateImageContent = (buffer) => {
    // Check file magic bytes (file signatures)
    const magicBytes = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46] // RIFF (WebP container)
    };

    // Check if buffer starts with valid image magic bytes
    for (const [type, bytes] of Object.entries(magicBytes)) {
        if (bytes.every((byte, index) => buffer[index] === byte)) {
            return true;
        }
    }

    // Additional check: reject files containing PHP tags
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    if (content.includes('<?php') || content.includes('<?=')) {
        console.warn('⚠️ Blocked malicious file upload attempt (PHP code detected)');
        return false;
    }

    return false;
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

module.exports = upload;
module.exports.validateImageContent = validateImageContent;
