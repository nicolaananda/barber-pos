const prisma = require('./prisma');

async function getBookingConfig() {
    const config = await prisma.bookingConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            blackoutEnabled: false,
        }
    });

    return {
        blackout: {
            enabled: config.blackoutEnabled,
            start: config.blackoutStart ? config.blackoutStart.toISOString().slice(0, 10) : null,
            end: config.blackoutEnd ? config.blackoutEnd.toISOString().slice(0, 10) : null,
            message: config.blackoutMessage || null,
        }
    };
}

async function saveBookingConfig(input) {
    const blackout = input.blackout || {};

    const config = await prisma.bookingConfig.upsert({
        where: { id: 1 },
        update: {
            blackoutEnabled: Boolean(blackout.enabled && blackout.start && blackout.end),
            blackoutStart: blackout.enabled && blackout.start ? new Date(`${blackout.start}T00:00:00`) : null,
            blackoutEnd: blackout.enabled && blackout.end ? new Date(`${blackout.end}T00:00:00`) : null,
            blackoutMessage: blackout.message || null,
        },
        create: {
            id: 1,
            blackoutEnabled: Boolean(blackout.enabled && blackout.start && blackout.end),
            blackoutStart: blackout.enabled && blackout.start ? new Date(`${blackout.start}T00:00:00`) : null,
            blackoutEnd: blackout.enabled && blackout.end ? new Date(`${blackout.end}T00:00:00`) : null,
            blackoutMessage: blackout.message || null,
        }
    });

    return {
        blackout: {
            enabled: config.blackoutEnabled,
            start: config.blackoutStart ? config.blackoutStart.toISOString().slice(0, 10) : null,
            end: config.blackoutEnd ? config.blackoutEnd.toISOString().slice(0, 10) : null,
            message: config.blackoutMessage || null,
        }
    };
}

module.exports = { getBookingConfig, saveBookingConfig };
