const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/slots/available - Get available time slots for a specific date and barber
router.get('/available', async (req, res) => {
    try {
        const { date, barberId } = req.query;

        console.log(`[Slots API] Fetching slots for date: ${date}, barberId: ${barberId}`);

        if (!date || !barberId) {
            return res.status(400).json({ error: 'Date and barberId are required' });
        }

        const checkDate = new Date(date);

        // 1. Check if the barber is off on this date
        const isOffDay = await prisma.offDay.findFirst({
            where: {
                userId: parseInt(barberId),
                date: {
                    gte: new Date(checkDate.setHours(0, 0, 0, 0)),
                    lte: new Date(checkDate.setHours(23, 59, 59, 999))
                }
            }
        });

        // Also check if it's the barber's default off day
        const dayOfWeek = new Date(date).getDay();
        const barber = await prisma.user.findUnique({
            where: { id: parseInt(barberId) }
        });

        if (isOffDay || (barber && barber.defaultOffDay === dayOfWeek)) {
            return res.json({ availableSlots: [] }); // No slots available on off days
        }

        // 2. Define all possible slots (11:00 to 21:00 start times)
        const allSlots = [
            "11:00 - 12:00",
            "12:00 - 13:00",
            "13:00 - 14:00",
            "14:00 - 15:00",
            "15:00 - 16:00",
            "16:00 - 17:00",
            "17:00 - 18:00",
            "18:00 - 19:00",
            "19:00 - 20:00",
            "20:00 - 21:00",
            "21:00 - 22:00"
        ];

        // 3. Find existing bookings for that date & barber
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await prisma.booking.findMany({
            where: {
                barberId: parseInt(barberId),
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: {
                    in: ['pending', 'confirmed']
                }
            },
            select: {
                timeSlot: true
            }
        });

        const bookedSlots = existingBookings.map(b => b.timeSlot);

        // 4. Filter available slots
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        // 5. If date is today, filter out past slots
        const today = new Date();
        const requestDateObj = new Date(date);

        if (
            requestDateObj.getDate() === today.getDate() &&
            requestDateObj.getMonth() === today.getMonth() &&
            requestDateObj.getFullYear() === today.getFullYear()
        ) {
            const currentHour = today.getHours();

            const filteredByTime = availableSlots.filter(slot => {
                const [startHourStr] = slot.split(':');
                const startHour = parseInt(startHourStr, 10);
                // Allow booking at least 1 hour ahead
                return startHour > currentHour;
            });

            return res.json({ availableSlots: filteredByTime });
        }

        res.json({ availableSlots });

    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
});

module.exports = router;
