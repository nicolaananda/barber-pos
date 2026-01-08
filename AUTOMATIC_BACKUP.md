# 💾 Automatic Backup - Transaction Triggered

## ✅ Fitur Baru: Backup Otomatis Setiap Transaksi

Sekarang database akan **otomatis di-backup** setiap kali ada transaksi baru!

### 🎯 Cara Kerja:

```
Transaksi Baru → Backup Triggered → Database Saved
```

### ⚡ Smart Features:

1. **Rate Limiting** - Backup maksimal setiap 5 menit
   - Mencegah backup spam jika banyak transaksi bersamaan
   - Hemat disk space & CPU

2. **Non-Blocking** - Backup jalan di background
   - Tidak memperlambat response transaksi
   - Error backup tidak affect transaksi

3. **Auto Cleanup** - Keep 50 backup terakhir
   - Otomatis hapus backup lama
   - Hemat disk space

4. **Timestamped** - Setiap backup punya timestamp
   - Format: `barber_pos_2026-01-08_213045.sql.gz`
   - Mudah identify kapan backup dibuat

---

## 📁 Lokasi Backup:

```
/root/backup/mysql-auto/
```

**Contoh:**
```
barber_pos_2026-01-08_140530.sql.gz  (14:05:30)
barber_pos_2026-01-08_143012.sql.gz  (14:30:12)
barber_pos_2026-01-08_150145.sql.gz  (15:01:45)
```

---

## 🚀 Setup di VPS:

### **Step 1: Deploy Code**

```bash
# SSH ke VPS
ssh root@15.235.140.249

# Pull latest
cd /root/Work/barber-pos
git pull origin main

# Restart
pm2 restart staycool-backend
```

### **Step 2: Set Environment Variables**

```bash
# Edit .env
nano /root/Work/barber-pos/backend/.env

# Tambahkan (jika belum ada):
DB_NAME=barber_pos
DB_USER=root
DB_PASSWORD=your_mysql_password_here

# Save: Ctrl+O, Enter, Ctrl+X
```

### **Step 3: Create Backup Directory**

```bash
mkdir -p /root/backup/mysql-auto
chmod 755 /root/backup/mysql-auto
```

### **Step 4: Test**

```bash
# Buat transaksi baru via POS
# Lalu cek backup:
ls -lht /root/backup/mysql-auto/ | head -5
```

---

## 📊 Monitoring:

### **Cek Backup Terbaru**

```bash
# List 10 backup terakhir
ls -lht /root/backup/mysql-auto/ | head -10

# Cek total backup
ls /root/backup/mysql-auto/*.sql.gz | wc -l

# Cek total size
du -sh /root/backup/mysql-auto/
```

### **Cek Log Backup**

```bash
# PM2 logs akan show backup activity
pm2 logs staycool-backend | grep "backup"

# Example output:
# 💾 Triggering backup after transaction: INV-260108-015
# ✅ Backup completed: /root/backup/mysql-auto/barber_pos_2026-01-08_213045.sql.gz
```

---

## 🔄 Restore dari Backup:

### **List Available Backups**

```bash
ls -lht /root/backup/mysql-auto/
```

### **Restore Specific Backup**

```bash
# CAUTION: This will overwrite current database!

# Decompress and restore
gunzip -c /root/backup/mysql-auto/barber_pos_2026-01-08_213045.sql.gz | mysql -u root -p barber_pos
```

---

## ⚙️ Konfigurasi:

### **Ubah Interval Minimum**

Edit `backend/lib/backupService.js`:

```javascript
this.minBackupInterval = 5 * 60 * 1000; // 5 minutes

// Ubah jadi:
this.minBackupInterval = 10 * 60 * 1000; // 10 minutes
// atau
this.minBackupInterval = 1 * 60 * 1000; // 1 minute (not recommended)
```

### **Ubah Jumlah Backup yang Disimpan**

Edit `backend/lib/backupService.js` line ~75:

```javascript
exec(`ls -t ${BACKUP_DIR}/*.sql.gz | tail -n +51 | xargs rm -f`

// Ubah 51 jadi:
// +101 = keep 100 backups
// +31 = keep 30 backups
```

---

## 🆚 Perbandingan: Daily vs Transaction-Triggered

| Feature | Daily Backup | Transaction Backup |
|---------|-------------|-------------------|
| Frequency | 1x per hari | Setiap transaksi |
| Data Loss Risk | Max 24 jam | Max 5 menit |
| Disk Usage | Minimal | Moderate |
| CPU Usage | Low | Low-Medium |
| Recovery Point | Daily | Near real-time |

### **Rekomendasi: Gunakan Keduanya!**

```bash
# Daily backup (scheduled)
0 2 * * * /root/backup-barber-db.sh >> /root/backup/backup.log 2>&1

# Transaction backup (automatic)
# Already active via code!
```

**Kenapa keduanya?**
- Daily backup: Long-term archive
- Transaction backup: Real-time protection

---

## 🎯 Contoh Skenario:

### **Skenario 1: Transaksi Ramai**

```
14:00 - Transaksi #1 → Backup triggered ✅
14:02 - Transaksi #2 → Skipped (< 5 min)
14:03 - Transaksi #3 → Skipped (< 5 min)
14:06 - Transaksi #4 → Backup triggered ✅
```

**Result:** 2 backups dalam 6 menit (efficient!)

### **Skenario 2: Transaksi Jarang**

```
10:00 - Transaksi #1 → Backup triggered ✅
12:30 - Transaksi #2 → Backup triggered ✅
15:45 - Transaksi #3 → Backup triggered ✅
```

**Result:** 3 backups, setiap transaksi ter-backup

---

## 🔍 Troubleshooting:

### **Backup Tidak Jalan**

```bash
# Cek PM2 logs
pm2 logs staycool-backend --err

# Cek permissions
ls -la /root/backup/mysql-auto/

# Cek MySQL credentials
mysql -u root -p -e "SELECT 1"
```

### **Disk Space Penuh**

```bash
# Cek disk usage
df -h

# Clean old backups manually
cd /root/backup/mysql-auto
ls -t *.sql.gz | tail -n +31 | xargs rm -f
```

### **Backup Terlalu Sering**

```bash
# Increase minimum interval
# Edit backend/lib/backupService.js
# Change: this.minBackupInterval = 10 * 60 * 1000; // 10 minutes
```

---

## ✅ Checklist:

- [ ] Code deployed ke VPS
- [ ] Environment variables set
- [ ] Backup directory created
- [ ] Test transaksi & verify backup
- [ ] Monitor logs untuk errors
- [ ] Setup daily backup juga (recommended)

---

## 📞 Support:

Jika ada masalah:

1. Cek PM2 logs: `pm2 logs staycool-backend`
2. Cek backup directory: `ls -lh /root/backup/mysql-auto/`
3. Verify MySQL credentials di `.env`
4. Test manual backup: Buat transaksi baru

---

## 🎉 Summary:

**Sebelum:**
- Backup manual only
- Risk: Kehilangan data jika lupa backup

**Sekarang:**
- ✅ Auto backup setiap transaksi
- ✅ Smart rate limiting (5 min)
- ✅ Non-blocking background process
- ✅ Auto cleanup old backups
- ✅ Keep 50 recent backups

**Data Anda sekarang JAUH LEBIH AMAN!** 💪
