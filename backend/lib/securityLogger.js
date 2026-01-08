const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Security event logger
 */
class SecurityLogger {
    constructor() {
        this.logFile = path.join(logsDir, 'security.log');
    }

    log(event, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event,
            ...details
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        // Append to log file
        fs.appendFileSync(this.logFile, logLine);

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔒 Security Event:', logEntry);
        }
    }

    logMaliciousUpload(filename, ip, mimetype) {
        this.log('MALICIOUS_UPLOAD_ATTEMPT', {
            filename,
            ip,
            mimetype,
            severity: 'HIGH'
        });
    }

    logUnauthorizedAccess(endpoint, ip, method) {
        this.log('UNAUTHORIZED_ACCESS', {
            endpoint,
            ip,
            method,
            severity: 'MEDIUM'
        });
    }

    logRateLimitExceeded(ip, endpoint) {
        this.log('RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint,
            severity: 'LOW'
        });
    }

    logSuspiciousActivity(description, details) {
        this.log('SUSPICIOUS_ACTIVITY', {
            description,
            ...details,
            severity: 'MEDIUM'
        });
    }

    logFailedLogin(username, ip) {
        this.log('FAILED_LOGIN', {
            username,
            ip,
            severity: 'MEDIUM'
        });
    }

    /**
     * Get recent security events
     */
    getRecentEvents(limit = 100) {
        try {
            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n');
            const events = lines
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            return events;
        } catch (error) {
            return [];
        }
    }

    /**
     * Get events by severity
     */
    getEventsBySeverity(severity, limit = 50) {
        const events = this.getRecentEvents(1000);
        return events
            .filter(e => e.severity === severity)
            .slice(-limit);
    }
}

module.exports = new SecurityLogger();
