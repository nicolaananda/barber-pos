# WAHA API Key Setup - Quick Fix

## Problem
Error: **401 Unauthorized** saat mengirim WhatsApp

## Solution
Tambahkan `WAHA_API_KEY` ke file `backend/.env`:

```env
WAHA_URL=https://waha.nicola.id
WAHA_SESSION=default
WAHA_API_KEY=your-actual-api-key-here
```

## Cara Mendapatkan API Key

1. **Login ke WAHA Dashboard** di `https://waha.nicola.id`
2. **Buka Settings** atau **API Keys** section
3. **Generate atau Copy API Key** yang sudah ada
4. **Paste ke `.env`** file

## Restart Backend

Setelah menambahkan API key:

```bash
# Stop backend (Ctrl+C)
# Start ulang
cd backend
npm start
```

## Test Ulang

1. Buat transaksi dengan customer phone
2. Klik "Send WhatsApp"
3. Seharusnya berhasil sekarang!

## Jika Masih Error

Cek terminal backend untuk error message yang lebih detail.
