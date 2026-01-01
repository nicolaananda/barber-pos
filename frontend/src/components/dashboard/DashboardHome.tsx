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
    const navigate = useNavigate(); // Replaces useRouter
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
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
        return <div className="p-8 text-center animate-pulse">Loading Dashboard...</div>;
    }

    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    const { stats, chartData, recentActivity } = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-8">
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card className="bg-card border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Revenue
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            IDR {stats.totalRevenue.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span
                                className={
                                    Number(stats.revenueGrowth) > 0
                                        ? 'text-zinc-900 font-bold'
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
                <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Transactions
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.transactionCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Processed this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-foreground">
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
                <Card className="col-span-3 bg-card border-border shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-foreground">Recent Activity</CardTitle>
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
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 group-hover:border-primary/50 transition-colors">
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
                                        <div className="ml-auto font-mono font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-xs border border-zinc-200">
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
