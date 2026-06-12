const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

/**
 * Automatic backup service triggered by transactions
 */
class BackupService {
    constructor() {
        this.isBackingUp = false;
        this.lastBackupTime = null;
        this.minBackupInterval = 5 * 60 * 1000; // 5 minutes minimum between backups
        this.cronStarted = false;
    }

    /**
     * Trigger backup after transaction
     */
    async backupAfterTransaction(transactionData) {
        if ((process.env.BACKUP_MODE || 'transaction') !== 'transaction') {
            return;
        }

        // Skip if already backing up
        if (this.isBackingUp) {
            console.log('⏭️  Backup already in progress, skipping...');
            return;
        }

        // Skip if last backup was less than 5 minutes ago (prevent spam)
        if (this.lastBackupTime && (Date.now() - this.lastBackupTime) < this.minBackupInterval) {
            console.log('⏭️  Backup too recent, skipping...');
            return;
        }

        this.isBackingUp = true;

        try {
            console.log(`💾 Triggering backup after transaction: ${transactionData.invoiceCode}`);

            const backupResult = await this.executeBackup();

            if (backupResult.success) {
                this.lastBackupTime = Date.now();
                console.log(`✅ Backup completed: ${backupResult.filename}`);
            } else {
                console.error(`❌ Backup failed: ${backupResult.error}`);
            }
        } catch (error) {
            console.error('❌ Backup error:', error);
        } finally {
            this.isBackingUp = false;
        }
    }

    startScheduledBackups() {
        if (this.cronStarted) return;

        const schedule = process.env.BACKUP_SCHEDULE;
        if (!schedule) return;

        cron.schedule(schedule, async () => {
            try {
                await this.executeBackup();
            } catch (error) {
                console.error('❌ Scheduled backup error:', error);
            }
        }, {
            timezone: process.env.TZ || 'Asia/Jakarta'
        });

        this.cronStarted = true;
        console.log(`🗓️ Scheduled backup enabled: ${schedule}`);
    }

    /**
     * Execute MySQL backup
     */
    executeBackup() {
        return new Promise((resolve) => {
            const fs = require('fs');
            const DB_NAME = process.env.DB_NAME || 'barber_pos';
            const DB_USER = process.env.DB_USER || 'root';
            const DB_PASS = process.env.DB_PASSWORD || '';
            const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backup/mysql-auto';
            const DATE = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const TIME = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
            const BACKUP_FILE = `${BACKUP_DIR}/${DB_NAME}_${DATE}_${TIME}.sql`;

            // Create backup directory if not exists
            try {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
            } catch (mkdirErr) {
                return resolve({ success: false, error: mkdirErr.message });
            }

            // Execute mysqldump safely using execFile (no shell interpolation)
            const dumpArgs = ['-u', DB_USER];
            if (DB_PASS) dumpArgs.push(`-p${DB_PASS}`);
            dumpArgs.push('--result-file', BACKUP_FILE, DB_NAME);

            execFile('mysqldump', dumpArgs, (dumpErr) => {
                if (dumpErr) {
                    return resolve({ success: false, error: dumpErr.message });
                }

                // Compress backup
                execFile('gzip', [BACKUP_FILE], (gzipErr) => {
                    if (gzipErr) {
                        return resolve({ success: false, error: gzipErr.message });
                    }

                    const compressedFile = `${BACKUP_FILE}.gz`;

                    // Upload to R2 (async, don't wait)
                    this.uploadToR2(compressedFile).catch(err => {
                        console.error('⚠️ R2 upload failed (backup still saved locally):', err.message);
                    });

                    // Clean old backups (keep last 50)
                    try {
                        const files = fs.readdirSync(BACKUP_DIR)
                            .filter(f => f.endsWith('.sql.gz'))
                            .map(f => ({ name: f, time: fs.statSync(`${BACKUP_DIR}/${f}`).mtime.getTime() }))
                            .sort((a, b) => b.time - a.time);

                        files.slice(50).forEach(f => {
                            try { fs.unlinkSync(`${BACKUP_DIR}/${f.name}`); } catch (e) { /* ignore */ }
                        });
                    } catch (cleanErr) {
                        // Don't fail on cleanup error
                    }

                    resolve({
                        success: true,
                        filename: compressedFile
                    });
                });
            });
        });
    }

    /**
     * Upload backup to R2 cloud storage
     */
    async uploadToR2(localFilePath) {
        try {
            const fs = require('fs');
            const path = require('path');
            const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

            // Check if R2 is configured
            if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
                console.log('⏭️  R2 not configured, skipping cloud upload');
                return;
            }

            const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                },
            });

            // Read file
            const fileBuffer = fs.readFileSync(localFilePath);
            const filename = path.basename(localFilePath);
            const r2Key = `backups/${filename}`;

            // Upload to R2
            const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key,
                Body: fileBuffer,
                ContentType: 'application/gzip',
            });

            await s3Client.send(command);
            console.log(`☁️  Backup uploaded to R2: ${r2Key}`);

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get backup statistics
     */
    getStats() {
        return {
            isBackingUp: this.isBackingUp,
            lastBackupTime: this.lastBackupTime,
            lastBackupAgo: this.lastBackupTime ? Date.now() - this.lastBackupTime : null
        };
    }
}

module.exports = new BackupService();
