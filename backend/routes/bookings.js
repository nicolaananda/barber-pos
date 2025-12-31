const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

const upload = require('../middleware/upload');

// POST /api/bookings - Create new booking
router.post('/', upload.single('proof'), async (req, res) => {
    try {
        const { barberId, customerName, customerPhone, bookingDate, timeSlot } = req.body;
        // Handle R2 Upload
        let paymentProof = null;
        if (req.file) {
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

        // Check if time slot is already booked
        const existingBooking = await prisma.booking.findFirst({
            where: {
                barberId: parseInt(barberId),
                bookingDate: new Date(bookingDate),
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
                customerName,
                customerPhone,
                bookingDate: new Date(bookingDate),
                timeSlot,
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
