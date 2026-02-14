/**
 * Analytics Business Logic
 * Core calculation functions for business intelligence and reporting
 */

/**
 * Calculate profit margin per service and per barber
 * @param {Array} transactions - Transaction records
 * @param {Array} expenses - Expense records
 * @param {Array} services - Service definitions
 * @returns {Object} Profit margin analysis
 */
function calculateProfitMargin(transactions, expenses, services) {
    // Calculate total revenue
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate gross profit
    const grossProfit = totalRevenue - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Per-service analysis
    const serviceAnalysis = {};
    services.forEach(service => {
        const serviceTransactions = transactions.filter(t => {
            const items = Array.isArray(t.items) ? t.items : JSON.parse(t.items);
            return items.some(item => item.name === service.name);
        });

        const serviceRevenue = serviceTransactions.reduce((sum, t) => {
            const items = Array.isArray(t.items) ? t.items : JSON.parse(t.items);
            const serviceItems = items.filter(item => item.name === service.name);
            return sum + serviceItems.reduce((itemSum, item) => itemSum + (item.price * item.qty), 0);
        }, 0);

        const serviceCount = serviceTransactions.reduce((sum, t) => {
            const items = Array.isArray(t.items) ? t.items : JSON.parse(t.items);
            const serviceItems = items.filter(item => item.name === service.name);
            return sum + serviceItems.reduce((itemSum, item) => itemSum + item.qty, 0);
        }, 0);

        // Calculate commission cost for this service
        const commissionCost = serviceCount * (
            service.commissionType === 'percentage'
                ? service.price * (service.commissionValue / 100)
                : service.commissionValue
        );

        const serviceProfit = serviceRevenue - commissionCost;
        const serviceMargin = serviceRevenue > 0 ? (serviceProfit / serviceRevenue) * 100 : 0;

        serviceAnalysis[service.name] = {
            revenue: serviceRevenue,
            count: serviceCount,
            commissionCost,
            profit: serviceProfit,
            margin: serviceMargin,
            avgPrice: service.price
        };
    });

    // Per-barber analysis
    const barberAnalysis = {};
    transactions.forEach(t => {
        if (!barberAnalysis[t.barberId]) {
            barberAnalysis[t.barberId] = {
                barberName: t.barber?.name || 'Unknown',
                revenue: 0,
                transactionCount: 0,
                totalCommission: 0,
                netRevenue: 0
            };
        }

        const items = Array.isArray(t.items) ? t.items : JSON.parse(t.items);
        barberAnalysis[t.barberId].revenue += t.totalAmount;
        barberAnalysis[t.barberId].transactionCount += 1;

        // Calculate commission for this transaction
        items.forEach(item => {
            const service = services.find(s => s.name === item.name);
            if (service) {
                const commission = service.commissionType === 'percentage'
                    ? item.price * (service.commissionValue / 100) * item.qty
                    : service.commissionValue * item.qty;
                barberAnalysis[t.barberId].totalCommission += commission;
            }
        });
    });

    // Calculate net revenue (revenue - commission) for each barber
    Object.keys(barberAnalysis).forEach(barberId => {
        const barber = barberAnalysis[barberId];
        barber.netRevenue = barber.revenue - barber.totalCommission;
        barber.margin = barber.revenue > 0 ? (barber.netRevenue / barber.revenue) * 100 : 0;
    });

    return {
        overall: {
            totalRevenue,
            totalExpenses,
            grossProfit,
            grossMargin
        },
        byService: serviceAnalysis,
        byBarber: barberAnalysis
    };
}

/**
 * Forecast revenue based on historical trends
 * @param {Array} historicalData - Array of {date, revenue} objects
 * @param {number} periods - Number of periods to forecast
 * @returns {Object} Revenue forecast with predictions
 */
function forecastRevenue(historicalData, periods = 30) {
    if (historicalData.length < 2) {
        return {
            predictions: [],
            trend: 'insufficient_data',
            growthRate: 0
        };
    }

    // Sort by date
    const sorted = historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Simple linear regression
    const n = sorted.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    sorted.forEach((point, index) => {
        const x = index;
        const y = point.revenue;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate moving average for smoothing
    const windowSize = Math.min(7, Math.floor(n / 2));
    const movingAvg = [];
    for (let i = windowSize - 1; i < sorted.length; i++) {
        const window = sorted.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((sum, p) => sum + p.revenue, 0) / windowSize;
        movingAvg.push(avg);
    }

    // Generate predictions
    const predictions = [];
    const lastDate = new Date(sorted[sorted.length - 1].date);

    for (let i = 1; i <= periods; i++) {
        const x = n + i - 1;
        const predictedValue = slope * x + intercept;

        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        predictions.push({
            date: forecastDate.toISOString().split('T')[0],
            predicted: Math.max(0, predictedValue),
            confidence: Math.max(0, 100 - (i * 2)) // Confidence decreases over time
        });
    }

    // Calculate growth rate
    const firstHalf = sorted.slice(0, Math.floor(n / 2));
    const secondHalf = sorted.slice(Math.floor(n / 2));
    const firstAvg = firstHalf.reduce((sum, p) => sum + p.revenue, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.revenue, 0) / secondHalf.length;
    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
        historical: sorted,
        predictions,
        trend: slope > 0 ? 'growing' : slope < 0 ? 'declining' : 'stable',
        growthRate,
        slope,
        intercept
    };
}

/**
 * Segment customers using RFM analysis
 * @param {Array} customers - Customer records with transaction history
 * @param {Array} transactions - All transactions
 * @returns {Object} Customer segmentation
 */
function segmentCustomers(customers, transactions) {
    const now = new Date();
    const customerSegments = [];
    const processedPhones = new Set();

    customers.forEach(customer => {
        // Skip if we already processed this phone number (merge duplicate customers)
        if (processedPhones.has(customer.phone)) return;
        processedPhones.add(customer.phone);

        // Get customer transactions
        const customerTxns = transactions.filter(t => t.customerPhone === customer.phone);

        if (customerTxns.length === 0) {
            return;
        }

        // Recency: Days since last purchase
        const lastVisit = new Date(customer.lastVisit);
        const recencyDays = Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24));

        // Frequency: Number of transactions
        const frequency = customerTxns.length;

        // Monetary: Total amount spent
        const monetary = customerTxns.reduce((sum, t) => sum + t.totalAmount, 0);

        // RFM Scoring (1-5 scale)
        const recencyScore = recencyDays <= 30 ? 5 : recencyDays <= 60 ? 4 : recencyDays <= 90 ? 3 : recencyDays <= 180 ? 2 : 1;
        const frequencyScore = frequency >= 10 ? 5 : frequency >= 7 ? 4 : frequency >= 5 ? 3 : frequency >= 3 ? 2 : 1;
        const monetaryScore = monetary >= 1000000 ? 5 : monetary >= 500000 ? 4 : monetary >= 250000 ? 3 : monetary >= 100000 ? 2 : 1;

        const rfmScore = recencyScore + frequencyScore + monetaryScore;

        // Segment classification
        let segment;
        if (rfmScore >= 13) {
            segment = 'VIP';
        } else if (rfmScore >= 10) {
            segment = 'Regular';
        } else if (recencyScore <= 2 && frequencyScore >= 3) {
            segment = 'At-Risk';
        } else if (recencyScore <= 1) {
            segment = 'Lost';
        } else {
            segment = 'Occasional';
        }

        customerSegments.push({
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone,
            recency: recencyDays,
            frequency,
            monetary,
            recencyScore,
            frequencyScore,
            monetaryScore,
            rfmScore,
            segment
        });
    });

    // Group by segment
    const segments = {
        VIP: customerSegments.filter(c => c.segment === 'VIP'),
        Regular: customerSegments.filter(c => c.segment === 'Regular'),
        'At-Risk': customerSegments.filter(c => c.segment === 'At-Risk'),
        Lost: customerSegments.filter(c => c.segment === 'Lost'),
        Occasional: customerSegments.filter(c => c.segment === 'Occasional')
    };

    return {
        segments,
        summary: {
            VIP: segments.VIP.length,
            Regular: segments.Regular.length,
            'At-Risk': segments['At-Risk'].length,
            Lost: segments.Lost.length,
            Occasional: segments.Occasional.length,
            total: customerSegments.length
        }
    };
}

/**
 * Analyze peak hours and transaction patterns
 * @param {Array} transactions - Transaction records
 * @returns {Object} Peak hours analysis
 */
function analyzePeakHours(transactions) {
    const hourlyData = {};
    const dailyData = {};

    // Initialize data structures
    for (let day = 0; day < 7; day++) {
        dailyData[day] = {};
        for (let hour = 0; hour < 24; hour++) {
            dailyData[day][hour] = { count: 0, revenue: 0 };
        }
    }

    // Aggregate transactions
    transactions.forEach(t => {
        const date = new Date(t.date);
        const day = date.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = date.getHours();

        if (!dailyData[day][hour]) {
            dailyData[day][hour] = { count: 0, revenue: 0 };
        }

        dailyData[day][hour].count += 1;
        dailyData[day][hour].revenue += t.totalAmount;

        if (!hourlyData[hour]) {
            hourlyData[hour] = { count: 0, revenue: 0 };
        }
        hourlyData[hour].count += 1;
        hourlyData[hour].revenue += t.totalAmount;
    });

    // Find peak hours
    const hourlyArray = Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data
    })).sort((a, b) => b.count - a.count);

    const peakHours = hourlyArray.slice(0, 3);
    const offPeakHours = hourlyArray.slice(-3);

    // Day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Format heatmap data
    const heatmapData = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            heatmapData.push({
                day: dayNames[day],
                dayIndex: day,
                hour,
                count: dailyData[day][hour].count,
                revenue: dailyData[day][hour].revenue
            });
        }
    }

    return {
        heatmap: heatmapData,
        peakHours,
        offPeakHours,
        hourlyData,
        dailyData
    };
}

/**
 * Calculate customer churn rate
 * @param {Array} customers - Customer records
 * @param {number} periodDays - Period to consider for churn (default 90 days)
 * @returns {Object} Churn rate analysis
 */
function calculateChurnRate(customers, periodDays = 90) {
    const now = new Date();
    const churnThreshold = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    let activeCustomers = 0;
    let churnedCustomers = 0;
    let atRiskCustomers = 0;
    const atRiskList = [];
    const churnedList = [];

    customers.forEach(customer => {
        const lastVisit = new Date(customer.lastVisit);
        const daysSinceVisit = Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24));

        if (daysSinceVisit <= periodDays) {
            activeCustomers++;

            // At-risk: 60-90 days since last visit
            if (daysSinceVisit >= periodDays * 0.67) {
                atRiskCustomers++;
                atRiskList.push({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    daysSinceVisit,
                    totalVisits: customer.totalVisits
                });
            }
        } else {
            churnedCustomers++;
            churnedList.push({
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                daysSinceVisit,
                totalVisits: customer.totalVisits
            });
        }
    });

    const totalCustomers = activeCustomers + churnedCustomers;
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
    const retentionRate = 100 - churnRate;

    return {
        churnRate,
        retentionRate,
        activeCustomers,
        churnedCustomers,
        atRiskCustomers,
        totalCustomers,
        atRiskList: atRiskList.sort((a, b) => b.daysSinceVisit - a.daysSinceVisit),
        churnedList: churnedList.sort((a, b) => b.totalVisits - a.totalVisits)
    };
}

/**
 * Calculate Customer Lifetime Value (CLV)
 * @param {Array} customers - Customer records
 * @param {Array} transactions - All transactions
 * @returns {Object} CLV analysis
 */
function calculateCLV(customers, transactions) {
    const customerCLV = [];
    const processedPhones = new Set();

    customers.forEach(customer => {
        // Skip if we already processed this phone number (merge duplicate customers)
        if (processedPhones.has(customer.phone)) return;
        processedPhones.add(customer.phone);

        const customerTxns = transactions.filter(t => t.customerPhone === customer.phone);

        if (customerTxns.length === 0) {
            return;
        }

        // Total revenue from customer
        const totalRevenue = customerTxns.reduce((sum, t) => sum + t.totalAmount, 0);

        // Average order value
        const avgOrderValue = totalRevenue / customerTxns.length;

        // Purchase frequency (transactions per month)
        const firstVisit = new Date(Math.min(...customerTxns.map(t => new Date(t.date))));
        const lastVisit = new Date(customer.lastVisit);
        const customerLifespanMonths = Math.max(1, (lastVisit - firstVisit) / (1000 * 60 * 60 * 24 * 30));
        const purchaseFrequency = customerTxns.length / customerLifespanMonths;

        // Estimated customer lifespan (in months)
        // Assume active customers will continue for average lifespan
        const avgLifespanMonths = 12; // Assume 1 year average

        // CLV = Average Order Value × Purchase Frequency × Customer Lifespan
        const clv = avgOrderValue * purchaseFrequency * avgLifespanMonths;

        customerCLV.push({
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone,
            totalRevenue,
            avgOrderValue,
            purchaseFrequency,
            transactionCount: customerTxns.length,
            customerLifespanMonths,
            clv
        });
    });

    // Sort by CLV descending
    customerCLV.sort((a, b) => b.clv - a.clv);

    // Calculate percentiles
    const totalCLV = customerCLV.reduce((sum, c) => sum + c.clv, 0);
    const avgCLV = customerCLV.length > 0 ? totalCLV / customerCLV.length : 0;

    return {
        customers: customerCLV,
        topCustomers: customerCLV.slice(0, 20),
        summary: {
            totalCLV,
            avgCLV,
            totalCustomers: customerCLV.length
        }
    };
}

module.exports = {
    calculateProfitMargin,
    forecastRevenue,
    segmentCustomers,
    analyzePeakHours,
    calculateChurnRate,
    calculateCLV
};
