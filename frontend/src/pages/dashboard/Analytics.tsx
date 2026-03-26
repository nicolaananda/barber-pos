import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, UserX, Crown, Calendar, Sparkles, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ProfitMarginChart from '../../components/analytics/ProfitMarginChart';
import RevenueForecast from '../../components/analytics/RevenueForecast';
import CustomerSegmentation from '../../components/analytics/CustomerSegmentation';
import PeakHoursHeatmap from '../../components/analytics/PeakHoursHeatmap';
import ChurnRateDisplay from '../../components/analytics/ChurnRateDisplay';
import CLVRankings from '../../components/analytics/CLVRankings';
import BookingHistoryTable from '../../components/analytics/BookingHistoryTable';
import AIInsights from '../../components/analytics/AIInsights';
import { API_BASE_URL } from '../../lib/api';

type AnalyticsTab =
    | 'overview'
    | 'profit-margin'
    | 'revenue-forecast'
    | 'customer-segmentation'
    | 'peak-hours'
    | 'churn-rate'
    | 'clv'
    | 'booking-history';

interface DashboardStats {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueGrowth: string;
    transactionCount: number;
}

function formatIDR(n: number) {
    if (n >= 1_000_000) return `IDR ${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `IDR ${(n / 1_000).toFixed(0)}rb`;
    return `IDR ${n.toLocaleString('id-ID')}`;
}

function KPICard({ label, value, sub, icon: Icon, color }: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div className={`bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex items-start gap-3`}>
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide truncate">{label}</p>
                <p className="text-xl font-black text-zinc-900 leading-tight">{value}</p>
                {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function Analytics() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/dashboard/stats`)
            .then(r => r.json())
            .then(d => setStats(d.stats))
            .catch(() => {});
    }, []);

    const tabs = [
        { id: 'overview', label: 'AI Review', icon: Sparkles },
        { id: 'profit-margin', label: 'Profit Margin', icon: BarChart3 },
        { id: 'revenue-forecast', label: 'Forecast', icon: TrendingUp },
        { id: 'customer-segmentation', label: 'Segments', icon: Users },
        { id: 'peak-hours', label: 'Peak Hours', icon: Clock },
        { id: 'churn-rate', label: 'Churn', icon: UserX },
        { id: 'clv', label: 'CLV', icon: Crown },
        { id: 'booking-history', label: 'Bookings', icon: Calendar },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <AIInsights />
                        <div className="flex flex-col gap-6">
                            <ProfitMarginChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
                            <PeakHoursHeatmap startDate={dateRange.startDate} endDate={dateRange.endDate} />
                        </div>
                    </div>
                );
            case 'profit-margin':
                return <ProfitMarginChart startDate={dateRange.startDate} endDate={dateRange.endDate} />;
            case 'revenue-forecast':
                return <RevenueForecast />;
            case 'customer-segmentation':
                return <CustomerSegmentation />;
            case 'peak-hours':
                return <PeakHoursHeatmap startDate={dateRange.startDate} endDate={dateRange.endDate} />;
            case 'churn-rate':
                return <ChurnRateDisplay />;
            case 'clv':
                return <CLVRankings />;
            case 'booking-history':
                return <BookingHistoryTable />;
            default:
                return null;
        }
    };

    const showDateRange = ['overview', 'profit-margin', 'peak-hours'].includes(activeTab);
    const growth = stats ? parseFloat(stats.revenueGrowth) : null;

    return (
        <div className="min-h-screen bg-zinc-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-zinc-900 mb-1 flex items-center gap-3">
                        <BarChart3 className="w-10 h-10 text-zinc-900" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-zinc-500 text-sm">Comprehensive business intelligence and AI-powered insights</p>
                </div>

                {/* KPI Summary Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <KPICard
                            label="Revenue Bulan Ini"
                            value={formatIDR(stats.totalRevenue)}
                            sub={growth !== null
                                ? `${growth >= 0 ? '+' : ''}${growth}% vs bulan lalu`
                                : undefined}
                            icon={TrendingUp}
                            color="bg-emerald-500"
                        />
                        <KPICard
                            label="Net Profit"
                            value={formatIDR(stats.netProfit)}
                            sub={`Expenses: ${formatIDR(stats.totalExpenses)}`}
                            icon={Wallet}
                            color={stats.netProfit >= 0 ? 'bg-zinc-800' : 'bg-red-500'}
                        />
                        <KPICard
                            label="Total Transaksi"
                            value={stats.transactionCount.toLocaleString('id-ID')}
                            sub="Bulan ini"
                            icon={Receipt}
                            color="bg-blue-500"
                        />
                        <KPICard
                            label="Revenue Growth"
                            value={growth !== null ? `${growth >= 0 ? '+' : ''}${growth}%` : '—'}
                            sub="vs bulan lalu"
                            icon={growth !== null && growth >= 0 ? TrendingUp : TrendingDown}
                            color={growth !== null && growth >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
                        />
                    </div>
                )}

                {/* Date Range Filter */}
                {showDateRange && (
                    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="text-sm text-zinc-600 font-medium">Date Range:</label>
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            />
                            <span className="text-zinc-400">to</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white border border-zinc-200 rounded-lg p-2 mb-6 overflow-x-auto shadow-sm">
                    <div className="flex gap-1 min-w-max">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isAI = tab.id === 'overview';
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md transition-all whitespace-nowrap font-medium text-sm ${
                                        isActive
                                            ? 'bg-zinc-900 text-white shadow-md'
                                            : isAI
                                            ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-300' : isAI ? 'text-purple-500' : 'text-zinc-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="animate-fadeIn">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
