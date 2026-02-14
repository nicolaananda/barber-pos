const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../cache');
const API_KEY = 'sk-nuovEnVCABMhiwDStHZ3lg'; // In production, this should be in .env
const BASE_URL = 'https://ai.sumopod.com/v1';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
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

    // Prepare prompt
    const prompt = `
    Analyze the following barbershop POS data and provide 3-5 key actionable business insights.
    Focus on profit margins, top performing services/barbers, and customer retention.
    Keep it concise, professional, and motivating. Use bullet points.
    
    Data Summary:
    - Total Revenue: ${formatCurrency(data.profitMargin.overall.totalRevenue)}
    - Gross Margin: ${data.profitMargin.overall.grossMargin.toFixed(1)}%
    - Top Service: ${Object.keys(data.profitMargin.byService)[0] || 'N/A'}
    - Active Customers: ${data.churnRate.activeCustomers}
    - Churn Rate: ${data.churnRate.churnRate.toFixed(1)}%
    - Forecast Trend: ${data.forecast.trend}
    
    Format the response as JSON with a "content" field containing the markdown text.
    `;

    try {
        const response = await axios.post(
            `${BASE_URL}/chat/completions`,
            {
                model: 'gpt-4o-mini', // or appropriate model supported by sumopod
                messages: [
                    { role: 'system', content: 'Anda adalah ahli analis bisnis senior untuk barbershop. Gaya bicara profesional, solutif.' },
                    {
                        role: 'user', content: `
    Analisis data performa bisnis barbershop berikut dan berikan "Executive Summary" singkat (3-4 poin utama).
    
    Data:
    - Pendapatan: ${formatCurrency(data.profitMargin.overall.totalRevenue)}
    - Margin Laba: ${data.profitMargin.overall.grossMargin.toFixed(1)}%
    - Layanan Top: ${Object.keys(data.profitMargin.byService)[0] || '-'}
    - Churn Rate: ${data.churnRate.churnRate.toFixed(1)}%
    - Tren Revenue: ${data.forecast.trend === 'growing' ? 'Naik' : data.forecast.trend === 'declining' ? 'Turun' : 'Stabil'}
    
    Instruksi Khusus:
    1. **JUDUL** setiap poin harus dalam **BAHASA INGGRIS** (contoh: "Maximize Profit Margins").
    2. **PENJELASAN** setiap poin harus dalam **BAHASA INDONESIA**.
    3. Jika Churn Rate 0%, jelaskan ini indikator positif (semua pelanggan aktif dalam 90 hari), tapi ingatkan untuk tetap menjaga relasi.
    4. Jika Tren Revenue "Turun", berikan strategi konkret untuk membalikkan tren (misal: promo bundling layanan top).
    
    Output JSON: { "content": "teks markdown di sini" }
    ` }
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
