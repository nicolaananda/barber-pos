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
            where.status = status;
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

module.exports = router;
