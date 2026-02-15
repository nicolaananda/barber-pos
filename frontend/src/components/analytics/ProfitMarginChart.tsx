import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ProfitMarginData {
    overall: {
        totalRevenue: number;
        totalExpenses: number;
        grossProfit: number;
        grossMargin: number;
    };
    byService: Record<string, {
        revenue: number;
        count: number;
        commissionCost: number;
        profit: number;
        margin: number;
        avgPrice: number;
    }>;
    byBarber: Record<string, {
        barberName: string;
        revenue: number;
        transactionCount: number;
        totalCommission: number;
        netRevenue: number;
        margin: number;
        transactions: number;
    }>;
}

interface ProfitMarginChartProps {
    startDate?: string;
    endDate?: string;
}

export default function ProfitMarginChart({ startDate, endDate }: ProfitMarginChartProps) {
    const [data, setData] = useState<ProfitMarginData | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'service' | 'barber'>('service');

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await axios.get(`${API_BASE_URL}/analytics/profit-margin?${params}`);
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch profit margin data:', error);
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

    if (!data) {
        return <div className="text-center text-zinc-400 py-8">No data available</div>;
    }

    // Prepare service chart data
    const serviceChartData = Object.entries(data.byService)
        .map(([name, stats]) => ({
            name: name.length > 15 ? name.substring(0, 12) + '...' : name,
            revenue: stats.revenue,
            profit: stats.profit,
            margin: stats.margin
        }))
        .sort((a, b) => b.revenue - a.revenue);

    // Prepare barber chart data
    const barberChartData = Object.entries(data.byBarber)
        .map(([_, stats]) => ({
            name: stats.barberName,
            revenue: stats.revenue,
            profit: stats.netRevenue,
            margin: stats.margin
        }))
        .sort((a, b) => b.revenue - a.revenue);

    const activeChartData = view === 'service' ? serviceChartData : barberChartData;

    // Pie chart data (Revenue Source)
    const pieData = serviceChartData.slice(0, 5).map((item, index) => ({
        name: item.name,
        value: item.revenue
    }));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-zinc-900 tracking-tight break-words">
                                {formatCurrency(data.overall.totalRevenue)}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-100 transition-colors">
                            <DollarSign className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600" />
                        </div>
                    </div>
                </div>
                <div className="group bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Gross Profit</p>
                            <p className="text-2xl font-bold text-zinc-900 tracking-tight break-words">
                                {formatCurrency(data.overall.grossProfit)}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="group bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Margin</p>
                            <p className="text-2xl font-bold text-zinc-900 tracking-tight break-words">
                                {data.overall.grossMargin.toFixed(1)}%
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                            <span className="text-sm font-bold text-blue-600">%</span>
                        </div>
                    </div>
                </div>
                <div className="group bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Total Expenses</p>
                            <p className="text-2xl font-bold text-zinc-900 tracking-tight break-words">
                                {formatCurrency(data.overall.totalExpenses)}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Bar Chart */}
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-zinc-900">Profit Analysis</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setView('service')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${view === 'service'
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                            >
                                By Service
                            </button>
                            <button
                                onClick={() => setView('barber')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${view === 'barber'
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                            >
                                By Barber
                            </button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={activeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                            <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#71717a" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend />
                            <Bar dataKey="revenue" fill="#18181b" name="Revenue" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" fill="#a1a1aa" name="Profit" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-6">Revenue Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Name</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Revenue</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Profit</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {activeChartData.filter(item => item.revenue > 0).map((item, index) => (
                                <tr key={index} className="hover:bg-zinc-50 transition-colors">
                                    <td className="py-3 px-6 text-zinc-900 font-medium">{item.name}</td>
                                    <td className="py-3 px-6 text-right text-zinc-900">{formatCurrency(item.revenue)}</td>
                                    <td className="py-3 px-6 text-right text-zinc-900">{formatCurrency(item.profit)}</td>
                                    <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.margin >= 50 ? 'bg-zinc-100 text-zinc-900' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {item.margin.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
