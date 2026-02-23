const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

const upload = require('../middleware/upload');
const { validateImageContent } = require('../middleware/upload');
const whatsappService = require('../lib/whatsapp');
const { format } = require('date-fns');
const { id: idLocale } = require('date-fns/locale');
const path = require('path');
const { uploadFile } = require('../lib/r2');
const securityLogger = require('../lib/securityLogger');
const { sanitizeText, sanitizePhone, isValidIndonesianPhone } = require('../lib/sanitizer');

// POST /api/bookings - Create new booking
router.post('/', (req, res, next) => {
    // Debug Logging
    console.log('Incoming Booking Request:');
    console.log('Content-Type:', req.headers['content-type']);
    next();
}, upload.single('proof'), async (req, res) => {
    try {
        console.log('Req Body after Multer:', req.body);
        console.log('Req File after Multer:', req.file);

        // Safety check for req.body
        req.body = req.body || {};

        const { barberId, customerName, customerPhone, bookingDate, timeSlot, serviceId } = req.body;

        // Fetch Service Details if provided
        let serviceName = 'Potong Rambut'; // Default
        let servicePrice = null;

        if (serviceId) {
            const service = await prisma.service.findUnique({
                where: { id: parseInt(serviceId) }
            });
            if (service) {
                serviceName = service.name;
                servicePrice = service.price;
            }
        }

        // Handle R2 Upload
        let paymentProof = null;
        if (req.file) {
            // 🔒 SECURITY: Validate file content to prevent malicious uploads
            if (!validateImageContent(req.file.buffer)) {
                // Log security event
                securityLogger.logMaliciousUpload(
                    req.file.originalname,
                    req.ip || req.connection.remoteAddress,
                    req.file.mimetype
                );

                console.warn('⚠️ Rejected malicious file upload:', {
                    filename: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    ip: req.ip
                });
                return res.status(400).json({
                    error: 'File tidak valid. Hanya gambar asli yang diperbolehkan.'
                });
            }

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(req.file.originalname);
            const filename = 'proofs/proof-' + uniqueSuffix + ext;

            try {
                paymentProof = await uploadFile(req.file.buffer, filename, req.file.mimetype);
            } catch (err) {
                console.error("Upload R2 Failed:", err);
                return res.status(500).json({ error: 'Gagal upload bukti transfer ke R2' });
            }
        } else {
            // Handle case where file is missing but required, handled by validation below
            paymentProof = null;
        }

        // Validation - Payment Proof is MANDATORY
        if (!paymentProof) {
            return res.status(400).json({ error: 'Bukti transfer wajib diupload!' });
        }

        if (!barberId || !customerName || !customerPhone || !bookingDate || !timeSlot) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 🔒 SECURITY: Sanitize inputs to prevent XSS
        const sanitizedName = sanitizeText(customerName);
        const sanitizedPhone = sanitizePhone(customerPhone);

        // Validate sanitized inputs
        if (!sanitizedName || sanitizedName.length < 2) {
            return res.status(400).json({ error: 'Nama tidak valid (minimal 2 karakter)' });
        }

        if (!sanitizedPhone || !isValidIndonesianPhone(sanitizedPhone)) {
            return res.status(400).json({
                error: 'Nomor WhatsApp tidak valid. Gunakan format Indonesia (08xx) dengan operator valid.'
            });
        }

        // Enforce business hours: 11:00 - 22:00 (last slot 21:00-22:00)
        const timeMatch = typeof timeSlot === 'string' ? timeSlot.match(/^(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}$/) : null;
        if (timeMatch) {
            const startHour = parseInt(timeMatch[1], 10);
            const endHour = parseInt(timeMatch[2], 10);
            const OPENING_HOUR = 11;
            const CLOSING_HOUR = 22;

            if (startHour < OPENING_HOUR || endHour > CLOSING_HOUR) {
                return res.status(400).json({ error: 'Booking time must be between 11:00 and 22:00' });
            }
        }

        // Check if time slot is already booked (Check the whole day)
        const checkDate = new Date(bookingDate);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBooking = await prisma.booking.findFirst({
            where: {
                barberId: parseInt(barberId),
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                timeSlot,
                status: { in: ['pending', 'confirmed'] }
            }
        });

        if (existingBooking) {
            return res.status(409).json({ error: 'Time slot already booked' });
        }

        const booking = await prisma.booking.create({
            data: {
                barberId: parseInt(barberId),
                customerName: sanitizedName,
                customerPhone: sanitizedPhone,
                bookingDate: new Date(bookingDate),
                timeSlot,
                serviceId: serviceId ? parseInt(serviceId) : null,
                serviceName,
                servicePrice,
                status: 'pending',
                paymentProof: paymentProof
            },
            include: {
                barber: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET /api/bookings/today - Get today's bookings (PUBLIC - for Status page)
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: { in: ['pending', 'confirmed'] }
            },
            include: {
                barber: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { timeSlot: 'asc' }
            ]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching today bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// GET /api/bookings/date/:date - Get bookings for specific date (PUBLIC - for Status page)
router.get('/date/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: { in: ['pending', 'confirmed'] }
            },
            include: {
                barber: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { timeSlot: 'asc' }
            ]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings for date:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// GET /api/bookings - Get all bookings (with filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { date, barberId, status } = req.query;

        const where = {};

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            where.bookingDate = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        if (barberId) {
            where.barberId = parseInt(barberId);
        }

        if (status) {
            if (status === 'active') {
                where.status = { in: ['pending', 'confirmed'] };
            } else {
                where.status = status;
            }
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                barber: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { bookingDate: 'asc' },
                { timeSlot: 'asc' }
            ]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// PATCH /api/bookings/:id/status - Update booking status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status },
            include: {
                barber: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // AUTOMATION: If status is CONFIRMED
        if (status === 'confirmed') {
            try {
                // 1. Save Customer if not exists
                const existingCustomer = await prisma.customer.findUnique({
                    where: { phone: booking.customerPhone }
                });

                if (!existingCustomer) {
                    await prisma.customer.create({
                        data: {
                            name: booking.customerName,
                            phone: booking.customerPhone,
                            totalVisits: 0, // Will act as new customer
                            lastVisit: new Date()
                        }
                    });
                    console.log(`[Auto] New Customer saved: ${booking.customerName}`);
                }

                // 2. Send WhatsApp Notification
                const dateStr = format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: idLocale });
                const message = `✅ *BOOKING KONFIRMASI*\n\n` +
                    `Halo Kak *${booking.customerName}*, booking Anda telah kami terima!\n\n` +
                    `✂️ Layanan: ${booking.serviceName || 'Potong Rambut'}\n` +
                    `📅 Tanggal: ${dateStr}\n` +
                    `⏰ Jam: ${booking.timeSlot}\n` +
                    `💈 Barber: ${booking.barber.name}\n\n` +
                    `Mohon datang 10 menit sebelum jam booking ya. Terima kasih! 🙏\n` +
                    `\n📍 *Staycool Hairlab*\nJl. Imam Bonjol Pertigaan No.370 Kediri`;

                await whatsappService.sendWhatsAppMessage(booking.customerPhone, message);
                console.log(`[Auto] WA sent to ${booking.customerPhone}`);

            } catch (autoError) {
                console.error("Error in Booking Automation (Customer/WA):", autoError);
                // Don't fail the request, just log error
            }
        }

        res.json(booking);
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});

// GET /api/bookings/barber/:barberId - Get bookings for specific barber
router.get('/barber/:barberId', authenticateToken, async (req, res) => {
    try {
        const { barberId } = req.params;

        const bookings = await prisma.booking.findMany({
            where: {
                barberId: parseInt(barberId),
                status: { in: ['pending', 'confirmed'] }
            },
            orderBy: [
                { bookingDate: 'asc' },
                { timeSlot: 'asc' }
            ]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching barber bookings:', error);
        res.status(500).json({ error: 'Failed to fetch barber bookings' });
    }
});

// GET /api/bookings/summary - Quick summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + (2 * 60 * 60 * 1000));

        // Pending bookings
        const pendingBookings = await prisma.booking.findMany({
            where: {
                status: 'pending'
            },
            include: {
                barber: {
                    select: { name: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        // Upcoming bookings (next 2 hours)
        // Upcoming bookings (Today's confirmed bookings)
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const upcomingBookings = await prisma.booking.findMany({
            where: {
                status: 'confirmed',
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                barber: {
                    select: { id: true, name: true, username: true }
                }
            },
            orderBy: [
                { timeSlot: 'asc' }
            ]
            // Removed take: 5 to show all today's bookings
        });

        res.json({
            pending: pendingBookings.map(b => ({
                id: b.id,
                customerName: b.customerName,
                barberName: b.barber.name,
                timeSlot: b.timeSlot,
                bookingDate: b.bookingDate,
                serviceName: b.serviceName,
                createdAt: b.createdAt
            })),
            upcoming: upcomingBookings.map(b => ({
                id: b.id,
                customerName: b.customerName,
                customerPhone: b.customerPhone,
                barberId: b.barberId,
                barberName: b.barber.name,
                barberUsername: b.barber.username,
                timeSlot: b.timeSlot,
                bookingDate: b.bookingDate,
                serviceId: b.serviceId,
                serviceName: b.serviceName,
                servicePrice: b.servicePrice
            }))
        });
    } catch (error) {
        console.error('Error fetching booking summary:', error);
        res.status(500).json({ error: 'Failed to fetch booking summary' });
    }
});


// GET /api/bookings/active?phone=xxx - Get active bookings by phone (PUBLIC - for Reschedule page)
router.get('/active', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ error: 'Nomor HP wajib diisi' });
        }

        const bookings = await prisma.booking.findMany({
            where: {
                customerPhone: phone,
                status: { in: ['pending', 'confirmed'] }
            },
            include: {
                barber: {
                    select: { id: true, name: true }
                }
            },
            orderBy: [{ bookingDate: 'asc' }, { timeSlot: 'asc' }]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching active bookings:', error);
        res.status(500).json({ error: 'Gagal mengambil data booking' });
    }
});

// POST /api/bookings/reschedule - Reschedule a booking (PUBLIC)
router.post('/reschedule', async (req, res) => {
    try {
        const { bookingId, phone, newDate, newTimeSlot } = req.body;

        if (!bookingId || !phone || !newDate || !newTimeSlot) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // 1. Find the booking
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) },
            include: { barber: { select: { id: true, name: true } } }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking tidak ditemukan' });
        }

        // 2. Verify phone ownership
        if (booking.customerPhone !== phone) {
            return res.status(403).json({ error: 'Nomor HP tidak sesuai dengan booking' });
        }

        // 3. Check if already rescheduled
        if (booking.rescheduleCount >= 1) {
            return res.status(400).json({ error: 'Booking ini sudah pernah direschedule. Setiap booking hanya bisa direschedule 1 kali.' });
        }

        // 4. Check 1-hour cutoff from ORIGINAL booking time
        const [startHourStr] = booking.timeSlot.split(':');
        const originalDateTime = new Date(booking.bookingDate);
        originalDateTime.setHours(parseInt(startHourStr, 10), 0, 0, 0);
        const now = new Date();
        const diffMs = originalDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
            return res.status(400).json({ error: 'Maaf, reschedule tidak dapat dilakukan kurang dari 1 jam sebelum jadwal.' });
        }

        // 5. Check new slot availability
        const checkDate = new Date(newDate);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflicting = await prisma.booking.findFirst({
            where: {
                barberId: booking.barberId,
                bookingDate: { gte: startOfDay, lte: endOfDay },
                timeSlot: newTimeSlot,
                status: { in: ['pending', 'confirmed'] },
                NOT: { id: booking.id }
            }
        });

        if (conflicting) {
            return res.status(409).json({ error: 'Slot waktu tersebut sudah terisi. Pilih waktu lain.' });
        }

        // 6. Determine new status
        const newStatus = booking.status === 'confirmed' ? 'confirmed' : 'pending';

        // 7. Update booking
        const updated = await prisma.booking.update({
            where: { id: booking.id },
            data: {
                bookingDate: new Date(newDate),
                timeSlot: newTimeSlot,
                status: newStatus,
                rescheduleCount: { increment: 1 },
                originalDate: booking.originalDate ?? booking.bookingDate,
                originalTimeSlot: booking.originalTimeSlot ?? booking.timeSlot
            },
            include: { barber: { select: { id: true, name: true } } }
        });

        // 8. Send WhatsApp notifications (fire-and-forget)
        try {
            const oldDateStr = format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: idLocale });
            const newDateStr = format(new Date(newDate), 'dd MMMM yyyy', { locale: idLocale });

            // To customer
            const customerMsg = `🔄 *RESCHEDULE BOOKING*\n\n` +
                `Halo Kak *${booking.customerName}*, jadwal booking Anda telah berhasil diubah!\n\n` +
                `📅 Jadwal Lama: ${oldDateStr} – ${booking.timeSlot}\n` +
                `📅 Jadwal Baru: *${newDateStr} – ${newTimeSlot}*\n` +
                `💈 Barber: ${booking.barber.name}\n\n` +
                (newStatus === 'confirmed'
                    ? `✅ Booking Anda sudah *terkonfirmasi otomatis*.\n`
                    : `⏳ Booking Anda menunggu konfirmasi ulang dari admin.\n`) +
                `\nMohon datang 10 menit sebelum jam booking ya. Terima kasih! 🙏\n` +
                `\n📍 *Staycool Hairlab*\nJl. Imam Bonjol Pertigaan No.370 Kediri`;

            await whatsappService.sendWhatsAppMessage(booking.customerPhone, customerMsg);

            // To admin (owner number from env, fallback to a known number)
            const adminPhone = process.env.ADMIN_PHONE || '6281234567890';
            const adminMsg = `🔄 *INFO RESCHEDULE*\n\n` +
                `Pelanggan *${booking.customerName}* (${booking.customerPhone}) telah melakukan reschedule:\n\n` +
                `❌ Jadwal Lama: ${oldDateStr} – ${booking.timeSlot}\n` +
                `✅ Jadwal Baru: ${newDateStr} – ${newTimeSlot}\n` +
                `💈 Barber: ${booking.barber.name}\n` +
                `📋 Status: ${newStatus === 'confirmed' ? 'Auto-Confirmed ✅' : 'Pending (butuh konfirmasi) ⏳'}`;

            await whatsappService.sendWhatsAppMessage(adminPhone, adminMsg);
        } catch (waErr) {
            console.error('[Reschedule] WA notification error:', waErr);
            // don't fail the request
        }

        res.json({ success: true, booking: updated });
    } catch (error) {
        console.error('Error rescheduling booking:', error);
        res.status(500).json({ error: 'Gagal melakukan reschedule booking' });
    }
});

module.exports = router;
