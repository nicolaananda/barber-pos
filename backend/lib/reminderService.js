const cron = require('node-cron');
const prisma = require('./prisma');
const whatsappService = require('./whatsapp');
const { format } = require('date-fns');
const { id: idLocale } = require('date-fns/locale');

/**
 * Send H-1 reminder to all confirmed bookings for tomorrow
 */
async function sendTomorrowReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            status: 'confirmed',
            bookingDate: { gte: startOfDay, lte: endOfDay },
        },
        include: {
            barber: { select: { name: true } },
        },
    });

    if (bookings.length === 0) return;

    for (const booking of bookings) {
        try {
            const dateStr = format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: idLocale });
            const message =
                `⏰ *PENGINGAT BOOKING - BESOK*\n\n` +
                `Halo Kak *${booking.customerName}*, jangan lupa jadwal potong rambut kamu besok!\n\n` +
                `✂️ Layanan: ${booking.serviceName || 'Potong Rambut'}\n` +
                `📅 Tanggal: ${dateStr}\n` +
                `⏰ Jam: ${booking.timeSlot}\n` +
                `💈 Barber: ${booking.barber.name}\n\n` +
                `Mohon datang 10 menit sebelum jam booking ya. Sampai jumpa! 🙏\n` +
                `\n📍 *Staycool Hairlab*\nJl. Imam Bonjol Pertigaan No.370 Kediri`;

            await whatsappService.sendWhatsAppMessage(booking.customerPhone, message);
        } catch (err) {
            console.error(`[Reminder] Gagal kirim ke ${booking.customerPhone}:`, err.message);
        }
    }

    console.log(`[Reminder] Terkirim ${bookings.length} reminder untuk ${format(tomorrow, 'dd MMM yyyy')}`);
}

/**
 * Start the reminder cron job
 * Runs every day at 08:00 WIB (01:00 UTC)
 */
function startReminderCron() {
    // Setiap hari jam 08:00 WIB = 01:00 UTC
    cron.schedule('0 1 * * *', async () => {
        console.log('[Reminder] Menjalankan pengiriman reminder H-1...');
        try {
            await sendTomorrowReminders();
        } catch (err) {
            console.error('[Reminder] Error saat kirim reminder:', err.message);
        }
    }, {
        timezone: 'Asia/Jakarta'
    });

    console.log('[Reminder] Cron job reminder H-1 aktif (setiap hari jam 08:00 WIB)');
}

module.exports = { startReminderCron, sendTomorrowReminders };
