import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';


interface ForecastData {
    historical: Array<{ date: string; revenue: number }>;
    predictions: Array<{ date: string; predicted: number }>;
    trend: 'growing' | 'declining' | 'stable' | 'insufficient_data';
    growthRate: number;
}

interface RevenueForecastProps {
    periods?: number;
}

export default function RevenueForecast({ periods = 30 }: RevenueForecastProps) {
    const [data, setData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriods, setSelectedPeriods] = useState(periods);

    useEffect(() => {
        fetchData();
    }, [selectedPeriods]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await apiFetch<{ data: ForecastData }>(
                `/analytics/revenue-forecast?periods=${selectedPeriods}`
            );
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch revenue forecast:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
            </div>
        );
    }

    if (!data || data.trend === 'insufficient_data') {
        return <div className="text-center text-zinc-400 py-8">Data belum cukup untuk membuat proyeksi regresi sederhana</div>;
    }

    // Combine historical and predicted data for chart
    const chartData = [
        ...data.historical.map(item => ({
            date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            actual: item.revenue,
            predicted: null
        })),
        ...data.predictions.map(item => ({
            date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            actual: null,
            predicted: item.predicted
        }))
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    const getTrendIcon = () => {
        switch (data.trend) {
            case 'growing':
                return <TrendingUp className="w-6 h-6 text-zinc-900" />;
            case 'declining':
                return <TrendingDown className="w-6 h-6 text-zinc-500" />;
            default:
                return <Minus className="w-6 h-6 text-zinc-400" />;
        }
    };


    const avgHistoricalRevenue = data.historical.reduce((sum, item) => sum + item.revenue, 0) / data.historical.length;
    const avgPredictedRevenue = data.predictions.reduce((sum, item) => sum + item.predicted, 0) / data.predictions.length;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Trend</p>
                            <p className="text-2xl font-bold text-zinc-900 mt-1 capitalize">{data.trend}</p>
                        </div>
                        {getTrendIcon()}
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Growth Rate</p>
                            <p className={`text-2xl font-bold mt-1 ${data.growthRate >= 0 ? 'text-zinc-900' : 'text-zinc-500'}`}>
                                {data.growthRate >= 0 ? '+' : ''}{data.growthRate.toFixed(1)}%
                            </p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-zinc-400" />
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Avg Predicted Revenue</p>
                            <p className="text-xl font-bold text-zinc-900 mt-1">
                                {formatCurrency(avgPredictedRevenue)}
                            </p>
                        </div>
                        <Calendar className="w-6 h-6 text-zinc-400" />
                    </div>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
                {[7, 14, 30, 60].map(period => (
                    <button
                        key={period}
                        onClick={() => setSelectedPeriods(period)}
                        className={`px-4 py-2 rounded-lg transition-all ${selectedPeriods === period
                            ? 'bg-zinc-900 text-white'
                            : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                            }`}
                    >
                        {period} Days
                    </button>
                ))}
            </div>

            {/* Forecast Chart */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">Proyeksi Pendapatan (regresi linear sederhana)</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#18181b" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#71717a"
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="#71717a"
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            labelStyle={{ color: '#18181b' }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="#18181b"
                            fillOpacity={1}
                            fill="url(#colorActual)"
                            name="Actual Revenue"
                        />
                        <Area
                            type="monotone"
                            dataKey="predicted"
                            stroke="#a1a1aa"
                            strokeDasharray="5 5"
                            fillOpacity={1}
                            fill="url(#colorPredicted)"
                            name="Predicted Revenue"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Predictions Table */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Detailed Predictions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Date</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Predicted Revenue</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {data.predictions.slice(0, 10).map((item, index) => (
                                <tr key={index} className="hover:bg-zinc-50 transition-colors">
                                    <td className="py-3 px-6 text-zinc-900">
                                        {new Date(item.date).toLocaleDateString('id-ID', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="py-3 px-6 text-right text-zinc-900 font-semibold">
                                        {formatCurrency(item.predicted)}
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.confidence >= 80
                                            ? 'bg-zinc-100 text-zinc-900'
                                            : item.confidence >= 60
                                                ? 'bg-zinc-50 text-zinc-600'
                                                : 'bg-zinc-50 text-zinc-400'
                                            }`}>
                                            {item.confidence.toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">📊 Insights</h3>
                <ul className="space-y-2 text-zinc-600">
                    <li>
                        • Your revenue is currently <span className="font-semibold text-zinc-900">{data.trend}</span>
                        {data.growthRate !== 0 && (
                            <span> at a rate of <span className="font-semibold text-zinc-900">
                                {data.growthRate >= 0 ? '+' : ''}{data.growthRate.toFixed(1)}%
                            </span></span>
                        )}
                    </li>
                    <li>
                        • Average historical revenue: <span className="font-semibold text-zinc-900">{formatCurrency(avgHistoricalRevenue)}</span>
                    </li>
                    <li>
                        • Expected average revenue (next {selectedPeriods} days): <span className="font-semibold text-zinc-900">{formatCurrency(avgPredictedRevenue)}</span>
                    </li>
                    {data.growthRate > 10 && (
                        <li className="text-zinc-600">
                            ✨ Strong growth detected! Consider expanding capacity or services.
                        </li>
                    )}
                    {data.growthRate < -10 && (
                        <li className="text-zinc-500">
                            ⚠️ Revenue declining. Consider promotional campaigns or customer retention strategies.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
