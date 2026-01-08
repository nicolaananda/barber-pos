const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Automatic backup service triggered by transactions
 */
class BackupService {
    constructor() {
        this.isBackingUp = false;
        this.lastBackupTime = null;
        this.minBackupInterval = 5 * 60 * 1000; // 5 minutes minimum between backups
    }

    /**
     * Trigger backup after transaction
     */
    async backupAfterTransaction(transactionData) {
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

    /**
     * Execute MySQL backup
     */
    executeBackup() {
        return new Promise((resolve) => {
            const DB_NAME = process.env.DB_NAME || 'barber_pos';
            const DB_USER = process.env.DB_USER || 'root';
            const DB_PASS = process.env.DB_PASSWORD || '';
            const BACKUP_DIR = '/root/backup/mysql-auto';
            const DATE = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const TIME = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
            const BACKUP_FILE = `${BACKUP_DIR}/${DB_NAME}_${DATE}_${TIME}.sql`;

            // Create backup directory if not exists
            exec(`mkdir -p ${BACKUP_DIR}`, (mkdirErr) => {
                if (mkdirErr) {
                    return resolve({ success: false, error: mkdirErr.message });
                }

                // Execute mysqldump with proper password handling
                const passwordArg = DB_PASS ? `-p${DB_PASS}` : '';
                const dumpCmd = `mysqldump -u ${DB_USER} ${passwordArg} ${DB_NAME} > ${BACKUP_FILE}`;

                exec(dumpCmd, (dumpErr) => {
                    if (dumpErr) {
                        return resolve({ success: false, error: dumpErr.message });
                    }

                    // Compress backup
                    exec(`gzip ${BACKUP_FILE}`, (gzipErr) => {
                        if (gzipErr) {
                            return resolve({ success: false, error: gzipErr.message });
                        }

                        // Clean old backups (keep last 50)
                        exec(`ls -t ${BACKUP_DIR}/*.sql.gz | tail -n +51 | xargs rm -f`, (cleanErr) => {
                            // Don't fail on cleanup error
                            resolve({
                                success: true,
                                filename: `${BACKUP_FILE}.gz`
                            });
                        });
                    });
                });
            });
        });
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
