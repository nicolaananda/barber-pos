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
const { uploadFile, deleteFile } = require('../lib/r2');
const securityLogger = require('../lib/securityLogger');
const { sanitizeText, sanitizePhone, isValidIndonesianPhone } = require('../lib/sanitizer');
const requireOwner = require('../middleware/requireOwner');
const { validate, requiredString, requiredInt, optionalInt, requiredDate } = require('../lib/validators');
const { getBookingConfig, saveBookingConfig } = require('../lib/bookingConfig');
const { bookingCreateLimiter, bookingStatusLimiter, publicReadLimiter } = require('../middleware/rateLimiter');

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed']);

const toSlotDate = (date) => format(new Date(date), 'yyyy-MM-dd');

const buildActiveSlotKey = (barberId, bookingDate, timeSlot, status) => {
    if (!ACTIVE_BOOKING_STATUSES.has(status)) return null;
    return `${barberId}:${toSlotDate(bookingDate)}:${timeSlot}`;
};

const isIsoDateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getDayRange = (dateString) => {
    if (!isIsoDateOnly(dateString)) return null;
    const targetDate = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return null;
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    return { targetDate, startOfDay, endOfDay };
};

const isWithinBookingWindow = (date, bookingDaysAhead) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + Math.max(1, bookingDaysAhead) - 1);
    maxDate.setHours(23, 59, 59, 999);
    return date >= today && date <= maxDate;
};

const getExtFromMagicBytes = (buffer) => {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return '.jpg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return '.png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return '.gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return '.webp';
    return '.jpg';
};

const safePublicBookingSelect = {
    barberId: true,
    bookingDate: true,
    timeSlot: true,
    status: true,
    barber: { select: { id: true, name: true } }
};

// GET /api/bookings/config - Public endpoint for booking configuration (blackout dates, etc.)
router.get('/config', publicReadLimiter, async (req, res) => {
    try {
        res.json(await getBookingConfig());
    } catch (error) {
        console.error('Error fetching booking config:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.patch('/config', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { enabled, start, end } = req.body.blackout || {};
        const publicSettings = req.body.publicSettings || {};

        const validateHttpsUrl = (value, allowedHosts, label) => {
            if (!value) return null;
            try {
                const parsed = new URL(value);
                if (parsed.protocol !== 'https:' || !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
                    throw new Error('invalid host');
                }
                return parsed.toString();
            } catch {
                const error = new Error(`${label} must be a valid HTTPS URL from an approved domain`);
                error.statusCode = 400;
                throw error;
            }
        };

        const clampNumber = (value, fallback, min, max, label) => {
            const number = value === null || value === undefined || value === '' ? fallback : Number(value);
            if (!Number.isInteger(number) || number < min || number > max) {
                const error = new Error(`${label} must be between ${min} and ${max}`);
                error.statusCode = 400;
                throw error;
            }
            return number;
        };

        const normalizedPublicSettings = {
            address: typeof publicSettings.address === 'string' ? publicSettings.address.trim().slice(0, 191) : null,
            whatsappNumber: publicSettings.whatsappNumber ? String(publicSettings.whatsappNumber).replace(/\D/g, '') : null,
            mapsUrl: validateHttpsUrl(publicSettings.mapsUrl, ['maps.app.goo.gl', 'google.com', 'google.co.id'], 'Maps URL'),
            instagramUrl: validateHttpsUrl(publicSettings.instagramUrl, ['instagram.com'], 'Instagram URL'),
            bookingDaysAhead: clampNumber(publicSettings.bookingDaysAhead, 3, 1, 14, 'Booking days ahead'),
            regularOpenHour: clampNumber(publicSettings.regularOpenHour, 11, 0, 23, 'Regular open hour'),
            fridayOpenHour: clampNumber(publicSettings.fridayOpenHour, 13, 0, 23, 'Friday open hour'),
            closeHour: clampNumber(publicSettings.closeHour, 22, 1, 24, 'Close hour'),
            headBarberId: publicSettings.headBarberId ? clampNumber(publicSettings.headBarberId, null, 1, 999999, 'Head barber') : null,
        };

        if (normalizedPublicSettings.whatsappNumber && !/^62\d{8,15}$/.test(normalizedPublicSettings.whatsappNumber)) {
            return res.status(400).json({ error: 'WhatsApp number must use Indonesia format, e.g. 6287770995270' });
        }

        if (normalizedPublicSettings.fridayOpenHour >= normalizedPublicSettings.closeHour || normalizedPublicSettings.regularOpenHour >= normalizedPublicSettings.closeHour) {
            return res.status(400).json({ error: 'Open hour must be earlier than close hour' });
        }

        if (enabled && (!start || !end)) {
            return res.status(400).json({ error: 'Blackout start and end dates are required' });
        }

        if (start && end && new Date(`${end}T00:00:00`) < new Date(`${start}T00:00:00`)) {
            return res.status(400).json({ error: 'Blackout end date must be after start date' });
        }

        const config = await saveBookingConfig({
            blackout: {
                enabled: Boolean(enabled && start && end),
                start: enabled ? start : null,
                end: enabled ? end : null,
                message: req.body.blackout?.message || null,
            },
            publicSettings: normalizedPublicSettings
        });

        res.json(config);
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating booking config:', error);
        res.status(500).json({ error: 'Failed to update booking config' });
    }
});

// POST /api/bookings - Create new booking
router.post('/', bookingCreateLimiter, upload.single('proof'), validate((req) => ({
    barberId: requiredInt(req.body.barberId, 'barberId', { min: 1 }),
    customerName: requiredString(req.body.customerName, 'customerName', { min: 2, max: 100 }),
    customerPhone: requiredString(req.body.customerPhone, 'customerPhone', { min: 6, max: 30 }),
    bookingDate: requiredDate(req.body.bookingDate, 'bookingDate'),
    timeSlot: requiredString(req.body.timeSlot, 'timeSlot', { max: 30 }),
    serviceId: optionalInt(req.body.serviceId, 'serviceId', { min: 1 })
})), async (req, res) => {
    let uploadedProofKey = null;
    try {
        // Safety check for req.body
        req.body = req.body || {};

        const { barberId, customerName, customerPhone, bookingDate, timeSlot, serviceId } = req.validated;

        // 🚫 Blackout period — configured via env BLACKOUT_START / BLACKOUT_END
        const bookingConfig = await getBookingConfig();
        if (bookingDate && bookingConfig.blackout?.enabled && bookingConfig.blackout?.start && bookingConfig.blackout?.end) {
            const d = new Date(bookingDate);
            const blackoutStart = new Date(bookingConfig.blackout.start + 'T00:00:00');
            const blackoutEnd = new Date(bookingConfig.blackout.end + 'T23:59:59');
            if (d >= blackoutStart && d <= blackoutEnd) {
                return res.status(400).json({
                    error: `Booking online tidak tersedia untuk tanggal ${bookingConfig.blackout.start} – ${bookingConfig.blackout.end}. Silakan datang langsung (walk-in).`
                });
            }
        }

        // 🔒 SECURITY: Sanitize inputs to prevent XSS
        const sanitizedName = sanitizeText(customerName);
        const sanitizedPhone = sanitizePhone(customerPhone);

        if (!sanitizedName || sanitizedName.length < 2) {
            return res.status(400).json({ error: 'Nama tidak valid (minimal 2 karakter)' });
        }

        if (!sanitizedPhone || !isValidIndonesianPhone(sanitizedPhone)) {
            return res.status(400).json({
                error: 'Nomor WhatsApp tidak valid. Gunakan format Indonesia (08xx) dengan operator valid.'
            });
        }

        const checkDate = new Date(bookingDate);
        if (Number.isNaN(checkDate.getTime()) || !isWithinBookingWindow(checkDate, bookingConfig.publicSettings.bookingDaysAhead)) {
            return res.status(400).json({ error: 'Tanggal booking di luar jendela booking online' });
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

        if (!barberId || !customerName || !customerPhone || !bookingDate || !timeSlot) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Enforce business hours: 11:00 - 22:00 (last slot 21:00-22:00)
        const timeMatch = typeof timeSlot === 'string' ? timeSlot.match(/^(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}$/) : null;
        if (timeMatch) {
            const startHour = parseInt(timeMatch[1], 10);
            const endHour = parseInt(timeMatch[2], 10);
            const isFriday = new Date(bookingDate).getDay() === 5;
            const OPENING_HOUR = isFriday ? bookingConfig.publicSettings.fridayOpenHour : bookingConfig.publicSettings.regularOpenHour;
            const CLOSING_HOUR = bookingConfig.publicSettings.closeHour;

            if (startHour < OPENING_HOUR || endHour > CLOSING_HOUR) {
                return res.status(400).json({ error: `Booking time must be between ${String(OPENING_HOUR).padStart(2, '0')}:00 and ${String(CLOSING_HOUR).padStart(2, '0')}:00` });
            }
        }

        const parsedBarberId = barberId;
        if (Number.isNaN(parsedBarberId)) {
            return res.status(400).json({ error: 'Invalid barber ID' });
        }

        const parsedServiceId = serviceId || null;
        if (serviceId && Number.isNaN(parsedServiceId)) {
            return res.status(400).json({ error: 'Invalid service ID' });
        }

        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const preflight = await prisma.$transaction(async (tx) => {
            const barber = await tx.user.findUnique({
                where: { id: parsedBarberId },
                select: { id: true, defaultOffDay: true, status: true }
            });
            if (!barber || barber.status !== 'active') return { error: 'Barber not found', statusCode: 404 };
            const manualOffDay = await tx.offDay.findFirst({ where: { userId: parsedBarberId, date: { gte: startOfDay, lte: endOfDay } }, select: { id: true } });
            if (manualOffDay || barber.defaultOffDay === checkDate.getDay()) return { error: 'Barber is off on this date', statusCode: 409 };
            const existingBooking = await tx.booking.findFirst({ where: { barberId: parsedBarberId, bookingDate: { gte: startOfDay, lte: endOfDay }, timeSlot, status: { in: ['pending', 'confirmed'] } }, select: { id: true } });
            if (existingBooking) return { error: 'Time slot already booked', statusCode: 409 };
            return { ok: true };
        });

        if (!preflight.ok) {
            return res.status(preflight.statusCode).json({ error: preflight.error });
        }

        let paymentProof = null;
        if (!req.file) {
            return res.status(400).json({ error: 'Bukti transfer wajib diupload!' });
        }
        if (!validateImageContent(req.file.buffer)) {
            securityLogger.logMaliciousUpload(req.file.originalname, req.ip || req.connection.remoteAddress, req.file.mimetype);
            return res.status(400).json({ error: 'File tidak valid. Hanya gambar asli yang diperbolehkan.' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = getExtFromMagicBytes(req.file.buffer);
        uploadedProofKey = 'proofs/proof-' + uniqueSuffix + ext;
        try {
            paymentProof = await uploadFile(req.file.buffer, uploadedProofKey, req.file.mimetype);
        } catch (err) {
            console.error("Upload R2 Failed:", err);
            return res.status(500).json({ error: 'Gagal upload bukti transfer ke R2' });
        }

        const booking = await prisma.$transaction(async (tx) => {
            const barber = await tx.user.findUnique({
                where: { id: parsedBarberId },
                select: { id: true, defaultOffDay: true }
            });

            if (!barber) {
                const notFoundError = new Error('Barber not found');
                notFoundError.statusCode = 404;
                throw notFoundError;
            }

            const manualOffDay = await tx.offDay.findFirst({
                where: {
                    userId: parsedBarberId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                select: { id: true }
            });

            if (manualOffDay || barber.defaultOffDay === checkDate.getDay()) {
                const offDayError = new Error('Barber is off on this date');
                offDayError.statusCode = 409;
                throw offDayError;
            }

            const existingBooking = await tx.booking.findFirst({
                where: {
                    barberId: parsedBarberId,
                    bookingDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    timeSlot,
                    status: { in: ['pending', 'confirmed'] }
                }
            });

            if (existingBooking) {
                const conflictError = new Error('Time slot already booked');
                conflictError.statusCode = 409;
                throw conflictError;
            }

            return tx.booking.create({
                data: {
                    barberId: parsedBarberId,
                    customerName: sanitizedName,
                    customerPhone: sanitizedPhone,
                    bookingDate: new Date(bookingDate),
                    timeSlot,
                    serviceId: parsedServiceId,
                    serviceName,
                    servicePrice,
                    status: 'pending',
                    activeSlotKey: buildActiveSlotKey(parsedBarberId, bookingDate, timeSlot, 'pending'),
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
        }, { isolationLevel: 'Serializable' });

        // NOTE: No WA sent on booking creation per client request.
        // WA is only sent when admin confirms the booking (status -> confirmed).

        res.status(201).json(booking);
    } catch (error) {
        if (uploadedProofKey) {
            deleteFile(uploadedProofKey).catch((deleteError) => console.error('Failed to cleanup orphan proof:', deleteError));
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Time slot already booked' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: error.message });
        }
        if (error.statusCode === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET /api/bookings/status?phone=08xxx - Public endpoint to check booking status by phone
router.get('/status', bookingStatusLimiter, async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone || phone.trim().length < 6) {
            return res.status(400).json({ error: 'Nomor HP tidak valid' });
        }

        const normalized = sanitizePhone(phone);
        if (!isValidIndonesianPhone(normalized)) {
            return res.status(400).json({ error: 'Nomor HP tidak valid' });
        }

        const since = new Date();
        since.setDate(since.getDate() - 90);

        // Fetch bookings and transactions in parallel
        const [bookings, transactions] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    customerPhone: normalized,
                    bookingDate: { gte: since },
                    status: { not: 'cancelled' },
                },
                select: {
                    id: true,
                    bookingDate: true,
                    barberId: true,
                    timeSlot: true,
                    serviceName: true,
                    status: true,
                    barber: { select: { name: true } },
                },
                orderBy: { bookingDate: 'desc' },
                take: 10,
            }),
            // 🔒 SECURITY: Only select fields needed for public display (no financial data)
            prisma.transaction.findMany({
                where: {
                    customerPhone: normalized,
                    date: { gte: since },
                },
                select: {
                    id: true,
                    date: true,
                    barberId: true,
                    items: true,
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
            customerName: 'Customer',
            service: b.serviceName || null,
            amount: null,
            status: b.status,
            timeSlot: b.timeSlot,
            paymentMethod: null,
            invoiceCode: null,
        }));

        // 🔒 SECURITY: Don't expose financial details (totalAmount, paymentMethod, invoiceCode) to public
        const txItems = unmatchedTransactions.map(tx => {
            const firstItem = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items[0] : null;
            return {
                type: 'transaction',
                date: tx.date,
                barberName: tx.barber.name,
                customerName: 'Customer',
                service: firstItem ? firstItem.name : null,
                amount: null,
                status: 'completed',
                timeSlot: null,
                paymentMethod: null,
                invoiceCode: null,
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
router.get('/today', publicReadLimiter, async (req, res) => {
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
            select: safePublicBookingSelect,
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
router.get('/date/:date', publicReadLimiter, async (req, res) => {
    try {
        const { date } = req.params;
        const range = getDayRange(date);
        if (!range) return res.status(400).json({ error: 'Invalid date' });
        const { targetDate, startOfDay, endOfDay } = range;
        const bookingConfig = await getBookingConfig();
        if (!isWithinBookingWindow(targetDate, bookingConfig.publicSettings.bookingDaysAhead)) {
            return res.status(400).json({ error: 'Date outside booking window' });
        }

        const bookings = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: { in: ['pending', 'confirmed'] }
            },
            select: safePublicBookingSelect,
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

// PATCH /api/bookings/:id/status - Update booking status (owner or assigned barber only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Role check: only owner can confirm/cancel, barber can only mark their own bookings as completed
        if (req.user.role !== 'owner') {
            if (status === 'confirmed' || status === 'cancelled') {
                return res.status(403).json({ error: 'Only owners can confirm or cancel bookings' });
            }
            // Staff can only complete their own bookings
            const bookingCheck = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
            if (!bookingCheck || bookingCheck.barberId !== req.user.id) {
                return res.status(403).json({ error: 'You can only complete your own bookings' });
            }
        }

        // Guard: check current status to prevent duplicate actions (e.g. double-click sending WA twice)
        const currentBooking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
        if (!currentBooking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (currentBooking.status === status) {
            // Already in the target status — return success without re-sending WA
            const bookingWithBarber = await prisma.booking.findUnique({
                where: { id: parseInt(id) },
                include: { barber: { select: { id: true, name: true } } }
            });
            return res.json(bookingWithBarber);
        }

        const booking = await prisma.$transaction(async (tx) => {
            const activeSlotKey = buildActiveSlotKey(currentBooking.barberId, currentBooking.bookingDate, currentBooking.timeSlot, status);

            if (activeSlotKey) {
                const conflictingBooking = await tx.booking.findFirst({
                    where: {
                        id: { not: currentBooking.id },
                        activeSlotKey
                    },
                    select: { id: true }
                });

                if (conflictingBooking) {
                    const conflictError = new Error('Time slot already booked');
                    conflictError.statusCode = 409;
                    throw conflictError;
                }
            }

            return tx.booking.update({
                where: { id: parseInt(id) },
                data: { status, activeSlotKey },
                include: {
                    barber: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
        }, { isolationLevel: 'Serializable' });

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
        if (error.statusCode === 409 || error.code === 'P2002') {
            return res.status(409).json({ error: error.message || 'Time slot already booked' });
        }
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});

// GET /api/bookings/barber/:barberId/today - Get today's bookings for specific barber (for BarberDashboard)
router.get('/barber/:barberId/today', authenticateToken, async (req, res) => {
    try {
        const { barberId } = req.params;
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await prisma.booking.findMany({
            where: {
                barberId: parseInt(barberId),
                bookingDate: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: [{ timeSlot: 'asc' }]
        });

        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const completed = bookings.filter(b => b.status === 'completed').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        const estimatedRevenue = bookings
            .filter(b => ['confirmed', 'pending'].includes(b.status))
            .reduce((sum, b) => sum + (b.servicePrice || 0), 0);

        res.json({
            date: today.toISOString(),
            bookings,
            summary: {
                totalBookings: bookings.length,
                confirmed,
                pending,
                completed,
                cancelled,
                estimatedRevenue,
            }
        });
    } catch (error) {
        console.error('Error fetching barber today bookings:', error);
        res.status(500).json({ error: 'Failed to fetch barber today bookings' });
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
router.patch('/:id/reschedule', authenticateToken, requireOwner, async (req, res) => {
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
