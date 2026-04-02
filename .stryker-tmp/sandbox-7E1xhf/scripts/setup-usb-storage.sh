#!/usr/bin/env bash
set -euo pipefail

USB_PARTITION="${1:-/dev/nvme0n1p1}"
MOUNT_POINT="${2:-/mnt/dvice}"
PROJECT_NAME="chase-the-bag-platform"
LOCAL_PROJECT="/home/cyber44/${PROJECT_NAME}"
USB_PROJECT="${MOUNT_POINT}/${PROJECT_NAME}"

echo "[1/4] Checking device: ${USB_PARTITION}"
if [[ ! -b "${USB_PARTITION}" ]]; then
  echo "Device not found: ${USB_PARTITION}"
  exit 1
fi

echo "[2/4] Mounting USB at ${MOUNT_POINT}"
sudo mkdir -p "${MOUNT_POINT}"
if ! mountpoint -q "${MOUNT_POINT}"; then
  sudo mount "${USB_PARTITION}" "${MOUNT_POINT}"
fi

echo "[3/4] Preparing target folder: ${USB_PROJECT}"
sudo mkdir -p "${USB_PROJECT}"
sudo chown -R "$USER":"$USER" "${USB_PROJECT}"

echo "[4/4] Syncing project to USB"
rsync -a --delete "${LOCAL_PROJECT}/" "${USB_PROJECT}/"

cat <<EOF

Done.
Project copy is now on USB:
  ${USB_PROJECT}

Optional: switch local path to symlink
  mv "${LOCAL_PROJECT}" "${LOCAL_PROJECT}.bak"
  ln -s "${USB_PROJECT}" "${LOCAL_PROJECT}"

EOF
