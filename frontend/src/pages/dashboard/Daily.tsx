import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Banknote,
    CreditCard,
    DollarSign,
    Receipt,
    User,
    RefreshCcw,
    TrendingUp,
    Calendar,
    Users
} from 'lucide-react';
import { format } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface Transaction {
    id: number;
    invoiceCode: string;
    time: string;
    barberName: string;
    totalAmount: number;
    paymentMethod: string;
    items: any[];
}

interface DailyData {
    totalRevenue: number;
    transactionCount: number;
    cashTotal: number;
    qrisTotal: number;
    topBarber: {
        name: string;
        revenue: number;
        count: number;
    } | null;
    recentTransactions: Transaction[];
}

export default function DailyPage() {
    const [data, setData] = useState<DailyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/dashboard/daily', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch daily data');
            const json = await res.json();
            setData(json);

            // Process chart data: Group interactions by hour
            if (json.recentTransactions) {
                const hours = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 to 23:00
                const hourlyData = hours.map(hour => {
                    const txs = json.recentTransactions.filter((t: Transaction) => {
                        const d = new Date(t.time);
                        return d.getHours() === hour;
                    });
                    const revenue = txs.reduce((sum: number, t: Transaction) => sum + t.totalAmount, 0);
                    return {
                        hour: `${hour}:00`,
                        revenue,
                        count: txs.length
                    };
                });
                setChartData(hourlyData);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!data) return <div className="p-8 text-center text-destructive">Failed to load data.</div>;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Daily Overview</h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(), 'EEEE, dd MMMM yyyy')}
                        <span className="mx-1">•</span>
                        <span className="flex items-center gap-1 text-emerald-500 font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Updates
                        </span>
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} className="gap-2">
                    <RefreshCcw className="w-4 h-4" /> Refresh Data
                </Button>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-indigo-500 shadow-md bg-gradient-to-br from-card to-indigo-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">IDR {data.totalRevenue.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" /> +100% from yesterday (Mock)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-md bg-gradient-to-br from-card to-emerald-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                        <Receipt className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{data.transactionCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices generated today</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-md bg-gradient-to-br from-card to-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Payment Methods</CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 mt-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center gap-1 text-muted-foreground"><Banknote className="w-3 h-3" /> Cash</span>
                                <span className="font-mono font-medium">IDR {data.cashTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center gap-1 text-muted-foreground"><CreditCard className="w-3 h-3" /> QRIS</span>
                                <span className="font-mono font-medium">IDR {data.qrisTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={data.topBarber ? "border-l-4 border-l-amber-500 shadow-md bg-gradient-to-br from-card to-amber-500/5" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
                        <User className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {data.topBarber ? (
                            <>
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{data.topBarber.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10">
                                        {data.topBarber.count} Cuts
                                    </Badge>
                                    <span className="text-xs font-mono font-bold text-muted-foreground">
                                        IDR {data.topBarber.revenue.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground italic">No data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-base">Hourly Revenue Trend</CardTitle>
                        <CardDescription>Revenue breakdown by hour for today</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="hour"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                        formatter={(value: number) => [`IDR ${value.toLocaleString('id-ID')}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#6366f1"
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-base">Customers Activity</CardTitle>
                        <CardDescription>Visits distribution by hour</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis
                                        dataKey="hour"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--muted)' }}
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Table */}
            <Card className="border-border/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest invoices generated today</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 uppercase tracking-wider text-xs font-semibold text-muted-foreground">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Invoice</th>
                                    <th className="p-4">Barber</th>
                                    <th className="p-4 hidden md:table-cell">Details</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.recentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            No transactions found for today.
                                        </td>
                                    </tr>
                                ) : (
                                    data.recentTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-mono text-muted-foreground w-[100px]">
                                                {format(new Date(tx.time), 'HH:mm')}
                                            </td>
                                            <td className="p-4 font-medium">{tx.invoiceCode}</td>
                                            <td className="p-4 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {tx.barberName.charAt(0)}
                                                </div>
                                                {tx.barberName}
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {tx.items.map((i: any) => i.name).join(', ')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold font-mono">
                                                IDR {tx.totalAmount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        tx.paymentMethod === 'cash'
                                                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                            : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                                                    }
                                                >
                                                    {tx.paymentMethod.toUpperCase()}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
