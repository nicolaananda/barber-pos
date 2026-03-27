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
router.post('/', upload.single('proof'), async (req, res) => {
    try {
        // Safety check for req.body
        req.body = req.body || {};

        const { barberId, customerName, customerPhone, bookingDate, timeSlot, serviceId } = req.body;

        // 🚫 Blackout period — configured via env BLACKOUT_START / BLACKOUT_END
        if (bookingDate && process.env.BLACKOUT_START && process.env.BLACKOUT_END) {
            const d = new Date(bookingDate);
            const blackoutStart = new Date(process.env.BLACKOUT_START + 'T00:00:00');
            const blackoutEnd = new Date(process.env.BLACKOUT_END + 'T23:59:59');
            if (d >= blackoutStart && d <= blackoutEnd) {
                return res.status(400).json({
                    error: `Booking online tidak tersedia untuk tanggal ${process.env.BLACKOUT_START} – ${process.env.BLACKOUT_END}. Silakan datang langsung (walk-in).`
                });
            }
        }

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

        // Send WhatsApp acknowledgement (non-blocking)
        try {
            const dateStr = format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: idLocale });
            const ackMsg = `📋 *BOOKING DITERIMA*\n\n` +
                `Halo Kak *${booking.customerName}*, booking Anda sudah kami terima dan sedang menunggu konfirmasi admin.\n\n` +
                `✂️ Layanan: ${booking.serviceName || 'Potong Rambut'}\n` +
                `📅 Tanggal: ${dateStr}\n` +
                `⏰ Jam: ${booking.timeSlot}\n` +
                `💈 Barber: ${booking.barber.name}\n\n` +
                `Kami akan kirim WA lagi setelah booking dikonfirmasi. Mohon ditunggu ya! 🙏\n` +
                `\n📍 *Staycool Hairlab*\nJl. Imam Bonjol Pertigaan No.370 Kediri`;

            await whatsappService.sendWhatsAppMessage(booking.customerPhone, ackMsg);
        } catch (waError) {
            console.error('[Booking Create] WA acknowledgement error:', waError);
        }

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET /api/bookings/status?phone=08xxx - Public endpoint to check booking status by phone
router.get('/status', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone || phone.trim().length < 6) {
            return res.status(400).json({ error: 'Nomor HP tidak valid' });
        }

        // Match by last 8 digits to handle 08xx / 628xx / +628xx variations
        const suffix = phone.trim().replace(/\D/g, '').slice(-8);

        const since = new Date();
        since.setDate(since.getDate() - 90);

        // Fetch bookings and transactions in parallel
        const [bookings, transactions] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    customerPhone: { endsWith: suffix },
                    bookingDate: { gte: since },
                    status: { not: 'cancelled' },
                },
                select: {
                    id: true,
                    customerName: true,
                    bookingDate: true,
                    barberId: true,
                    timeSlot: true,
                    serviceName: true,
                    servicePrice: true,
                    status: true,
                    barber: { select: { name: true } },
                },
                orderBy: { bookingDate: 'desc' },
                take: 10,
            }),
            prisma.transaction.findMany({
                where: {
                    customerPhone: { endsWith: suffix },
                    date: { gte: since },
                },
                select: {
                    id: true,
                    invoiceCode: true,
                    customerName: true,
                    date: true,
                    barberId: true,
                    items: true,
                    totalAmount: true,
                    paymentMethod: true,
                    barber: { select: { name: true } },
                },
                orderBy: { date: 'desc' },
                take: 10,
            }),
        ]);

        // Build set of booking keys (barberId_YYYY-MM-DD) to detect duplicates
        const bookingKeys = new Set(
            bookings.map(b => `${b.barberId}_${format(new Date(b.bookingDate), 'yyyy-MM-dd')}`)
        );

        // Only include transactions that don't match an existing booking on the same day+barber
        const unmatchedTransactions = transactions.filter(tx => {
            const key = `${tx.barberId}_${format(new Date(tx.date), 'yyyy-MM-dd')}`;
            return !bookingKeys.has(key);
        });

        // Normalize to unified shape
        const bookingItems = bookings.map(b => ({
            type: 'booking',
            date: b.bookingDate,
            barberName: b.barber.name,
            customerName: b.customerName,
            service: b.serviceName || null,
            amount: b.servicePrice || null,
            status: b.status,
            timeSlot: b.timeSlot,
            paymentMethod: null,
            invoiceCode: null,
        }));

        const txItems = unmatchedTransactions.map(tx => {
            const firstItem = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items[0] : null;
            return {
                type: 'transaction',
                date: tx.date,
                barberName: tx.barber.name,
                customerName: tx.customerName || 'Walk-in',
                service: firstItem ? firstItem.name : null,
                amount: tx.totalAmount,
                status: 'completed',
                timeSlot: null,
                paymentMethod: tx.paymentMethod,
                invoiceCode: tx.invoiceCode,
            };
        });

        // Merge and sort by date desc
        const result = [...bookingItems, ...txItems]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);

        res.json(result);
    } catch (error) {
        console.error('Booking status check error:', error);
        res.status(500).json({ error: 'Gagal mengecek status booking' });
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

// PATCH /api/bookings/:id/reschedule - Reschedule booking (ADMIN ONLY)
router.patch('/:id/reschedule', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { newBookingDate, newTimeSlot, newBarberId, reason } = req.body;
        const adminId = req.user.id; // From authenticateToken middleware

        if (!newBookingDate || !newTimeSlot) {
            return res.status(400).json({ error: 'Tanggal dan jam baru harus diisi' });
        }

        // 1. Find existing booking
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: { barber: { select: { id: true, name: true } } }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking tidak ditemukan' });
        }

        // 2. Validate status
        if (!['pending', 'confirmed'].includes(booking.status)) {
            return res.status(400).json({ error: 'Hanya booking berstatus pending atau confirmed yang bisa di-reschedule' });
        }

        // 3. Set target barber
        const targetBarberId = newBarberId ? parseInt(newBarberId) : booking.barberId;

        // 4. Validate new slot availability
        const checkDate = new Date(newBookingDate);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflicting = await prisma.booking.findFirst({
            where: {
                barberId: targetBarberId,
                bookingDate: { gte: startOfDay, lte: endOfDay },
                timeSlot: newTimeSlot,
                status: { in: ['pending', 'confirmed'] },
                NOT: { id: booking.id }
            }
        });

        if (conflicting) {
            return res.status(409).json({ error: 'Slot waktu tersebut sudah terisi. Pilih admin/waktu lain.' });
        }

        // 5. Update booking with reschedule tracking
        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: {
                bookingDate: new Date(newBookingDate),
                timeSlot: newTimeSlot,
                barberId: targetBarberId,
                // Reschedule tracking
                rescheduledFrom: booking.rescheduledFrom || booking.bookingDate,
                rescheduledFromSlot: booking.rescheduledFromSlot || booking.timeSlot,
                rescheduledAt: new Date(),
                rescheduledByAdminId: adminId,
                rescheduleCount: { increment: 1 }
            },
            include: { barber: { select: { id: true, name: true } } }
        });

        // 6. Send WhatsApp notification
        try {
            const oldDateStr = format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: idLocale });
            const newDateStr = format(new Date(newBookingDate), 'dd MMMM yyyy', { locale: idLocale });

            const waMsg = `🔄 *RESCHEDULE BOOKING*\n\n` +
                `Halo Kak *${booking.customerName}*, jadwal booking Anda telah *diubah oleh Admin*.\n\n` +
                `✂️ Layanan: ${booking.serviceName || 'Potong Rambut'}\n` +
                `📅 Jadwal Baru: *${newDateStr}*\n` +
                `⏰ Jam Baru: *${newTimeSlot}*\n` +
                `💈 Barber: ${updatedBooking.barber.name}\n\n` +
                `Jadwal sebelumnya: ${oldDateStr} pukul ${booking.timeSlot}\n\n` +
                `Mohon hadir 10 menit sebelum jadwal ya. Terima kasih! 🙏\n` +
                `\n📍 *Staycool Hairlab*\nJl. Imam Bonjol Pertigaan No.370 Kediri`;

            await whatsappService.sendWhatsAppMessage(booking.customerPhone, waMsg);
        } catch (waError) {
            console.error('[Admin Reschedule] WA notification error:', waError);
            // Non-blocking
        }

        res.json({ success: true, booking: updatedBooking });
    } catch (error) {
        console.error('Error in admin reschedule:', error);
        res.status(500).json({ error: 'Gagal melakukan reschedule booking' });
    }
});

module.exports = router;
