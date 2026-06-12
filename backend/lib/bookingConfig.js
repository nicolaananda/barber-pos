const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'booking-config.json');

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function readBookingConfig() {
    ensureConfigDir();

    const envBlackout = {
        enabled: !!(process.env.BLACKOUT_START && process.env.BLACKOUT_END),
        start: process.env.BLACKOUT_START || null,
        end: process.env.BLACKOUT_END || null,
    };

    if (!fs.existsSync(CONFIG_FILE)) {
        return { blackout: envBlackout };
    }

    try {
        const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        return {
            blackout: fileConfig.blackout || envBlackout,
        };
    } catch {
        return { blackout: envBlackout };
    }
}

function writeBookingConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return config;
}

module.exports = { readBookingConfig, writeBookingConfig };
