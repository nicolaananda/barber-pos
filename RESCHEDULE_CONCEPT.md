# � Konsep Reschedule Booking — Barber POS

## 🎯 Tujuan

Memungkinkan **Admin (Owner/Staff)** untuk mengubah jadwal booking pelanggan melalui dashboard, tanpa pelanggan perlu booking ulang dari awal.

---

## 👤 Siapa yang Bisa Reschedule?

> **Hanya Admin (login ke dashboard)** yang bisa melakukan reschedule.

Pelanggan **tidak bisa** reschedule sendiri. Mereka harus:
1. Hubungi barbershop (WA/telpon)
2. Admin yang akan proses reschedule di dashboard

---

## � Alur Reschedule (Admin Dashboard)

```
Admin buka halaman Bookings
       ↓
Cari booking berdasarkan:
  • Nomor HP pelanggan, ATAU
  • Nama pelanggan, ATAU
  • Scroll dari daftar booking
       ↓
Klik tombol "Reschedule" pada booking yang ingin diubah
       ↓
Sistem cek status booking:
  ┌─────────────────────────────────────────────┐
  │  Status PENDING  → ✅ Bisa reschedule       │
  │  Status CONFIRMED → ✅ Bisa reschedule      │
  │  Status CANCELLED → ❌ Tidak bisa           │
  │  Status COMPLETED → ❌ Tidak bisa           │
  └─────────────────────────────────────────────┘
       ↓
Admin pilih:
  • Tanggal baru
  • Jam baru (time slot)
  • Barber (opsional, bisa ganti barber juga)
       ↓
Sistem validasi:
  • Slot baru tidak bentrok dengan booking lain
  • Tanggal bukan off-day barber
  • Masih dalam jam operasional (11:00 - 22:00)
       ↓
Simpan perubahan
       ↓
Notifikasi WA otomatis ke pelanggan
```

---

## � Notifikasi WhatsApp ke Pelanggan

Setelah reschedule berhasil, sistem otomatis kirim WA:

```
🔄 *RESCHEDULE BOOKING*

Halo Kak *[Nama]*, jadwal booking Anda telah diubah.

✂️ Layanan: [Nama Layanan]
📅 Jadwal Baru: [Tanggal Baru]
⏰ Jam Baru: [Jam Baru]
💈 Barber: [Nama Barber]

Jadwal sebelumnya: [Tanggal Lama] pukul [Jam Lama]

Mohon hadir 10 menit sebelum jadwal. Terima kasih! 🙏
📍 Staycool Hairlab
```

---

## 🛡️ Aturan Bisnis (Business Rules)

| Kondisi | Boleh Reschedule? |
|---|---|
| Status `pending` | ✅ Ya |
| Status `confirmed` | ✅ Ya |
| Status `cancelled` | ❌ Tidak |
| Status `completed` | ❌ Tidak |
| Slot baru sudah penuh (barber lain booking) | ❌ Tidak |
| Tanggal baru adalah off-day barber | ❌ Tidak |
| Di luar jam operasional (< 11:00 / > 22:00) | ❌ Tidak |

---

## 🗃️ Perubahan Database

### Tambah field baru di tabel `Booking`:

| Field | Tipe | Keterangan |
|---|---|---|
| `rescheduledFrom` | `DateTime?` | Simpan tanggal booking **lama** |
| `rescheduledFromSlot` | `String?` | Simpan jam booking **lama** |
| `rescheduledAt` | `DateTime?` | Kapan reschedule dilakukan |
| `rescheduledByAdminId` | `Int?` | Admin mana yang reschedule |
| `rescheduleCount` | `Int` | Berapa kali sudah direschedule (default: 0) |

> 💡 Ini penting supaya ada **riwayat/audit trail** — bisa dicek kalau ada dispute

---

## 🔌 API Endpoint Baru

```
PATCH /api/bookings/:id/reschedule
```

**Request body:**
```json
{
  "newBookingDate": "2026-02-28",
  "newTimeSlot": "14:00 - 15:00",
  "newBarberId": 3,       ← opsional, kalau mau ganti barber
  "reason": "Pelanggan minta ganti hari"  ← opsional, catatan admin
}
```

**Protected:** ✅ Hanya bisa diakses dengan token admin (sudah login)

---

## 🖥️ Perubahan UI di Dashboard

### Halaman Bookings (Admin)
- Tambah tombol **"Reschedule"** di setiap baris booking (status pending/confirmed)
- Klik buka **modal/drawer** berisi:
  - Info booking lama (read-only)
  - Date picker untuk tanggal baru
  - Dropdown time slot yang masih tersedia
  - Dropdown barber (opsional)
  - Tombol **"Simpan Reschedule"**

---

## 🚦 Ringkasan Alur Teknis

```
Admin klik "Reschedule"
       ↓
Frontend buka modal
       ↓
Admin pilih jadwal baru
       ↓
Frontend panggil API:
  PATCH /api/bookings/:id/reschedule
       ↓
Backend validasi:
  1. Booking ada? (404 jika tidak)
  2. Status pending/confirmed? (400 jika tidak)
  3. Slot baru available? (409 jika penuh)
  4. Bukan off-day barber? (400 jika off-day)
       ↓
Simpan ke DB (update + catat riwayat)
       ↓
Kirim notifikasi WA ke pelanggan
       ↓
Return response sukses ke frontend
       ↓
Dashboard refresh daftar booking
```

---

## ❓ FAQ untuk Owner

**Q: Kalau pelanggan minta reschedule sendiri tanpa lewat admin, bisa?**
> Tidak. Sistem ini admin-only. Pelanggan harus WA/telpon dulu, admin yang input.

**Q: Satu booking bisa reschedule berapa kali?**
> Secara teknis tak terbatas, tapi tersimpan di field `rescheduleCount` — bisa dibuat batas misal max 2x jika owner mau.

**Q: Bagaimana kalau barber lama sudah ada booking lain di jam baru?**
> Sistem otomatis blok dan kasih notifikasi "Slot sudah penuh, pilih jam/barber lain."

**Q: Apakah bukti transfer (payment proof) ikut berpindah?**
> Ya. Bukti transfer tetap melekat di booking yang sama, hanya jadwalnya yang berubah.

**Q: Apakah ada log siapa admin yang reschedule?**
> Ya, field `rescheduledByAdminId` menyimpan ID admin yang melakukan reschedule.
