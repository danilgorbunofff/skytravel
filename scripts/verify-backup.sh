#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/mysql}"
MAX_AGE_HOURS=24

LATEST=$(find "$BACKUP_DIR" -name "skytravel-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST" ]; then
  echo "INFO: No backup found in $BACKUP_DIR"
  exit 0
fi

NOW=$(date +%s)
BACKUP_TIME=$(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST" 2>/dev/null)
AGE_HOURS=$(( (NOW - BACKUP_TIME) / 3600 ))

if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "WARN: Latest backup is ${AGE_HOURS}h old (max ${MAX_AGE_HOURS}h)"
else
  echo "PASS: Backup OK (${AGE_HOURS}h old)"
fi
