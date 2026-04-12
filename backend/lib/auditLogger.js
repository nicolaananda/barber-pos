const fs = require('fs');
const path = require('path');

const AUDIT_LOG_DIR = path.join(__dirname, '../logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

if (!fs.existsSync(AUDIT_LOG_DIR)) {
    fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

function logAudit(action, userId, details = {}) {
    const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        action,
        userId,
        details
    }) + '\n';
    fs.promises.appendFile(AUDIT_LOG_FILE, entry).catch(err => {
        console.error('Audit log write error:', err);
    });
}

module.exports = { logAudit };
