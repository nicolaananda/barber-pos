# WhatsApp Invoice - Troubleshooting Guide

## Error yang Sudah Diperbaiki

Saya sudah meningkatkan error handling dan logging untuk memberikan pesan error yang lebih detail.

## Perubahan yang Dibuat

### Enhanced Error Logging

File `backend/lib/whatsapp.js` sekarang akan menampilkan detail error lengkap di console backend:

```javascript
console.error('WhatsApp Send Error Details:', {
    message: error.message,
    code: error.code,
    response: error.response?.data,
    status: error.response?.status
});
```

### Improved Error Messages

Error messages sekarang lebih spesifik:

- **ECONNREFUSED**: "Cannot connect to WhatsApp service. Check WAHA_URL in .env"
- **ENOTFOUND**: "WhatsApp service URL not found. Check WAHA_URL in .env"
- **Server Error**: Menampilkan response error dari WAHA
- **No Response**: "No response from WhatsApp service. Is WAHA running?"

### Debug Logging

Sebelum mengirim pesan, sistem akan log informasi berikut:

```javascript
console.log('Sending WhatsApp message:', {
    wahaUrl: WAHA_URL,
    session: WAHA_SESSION,
    chatId: chatId,
    phoneNumber: phoneNumber,
    formattedPhone: formattedPhone
});
```

## Cara Testing Ulang

1. **Backend sudah di-restart** dengan kode terbaru
2. **Buat transaksi baru** dengan customer phone
3. **Klik "Send WhatsApp"**
4. **Lihat terminal backend** untuk melihat log detail:
   - Log "Sending WhatsApp message:" akan muncul sebelum request
   - Jika error, "WhatsApp Send Error Details:" akan muncul dengan info lengkap

## Kemungkinan Penyebab Error

### 1. WAHA Service Tidak Running
**Solusi**: Pastikan WAHA service berjalan di `https://waha.nicola.id`

Test dengan curl:
```bash
curl https://waha.nicola.id/api/sessions
```

### 2. Session Tidak Aktif
**Solusi**: Pastikan session "default" sudah di-pair dan aktif di WAHA

### 3. Format Nomor Salah
**Solusi**: Service sudah auto-format, tapi pastikan nomor valid (08xxx atau 628xxx)

### 4. WAHA API Endpoint Berbeda
**Solusi**: Cek dokumentasi WAHA kamu, mungkin endpoint bukan `/api/sendText`

Endpoint yang digunakan sekarang:
```
POST https://waha.nicola.id/api/sendText
Body: {
  "session": "default",
  "chatId": "628xxx@c.us",
  "text": "invoice message"
}
```

## Next Steps

Setelah test ulang, lihat log di terminal backend untuk mendapatkan error message yang lebih spesifik. Kemudian kita bisa debug lebih lanjut berdasarkan error tersebut.
