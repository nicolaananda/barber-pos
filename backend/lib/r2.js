const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

async function uploadFile(buffer, filename, contentType) {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Return the public URL
        return `${PUBLIC_URL}/${filename}`;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw new Error('Failed to upload file to storage');
    }
}

module.exports = {
    uploadFile
};
