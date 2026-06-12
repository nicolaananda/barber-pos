const { listFiles, deleteFile } = require('../lib/r2');

async function main() {
    const prefix = process.argv[2];
    const mode = process.argv[3] || 'dry-run';

    if (!prefix) {
        throw new Error('Usage: node scripts/r2-delete-prefix.js <prefix> [dry-run|apply]');
    }

    const files = await listFiles(prefix);
    const keys = files.map((file) => file.Key).filter(Boolean);

    console.log(`Found ${keys.length} object(s) under prefix ${prefix}`);
    console.log(keys.slice(0, 100));

    if (mode !== 'apply') {
        console.log('Dry run only. Pass `apply` as second arg to delete.');
        return;
    }

    for (const key of keys) {
        await deleteFile(key);
        console.log(`Deleted ${key}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
