const { PrismaClient } = require('@prisma/client');

// Singleton pattern untuk Prisma Client
// Mencegah multiple instances yang menyebabkan connection pool exhaustion
let prisma;

if (!global.prisma) {
    if (process.env.NODE_ENV === 'production') {
        global.prisma = new PrismaClient({
            log: ['error', 'warn'],
        });
    } else {
        // Development: log lebih detail
        global.prisma = new PrismaClient({
            log: ['error', 'warn'],
            // Disable query logging di development untuk mengurangi overhead
        });
    }
}

prisma = global.prisma;

module.exports = prisma;
