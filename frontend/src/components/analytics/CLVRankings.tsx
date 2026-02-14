import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Crown, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface CLVCustomer {
    customerId: number;
    name: string;
    phone: string;
    totalRevenue: number;
    avgOrderValue: number;
    purchaseFrequency: number;
    transactionCount: number;
    customerLifespanMonths: number;
    clv: number;
}

interface CLVData {
    customers: CLVCustomer[];
    topCustomers: CLVCustomer[];
    summary: {
        totalCLV: number;
        avgCLV: number;
        totalCustomers: number;
    };
}

export default function CLVRankings() {
    const [data, setData] = useState<CLVData | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'top' | 'all'>('top');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/analytics/customer-lifetime-value`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch CLV data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white border border-zinc-200 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 bg-white border border-zinc-200 rounded-lg">
                <div className="text-zinc-400">No data available</div>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    const chartData = data.topCustomers.slice(0, 10).map(customer => ({
        name: customer.name.length > 15 ? customer.name.substring(0, 12) + '...' : customer.name,
        clv: customer.clv,
        revenue: customer.totalRevenue
    }));

    const displayCustomers = view === 'top' ? data.topCustomers : data.customers;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Total CLV</p>
                            <p className="text-2xl font-bold text-zinc-900 mt-1">
                                {formatCurrency(data.summary.totalCLV)}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-zinc-900" />
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Average CLV</p>
                            <p className="text-2xl font-bold text-zinc-900 mt-1">
                                {formatCurrency(data.summary.avgCLV)}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-zinc-600" />
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Top Customer CLV</p>
                            <p className="text-2xl font-bold text-zinc-900 mt-1">
                                {formatCurrency(data.topCustomers[0]?.clv || 0)}
                            </p>
                        </div>
                        <Crown className="w-8 h-8 text-zinc-400" />
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setView('top')}
                    className={`px-4 py-2 rounded-lg transition-all ${view === 'top'
                        ? 'bg-zinc-900 text-white shadow-md'
                        : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
                        }`}
                >
                    Top 20 Customers
                </button>
                <button
                    onClick={() => setView('all')}
                    className={`px-4 py-2 rounded-lg transition-all ${view === 'all'
                        ? 'bg-zinc-900 text-white shadow-md'
                        : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
                        }`}
                >
                    All Customers
                </button>
            </div>

            {/* CLV Chart */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">Top 10 Customers by CLV</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                        <XAxis type="number" stroke="#71717a" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" stroke="#71717a" width={100} />
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
                        <Bar dataKey="clv" fill="#18181b" name="Customer Lifetime Value" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="revenue" fill="#a1a1aa" name="Total Revenue" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Customer Rankings Table */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 overflow-x-auto shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                    {view === 'top' ? 'Top 20 Customers by CLV' : 'All Customers by CLV'}
                </h3>
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="text-left py-3 px-6 text-zinc-600 font-medium">Rank</th>
                            <th className="text-left py-3 px-6 text-zinc-600 font-medium">Customer</th>
                            <th className="text-right py-3 px-6 text-zinc-600 font-medium">CLV</th>
                            <th className="text-right py-3 px-6 text-zinc-600 font-medium">Total Revenue</th>
                            <th className="text-right py-3 px-6 text-zinc-600 font-medium">Avg Order</th>
                            <th className="text-right py-3 px-6 text-zinc-600 font-medium">Frequency</th>
                            <th className="text-right py-3 px-6 text-zinc-600 font-medium">Visits</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {displayCustomers.slice(0, view === 'top' ? 20 : 50).map((customer, index) => (
                            <tr key={index} className="hover:bg-zinc-50 transition-colors">
                                <td className="py-3 px-6">
                                    <div className="flex items-center gap-2">
                                        {index === 0 && <Crown className="w-4 h-4 text-zinc-900" />}
                                        {index === 1 && <Crown className="w-4 h-4 text-zinc-500" />}
                                        {index === 2 && <Crown className="w-4 h-4 text-zinc-400" />}
                                        <span className="text-zinc-900 font-semibold">#{index + 1}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-6">
                                    <div>
                                        <p className="text-zinc-900 font-medium">{customer.name}</p>
                                        <p className="text-xs text-zinc-500">{customer.phone}</p>
                                    </div>
                                </td>
                                <td className="py-3 px-6 text-right">
                                    <span className="text-zinc-900 font-bold">
                                        {formatCurrency(customer.clv)}
                                    </span>
                                </td>
                                <td className="py-3 px-6 text-right text-zinc-600">
                                    {formatCurrency(customer.totalRevenue)}
                                </td>
                                <td className="py-3 px-6 text-right text-zinc-500">
                                    {formatCurrency(customer.avgOrderValue)}
                                </td>
                                <td className="py-3 px-6 text-right text-zinc-500">
                                    {customer.purchaseFrequency.toFixed(1)}/mo
                                </td>
                                <td className="py-3 px-6 text-right text-zinc-500">
                                    {customer.transactionCount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CLV Insights */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">💎 CLV Insights & Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-900 mb-2 flex items-center gap-2">
                            <Crown className="w-4 h-4" /> VIP Treatment
                        </h4>
                        <p className="text-sm text-zinc-600 mb-2">
                            Top 20% of customers generate significant value.
                        </p>
                        <ul className="text-xs text-zinc-500 space-y-1">
                            <li>• Exclusive perks and priority booking</li>
                            <li>• Personal thank you messages</li>
                            <li>• Special birthday/anniversary offers</li>
                            <li>• Early access to new services</li>
                        </ul>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Increase CLV
                        </h4>
                        <p className="text-sm text-zinc-600 mb-2">
                            Strategies to boost customer lifetime value:
                        </p>
                        <ul className="text-xs text-zinc-500 space-y-1">
                            <li>• Upsell premium services</li>
                            <li>• Introduce product sales (pomade, etc.)</li>
                            <li>• Subscription/membership programs</li>
                            <li>• Referral incentives</li>
                        </ul>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-900 mb-2 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" /> Frequency Boost
                        </h4>
                        <p className="text-sm text-zinc-600 mb-2">
                            Increase visit frequency:
                        </p>
                        <ul className="text-xs text-zinc-500 space-y-1">
                            <li>• Reminder messages every 2-3 weeks</li>
                            <li>• "Next visit" discount coupons</li>
                            <li>• Loyalty punch cards</li>
                            <li>• Seasonal promotions</li>
                        </ul>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-900 mb-2">📊 Key Metrics</h4>
                        <ul className="text-xs text-zinc-500 space-y-1">
                            <li>• Avg CLV: <span className="text-zinc-900 font-semibold">{formatCurrency(data.summary.avgCLV)}</span></li>
                            <li>• Top customer: <span className="text-zinc-900 font-semibold">{data.topCustomers[0]?.name}</span></li>
                            <li>• Total potential value: <span className="text-zinc-900 font-semibold">{formatCurrency(data.summary.totalCLV)}</span></li>
                            <li>• Focus on retention to maximize CLV</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
