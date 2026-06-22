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
        },
        publicSettings: {
            address: config.address || 'Jl. Imam Bonjol Pertigaan No.370 Kediri',
            whatsappNumber: config.whatsappNumber || '6287770995270',
            mapsUrl: config.mapsUrl || 'https://maps.app.goo.gl/AitnhHiAY3Ka9fAM9',
            instagramUrl: config.instagramUrl || 'https://www.instagram.com/staycoolhair_lab/?hl=en',
            bookingDaysAhead: config.bookingDaysAhead || 3,
            regularOpenHour: config.regularOpenHour || 11,
            fridayOpenHour: config.fridayOpenHour || 13,
            closeHour: config.closeHour || 22,
            headBarberId: config.headBarberId || null,
        }
    };
}

async function saveBookingConfig(input) {
    const blackout = input.blackout || {};
    const publicSettings = input.publicSettings || {};
    const normalizedPublicSettings = {
        address: publicSettings.address || null,
        whatsappNumber: publicSettings.whatsappNumber || null,
        mapsUrl: publicSettings.mapsUrl || null,
        instagramUrl: publicSettings.instagramUrl || null,
        bookingDaysAhead: publicSettings.bookingDaysAhead ? Number(publicSettings.bookingDaysAhead) : 3,
        regularOpenHour: publicSettings.regularOpenHour ? Number(publicSettings.regularOpenHour) : 11,
        fridayOpenHour: publicSettings.fridayOpenHour ? Number(publicSettings.fridayOpenHour) : 13,
        closeHour: publicSettings.closeHour ? Number(publicSettings.closeHour) : 22,
        headBarberId: publicSettings.headBarberId ? Number(publicSettings.headBarberId) : null,
    };

    const config = await prisma.bookingConfig.upsert({
        where: { id: 1 },
        update: {
            blackoutEnabled: Boolean(blackout.enabled && blackout.start && blackout.end),
            blackoutStart: blackout.enabled && blackout.start ? new Date(`${blackout.start}T00:00:00`) : null,
            blackoutEnd: blackout.enabled && blackout.end ? new Date(`${blackout.end}T00:00:00`) : null,
            blackoutMessage: blackout.message || null,
            ...normalizedPublicSettings,
        },
        create: {
            id: 1,
            blackoutEnabled: Boolean(blackout.enabled && blackout.start && blackout.end),
            blackoutStart: blackout.enabled && blackout.start ? new Date(`${blackout.start}T00:00:00`) : null,
            blackoutEnd: blackout.enabled && blackout.end ? new Date(`${blackout.end}T00:00:00`) : null,
            blackoutMessage: blackout.message || null,
            ...normalizedPublicSettings,
        }
    });

    return {
        blackout: {
            enabled: config.blackoutEnabled,
            start: config.blackoutStart ? config.blackoutStart.toISOString().slice(0, 10) : null,
            end: config.blackoutEnd ? config.blackoutEnd.toISOString().slice(0, 10) : null,
            message: config.blackoutMessage || null,
        },
        publicSettings: {
            address: config.address || 'Jl. Imam Bonjol Pertigaan No.370 Kediri',
            whatsappNumber: config.whatsappNumber || '6287770995270',
            mapsUrl: config.mapsUrl || 'https://maps.app.goo.gl/AitnhHiAY3Ka9fAM9',
            instagramUrl: config.instagramUrl || 'https://www.instagram.com/staycoolhair_lab/?hl=en',
            bookingDaysAhead: config.bookingDaysAhead || 3,
            regularOpenHour: config.regularOpenHour || 11,
            fridayOpenHour: config.fridayOpenHour || 13,
            closeHour: config.closeHour || 22,
            headBarberId: config.headBarberId || null,
        }
    };
}

module.exports = { getBookingConfig, saveBookingConfig };
