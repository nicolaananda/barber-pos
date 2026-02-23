# 📋 Fitur Reschedule Booking – Staycool Hairlab

Dokumen ini menjelaskan konsep fitur **reschedule booking** yang akan ditambahkan ke sistem.

---

## 🎯 Tujuan

Memungkinkan pelanggan mengubah jadwal booking sendiri **tanpa perlu menghubungi admin secara manual**, dengan tetap menjaga ketertiban jadwal barber.

---

## 🔁 Alur Reschedule

### Cara Kerja dari Sisi Pelanggan

1. Pelanggan buka halaman **"Ubah Jadwal Booking"** (di website yang sama saat booking)
2. Masukkan **nomor HP** yang digunakan saat booking
3. Sistem menampilkan daftar booking aktif milik pelanggan tersebut
4. Pelanggan memilih booking yang ingin diubah jadwalnya
5. Pilih **tanggal & jam baru** yang masih tersedia
6. Konfirmasi → jadwal berhasil diubah

---

## 📌 Aturan Penting

| Aturan | Keterangan |
|--------|-----------|
| ⏰ **Batas waktu reschedule** | Tidak bisa reschedule jika kurang dari **1 jam** sebelum jadwal yang ada |
| 🔁 **Batas jumlah reschedule** | Setiap booking hanya bisa reschedule **1 kali** |
| 💸 **Biaya reschedule** | **Gratis**, tidak ada biaya tambahan |
| 📎 **Bukti transfer** | Tidak perlu upload ulang – bukti dari booking pertama tetap berlaku |

---

## 🔔 Status Booking Setelah Reschedule

Sistem akan menyesuaikan status secara otomatis berdasarkan status booking sebelumnya:

```
Jika booking masih PENDING (belum dikonfirmasi admin):
  → Tetap PENDING setelah reschedule
  → Admin perlu konfirmasi ulang seperti biasa

Jika booking sudah CONFIRMED (sudah dikonfirmasi admin):
  → Otomatis langsung CONFIRMED setelah reschedule
  → Admin mendapat notifikasi WhatsApp informasi perubahan jadwal
  → Tidak perlu konfirmasi ulang dari admin
```

### Notifikasi yang Dikirim

| Kepada | Notifikasi |
|--------|-----------|
| **Pelanggan** | WhatsApp konfirmasi jadwal baru |
| **Admin** | WhatsApp info: "*[Nama]* telah reschedule booking dari *[jadwal lama]* ke *[jadwal baru]*" |

---

## 💻 Perubahan Teknis yang Diperlukan

### Database
- Tambah kolom `rescheduleCount` (batas 1x per booking)
- Tambah kolom `originalDate` & `originalTimeSlot` (menyimpan jadwal asli untuk arsip)

### Backend (API)
- Endpoint baru: `POST /api/bookings/reschedule`
- Validasi: slot baru masih kosong, belum melewati batas 1 jam, belum pernah reschedule
- Kirim notifikasi WhatsApp ke pelanggan & admin

### Frontend
- Halaman baru: **"Reschedule Booking"** (publik, tidak perlu login)
- Form pencarian booking by nomor HP
- Tampilkan booking aktif, form pilih tanggal & jam baru

---

## ✅ Contoh Skenario

**Skenario 1 – Booking masih pending:**
> Budi booking hari Senin jam 14:00, admin belum konfirmasi.
> Budi ingin pindah ke jam 16:00.
> → Reschedule berhasil, status tetap pending, admin konfirmasi seperti biasa.

**Skenario 2 – Booking sudah confirmed:**
> Siti booking hari Rabu jam 13:00, admin sudah konfirmasi.
> Siti ingin pindah ke jam 15:00 (masih lebih dari 1 jam dari jadwal lama).
> → Reschedule berhasil, **langsung confirmed**, admin dapat notif WA informasi perubahan.

**Skenario 3 – Ditolak sistem:**
> Rudi booking hari Jumat jam 14:00. Sekarang sudah jam 13:10 (< 1 jam lagi).
> → ❌ Tidak bisa reschedule, tampil pesan: *"Maaf, reschedule tidak dapat dilakukan kurang dari 1 jam sebelum jadwal."*

**Skenario 4 – Sudah pernah reschedule:**
> Ani booking sudah pernah direschedule 1 kali sebelumnya.
> → ❌ Tidak bisa reschedule lagi, tampil pesan: *"Setiap booking hanya dapat direschedule 1 kali."*

---

## 🚀 Estimasi Pengembangan

| Komponen | Estimasi |
|----------|----------|
| Backend API + Database | 1–2 hari |
| Halaman Frontend | 1 hari |
| Testing & Deploy | 1 hari |
| **Total** | **~3 hari kerja** |

---

*Dokumen ini dibuat sebagai referensi sebelum proses pengembangan dimulai.*
