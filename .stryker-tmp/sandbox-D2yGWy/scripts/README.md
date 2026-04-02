# USB storage setup

Run:

```bash
chmod +x /home/cyber44/chase-the-bag-platform/scripts/setup-usb-storage.sh
/home/cyber44/chase-the-bag-platform/scripts/setup-usb-storage.sh /dev/nvme0n1p1 /mnt/dvice
```

After sync, optional symlink switch:

```bash
mv /home/cyber44/chase-the-bag-platform /home/cyber44/chase-the-bag-platform.bak
ln -s /mnt/dvice/chase-the-bag-platform /home/cyber44/chase-the-bag-platform
```
