import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, UserX, Crown, Calendar, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ProfitMarginChart from '../../components/analytics/ProfitMarginChart';
import RevenueForecast from '../../components/analytics/RevenueForecast';
import CustomerSegmentation from '../../components/analytics/CustomerSegmentation';
import PeakHoursHeatmap from '../../components/analytics/PeakHoursHeatmap';
import ChurnRateDisplay from '../../components/analytics/ChurnRateDisplay';
import CLVRankings from '../../components/analytics/CLVRankings';
import BookingHistoryTable from '../../components/analytics/BookingHistoryTable';
import AIInsights from '../../components/analytics/AIInsights';

type AnalyticsTab =
    | 'overview'
    | 'profit-margin'
    | 'revenue-forecast'
    | 'customer-segmentation'
    | 'peak-hours'
    | 'churn-rate'
    | 'clv'
    | 'booking-history';

export default function Analytics() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    const tabs = [
        { id: 'overview', label: 'AI Review', icon: Sparkles },
        { id: 'profit-margin', label: 'Profit Margin', icon: BarChart3 },
        { id: 'revenue-forecast', label: 'Revenue Forecast', icon: TrendingUp },
        { id: 'customer-segmentation', label: 'Customer Segments', icon: Users },
        { id: 'peak-hours', label: 'Peak Hours', icon: Clock },
        { id: 'churn-rate', label: 'Churn Rate', icon: UserX },
        { id: 'clv', label: 'Customer Value', icon: Crown },
        { id: 'booking-history', label: 'Booking History', icon: Calendar }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <AIInsights />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

    return (
        <div className="min-h-screen bg-zinc-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-zinc-900 mb-2 flex items-center gap-3">
                        <BarChart3 className="w-10 h-10 text-zinc-900" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-zinc-500">
                        Comprehensive business intelligence and AI-powered insights
                    </p>
                </div>

                {/* Date Range Filter (for applicable tabs) */}
                {showDateRange && (
                    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="text-sm text-zinc-600 font-medium">Date Range:</label>
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            />
                            <span className="text-zinc-400">to</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white border border-zinc-200 rounded-lg p-2 mb-6 overflow-x-auto shadow-sm">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isAI = tab.id === 'overview';
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all whitespace-nowrap font-medium text-sm ${isActive
                                        ? 'bg-zinc-900 text-white shadow-md'
                                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                                        } ${isAI && !isActive ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : ''}`}
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

