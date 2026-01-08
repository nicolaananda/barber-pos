#!/bin/bash

# Database Backup Script for Staycool Barber POS
# This script creates automated MySQL backups

# Configuration
DB_NAME="barber_pos"
DB_USER="root"
DB_PASS="your_password_here"  # UPDATE THIS!
BACKUP_DIR="/root/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create backup
echo "Creating backup: ${BACKUP_FILE}"
mysqldump -u ${DB_USER} -p${DB_PASS} ${DB_NAME} > ${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_FILE}
echo "Backup compressed: ${BACKUP_FILE}.gz"

# Delete backups older than 30 days
find ${BACKUP_DIR} -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete
echo "Old backups cleaned up (kept last 30 days)"

# Show backup size
du -h ${BACKUP_FILE}.gz

echo "Backup completed successfully!"
