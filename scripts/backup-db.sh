#!/bin/bash
# Daily MySQL backup script for SkyTravel
# Usage: bash scripts/backup-db.sh
# Cron:  0 3 * * * /home/ubuntu/skytravel/scripts/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_NAME="${DB_NAME:-skytravel}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database '$DB_NAME'..."

mysqldump --single-transaction --routines --triggers \
  "$DB_NAME" > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

gzip "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

# Remove old backups beyond retention period
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

FILESIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz" | cut -f1)
echo "[$(date)] Backup completed: ${DB_NAME}_${TIMESTAMP}.sql.gz ($FILESIZE)"
