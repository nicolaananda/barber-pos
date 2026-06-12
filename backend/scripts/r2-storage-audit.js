const prisma = require('../lib/prisma');
const { listFiles } = require('../lib/r2');

async function main() {
    const proofFiles = await listFiles('proofs/');
    const backupFiles = await listFiles('backups/');

    const bookings = await prisma.booking.findMany({
        where: { paymentProof: { not: null } },
        select: { paymentProof: true }
    });

    const referencedProofKeys = new Set(
        bookings
            .map((booking) => booking.paymentProof)
            .filter(Boolean)
            .map((url) => {
                const marker = '/proofs/';
                const idx = url.indexOf(marker);
                return idx >= 0 ? url.slice(idx + 1) : null;
            })
            .filter(Boolean)
    );

    const orphanProofs = proofFiles
        .map((file) => file.Key)
        .filter((key) => key && !referencedProofKeys.has(key));

    console.log(JSON.stringify({
        proofCount: proofFiles.length,
        backupCount: backupFiles.length,
        orphanProofCount: orphanProofs.length,
        orphanProofs: orphanProofs.slice(0, 100),
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
