const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../cache');
const API_KEY = process.env.AI_API_KEY || '';
const BASE_URL = process.env.AI_BASE_URL || 'http://localhost:20128/v1';
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Cleanup cache files older than 7 days on startup
try {
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > SEVEN_DAYS) {
            fs.unlinkSync(filePath);
            console.log(`[Cache Cleanup] Deleted old cache file: ${file}`);
        }
    }
} catch (err) {
    console.error('Cache cleanup error:', err);
}

/**
 * Generate analytics insights using OpenAI
 * @param {Object} data - Analytics data to analyze
 * @returns {Promise<string>} - AI generated insights
 */
async function generateAnalyticsInsights(data) {
    const today = new Date().toISOString().split('T')[0];
    const cacheFile = path.join(CACHE_DIR, `analytics_insights_${today}.json`);

    // Check cache first
    if (fs.existsSync(cacheFile)) {
        try {
            const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            console.log('Serving analytics insights from cache');
            return cachedData.content;
        } catch (err) {
            console.error('Error reading cache:', err);
        }
    }

    console.log('Generating new analytics insights via OpenAI...');

    try {
        const response = await axios.post(
            `${BASE_URL}/chat/completions`,
            {
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `Anda adalah analis bisnis senior untuk barbershop Indonesia.
Berikan analisis ringkas, objektif, dan dapat langsung ditindaklanjuti.
Gunakan hanya data yang diberikan; jangan mengarang angka, penyebab, atau fakta.
Prioritaskan dampak terhadap pendapatan, margin laba, retensi pelanggan, dan tren bisnis.`
                    },
                    {
                        role: 'user', content: `
Buat Executive Summary performa bisnis berdasarkan data berikut:

- Pendapatan: ${formatCurrency(data.profitMargin.overall.totalRevenue)}
- Margin laba kotor: ${data.profitMargin.overall.grossMargin.toFixed(1)}%
- Layanan teratas: ${Object.keys(data.profitMargin.byService)[0] || 'Tidak tersedia'}
- Pelanggan aktif: ${data.churnRate.activeCustomers}
- Churn rate: ${data.churnRate.churnRate.toFixed(1)}%
- Tren pendapatan: ${data.forecast.trend === 'growing' ? 'Naik' : data.forecast.trend === 'declining' ? 'Turun' : 'Stabil'}

Ketentuan:
1. Tulis 3-4 poin dalam format markdown bullet.
2. Awali setiap poin dengan judul singkat berbahasa Inggris dalam huruf tebal.
3. Tulis penjelasan berbahasa Indonesia, maksimal dua kalimat per poin.
4. Jelaskan makna data, lalu berikan satu tindakan konkret yang relevan.
5. Jangan menyebut angka atau kondisi yang tidak tersedia pada data.
6. Jika churn rate 0%, nyatakan bahwa seluruh pelanggan terhitung aktif dalam 90 hari dan sarankan langkah menjaga relasi.
7. Jika tren pendapatan turun, sarankan strategi konkret untuk memulihkannya, seperti bundling layanan teratas, tanpa menjanjikan hasil.
8. Kembalikan JSON valid saja tanpa code fence dengan bentuk: { "content": "teks markdown" }.
`
                    }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content;

        // Try to parse JSON from the response
        try {
            // Remove markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            const jsonResponse = JSON.parse(cleanContent);
            if (jsonResponse.content) {
                content = jsonResponse.content;
            }
        } catch (e) {
            console.log('Failed to parse JSON from AI response, using raw content');
        }

        // Cache the result
        fs.writeFileSync(cacheFile, JSON.stringify({ content, timestamp: new Date().toISOString() }));

        return content;
    } catch (error) {
        console.error('AI API Error:', error.response?.data || error.message);
        return "Unable to generate AI insights at this time. Please try again later.";
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}

module.exports = { generateAnalyticsInsights };
