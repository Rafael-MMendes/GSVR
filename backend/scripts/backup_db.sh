#!/bin/bash
# Backup automatizado do banco PostgreSQL do GSVR com retenção de 14 dias
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/vps_9bpm/backups/gsvr}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_FILE="${BACKUP_DIR}/gsvr_escala_ft_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

docker exec ft-postgres pg_dump -U "${DB_USER:-postgres}" -d "${DB_NAME:-escala_ft}" \
  --no-owner --no-privileges | gzip > "${OUT_FILE}"

# Remove backups mais antigos que RETENTION_DAYS
find "${BACKUP_DIR}" -type f -name "gsvr_escala_ft_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[BACKUP OK] ${OUT_FILE} ($(du -h "${OUT_FILE}" | cut -f1))"

