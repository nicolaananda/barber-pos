# WhatsApp Invoice Configuration

Untuk mengaktifkan fitur kirim invoice via WhatsApp, tambahkan konfigurasi berikut ke file `.env` di folder `backend`:

```env
# WhatsApp Configuration (WAHA)
WAHA_URL=http://localhost:3000
WAHA_SESSION=default
WAHA_API_KEY=your-api-key-here
```

## Konfigurasi WAHA

1. **WAHA_URL**: URL endpoint WAHA API kamu
   - Jika WAHA berjalan di localhost: `http://localhost:3000`
   - Jika WAHA di server lain: `https://waha.yourdomain.com`

2. **WAHA_SESSION**: Nama session WhatsApp yang sudah di-pair
   - Default: `default`
   - Sesuaikan dengan session name yang kamu gunakan di WAHA

3. **WAHA_API_KEY**: API Key untuk autentikasi WAHA (REQUIRED)
   - Dapatkan dari dashboard WAHA kamu
   - Biasanya di Settings > API Keys
   - **PENTING**: Tanpa API key akan muncul error 401 Unauthorized

## Format Nomor Telepon

Service akan otomatis convert format nomor:
- `08xxx` → `628xxx`
- `+628xxx` → `628xxx`
- `628xxx` → `628xxx` (no change)

## Cara Menggunakan

1. Saat checkout, masukkan nomor telepon customer
2. Setelah transaksi berhasil, akan muncul tombol "Send WhatsApp"
3. Klik tombol untuk mengirim invoice ke WhatsApp customer
4. Invoice akan dikirim dengan format yang rapi dan lengkap

## Format Invoice WhatsApp

Invoice yang dikirim akan berisi:
- Invoice code
- Tanggal dan waktu transaksi
- Nama barber
- Nama customer (jika ada)
- Detail layanan (item, qty, harga)
- Total pembayaran
- Metode pembayaran
- Informasi kontak Staycool Hairlab
