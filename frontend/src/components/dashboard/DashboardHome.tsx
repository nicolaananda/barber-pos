import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardData {
    stats: {
        totalRevenue: number;
        revenueGrowth: string;
        transactionCount: number;
        activeShift: boolean;
        activeBarbers: number;
        lastShiftStart: string;
    };
    chartData: { name: string; total: number }[];
    recentActivity: {
        id: string;
        barberName: string;
        serviceName: string;
        amount: number;
        time: string;
    }[];
}

import { API_BASE_URL } from '@/lib/api';

export function DashboardHome() {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [bookingSummary, setBookingSummary] = useState<{ pending: any[]; upcoming: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [statsRes, bookingsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/bookings/summary`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (statsRes.ok) {
                    const json = await statsRes.json();
                    setData(json);
                }
                if (bookingsRes.ok) {
                    const json = await bookingsRes.json();
                    setBookingSummary(json);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    const { stats, chartData, recentActivity } = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-8 pb-20">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        Dashboard Overview
                    </h2>
                    <p className="text-muted-foreground">
                        Welcome back to your professional command center.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="default"
                        className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-200/50 transition-all hover:scale-105"
                        onClick={() => navigate('/pos')}
                    >
                        Launch POS Station
                    </Button>
                </div>
            </div>

            {/* Quick Actions / Booking Summary */}
            {bookingSummary && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-amber-50/50 border-amber-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                                Pending Bookings
                            </CardTitle>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-200">
                                {bookingSummary.pending.length} Waiting
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {bookingSummary.pending.length === 0 ? (
                                    <p className="text-sm text-amber-700/60 italic">No pending bookings.</p>
                                ) : (
                                    bookingSummary.pending.map((booking: any) => (
                                        <div key={booking.id} className="bg-white p-3 rounded-md border border-amber-100 shadow-sm flex justify-between items-center group hover:border-amber-300 transition-all cursor-pointer" onClick={() => navigate('/dashboard/bookings')}>
                                            <div>
                                                <p className="font-semibold text-zinc-900 text-sm">{booking.customerName}</p>
                                                <p className="text-xs text-zinc-500">{booking.serviceName} • {booking.timeSlot}</p>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                                                Review
                                            </Button>
                                        </div>
                                    ))
                                )}
                                {bookingSummary.pending.length > 0 && (
                                    <Button variant="link" className="px-0 text-amber-800 text-xs w-full mt-2 h-auto" onClick={() => navigate('/dashboard/bookings')}>
                                        View All Pending Bookings &rarr;
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50/50 border-emerald-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-emerald-900 uppercase tracking-wider">
                                Upcoming Customers
                            </CardTitle>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200">
                                Next 2 Hours
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {bookingSummary.upcoming.length === 0 ? (
                                    <p className="text-sm text-emerald-700/60 italic">No upcoming bookings soon.</p>
                                ) : (
                                    bookingSummary.upcoming.map((booking: any) => (
                                        <div key={booking.id} className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-zinc-900 text-sm">{booking.customerName}</p>
                                                <p className="text-xs text-zinc-500">{booking.timeSlot} w/ {booking.barberName}</p>
                                            </div>
                                            <div className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                CONFIRMED
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card className="bg-card border-zinc-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Revenue
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-zinc-900" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            IDR {stats.totalRevenue.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span
                                className={
                                    Number(stats.revenueGrowth) > 0
                                        ? 'text-emerald-600 font-bold'
                                        : 'text-zinc-500'
                                }
                            >
                                {Number(stats.revenueGrowth) > 0 ? '+' : ''}
                                {stats.revenueGrowth}%
                            </span>{' '}
                            from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-zinc-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Transactions
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-zinc-900" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {stats.transactionCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Processed this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-zinc-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground font-bold">
                            Weekly Revenue Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#52525b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Rp${value}`}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e4e4e7',
                                        borderRadius: '8px',
                                        color: '#18181b',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    formatter={(value: number) => [
                                        `IDR ${value.toLocaleString('id-ID')}`,
                                        'Revenue',
                                    ]}
                                    cursor={{ fill: '#f4f4f5' }}
                                />
                                <Bar dataKey="total" fill="#18181b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-card border-zinc-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground font-bold">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No recent transactions.
                                </p>
                            ) : (
                                recentActivity.map((tx) => (
                                    <div
                                        className="flex items-center group cursor-default"
                                        key={tx.id}
                                    >
                                        <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold border border-zinc-200 group-hover:bg-zinc-200 transition-colors text-xs">
                                            {tx.barberName[0]}
                                        </div>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none text-foreground">
                                                {tx.barberName}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                {tx.serviceName}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-mono font-medium text-zinc-900 bg-zinc-50 px-2 py-0.5 rounded text-xs border border-zinc-100">
                                            +IDR {tx.amount.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
