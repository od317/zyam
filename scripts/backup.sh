#!/usr/bin/env bash
set -euo pipefail   # stop on the first error, and fail if pg_dump fails inside a pipe

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zyam}"
STORAGE_DIR="${STORAGE_DIR:-./storage}"
KEEP_DAILY=7
KEEP_WEEKLY=4

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
stamp="$(date +%Y-%m-%d)"

# Write to a .partial name first, so a crash never leaves a half-written file that looks valid.
docker compose exec -T postgres pg_dump -U postgres -Fc zyam > "$BACKUP_DIR/daily/zyam-$stamp.dump.partial"
mv "$BACKUP_DIR/daily/zyam-$stamp.dump.partial" "$BACKUP_DIR/daily/zyam-$stamp.dump"

if [ -d "$STORAGE_DIR/originals" ]; then
  tar -czf "$BACKUP_DIR/daily/originals-$stamp.tar.gz.partial" -C "$STORAGE_DIR" originals
  mv "$BACKUP_DIR/daily/originals-$stamp.tar.gz.partial" "$BACKUP_DIR/daily/originals-$stamp.tar.gz"
fi

# Sundays: keep a copy in the weekly folder
if [ "$(date +%u)" = "7" ]; then
  cp "$BACKUP_DIR/daily/zyam-$stamp.dump" "$BACKUP_DIR/weekly/"
fi

# Rotation: keep the newest N of each kind
ls -1t "$BACKUP_DIR"/daily/zyam-*.dump        | tail -n +$((KEEP_DAILY + 1))  | xargs -r rm --
ls -1t "$BACKUP_DIR"/daily/originals-*.tar.gz | tail -n +$((KEEP_DAILY + 1))  | xargs -r rm --
ls -1t "$BACKUP_DIR"/weekly/zyam-*.dump       | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm --

# OFF-SITE COPY goes here (the "1" in 3-2-1): for example rclone to a bucket at a DIFFERENT provider.
# Decided at deployment, because it needs the client's storage account.

echo "Backup finished: $stamp"