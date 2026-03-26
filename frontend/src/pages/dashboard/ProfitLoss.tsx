import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Wallet,
    Plus,
    Landmark,
    Trash2,
    Pencil,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';

interface ProfitLossData {
    range: { start: string; end: string };
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        totalOpex: number;
        totalPayroll: number;
        totalCapital: number;
        netProfit: number;
        profitMargin: number;
    };
    comparison: {
        prevRevenue: number;
        prevExpenses: number;
        prevNetProfit: number;
        revenueChange: number | null;
        expensesChange: number | null;
        netProfitChange: number | null;
    };
    breakdown: {
        expenses: { category: string; amount: number }[];
        revenue: { method: string; amount: number }[];
        payroll: { period: string; amount: number }[];
    };
    dailyTrend: { date: string; revenue: number; expenses: number }[];
}

const DATE_PRESETS = [
    {
        label: 'Bulan Ini',
        getRange: () => ({
            startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        }),
    },
    {
        label: 'Bulan Lalu',
        getRange: () => ({
            startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        }),
    },
    {
        label: '3 Bulan',
        getRange: () => ({
            startDate: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        }),
    },
    {
        label: 'Tahun Ini',
        getRange: () => ({
            startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
            endDate: format(endOfYear(new Date()), 'yyyy-MM-dd'),
        }),
    },
];

function ChangeBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-xs text-zinc-400">No prev data</span>;
    const isUp = value >= 0;
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}

function formatIDR(amount: number) {
    return `IDR ${amount.toLocaleString('id-ID')}`;
}

const CHART_COLORS = {
    revenue: '#10b981',
    expenses: '#ef4444',
};

function TrendChart({ data }: { data: { date: string; revenue: number; expenses: number }[] }) {
    if (!data || data.length === 0) {
        return <div className="h-48 flex items-center justify-center text-zinc-400 text-sm italic">No trend data for this period</div>;
    }

    const formatted = data.map(d => ({
        ...d,
        label: format(new Date(d.date), 'd MMM'),
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.expenses} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={CHART_COLORS.expenses} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    width={52}
                />
                <Tooltip
                    formatter={(value: number) => formatIDR(value)}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke={CHART_COLORS.expenses} strokeWidth={2} fill="url(#expGrad)" dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default function ProfitLossPage() {
    const [data, setData] = useState<ProfitLossData | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [activePreset, setActivePreset] = useState<string>('Bulan Ini');

    const [isCapitalDialogOpen, setIsCapitalDialogOpen] = useState(false);
    const [capitalLoading, setCapitalLoading] = useState(false);
    const [capitalHistory, setCapitalHistory] = useState<any[]>([]);
    const [editingCapitalId, setEditingCapitalId] = useState<number | null>(null);
    const [capitalForm, setCapitalForm] = useState({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
    });
    const [totalBalanceAll, setTotalBalanceAll] = useState<any>(null);

    useEffect(() => {
        fetchData();
        fetchTotalBalanceAll();
    }, []);

    const fetchData = async (start = startDate, end = endDate) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams({ startDate: start, endDate: end }).toString();
            const [plRes, capitalRes] = await Promise.all([
                fetch(`${API_BASE_URL}/dashboard/profit-loss?${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch(`${API_BASE_URL}/capital`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
            ]);
            if (!plRes.ok || !capitalRes.ok) throw new Error('Failed to fetch data');
            const [plData, capitalData] = await Promise.all([plRes.json(), capitalRes.json()]);
            setData(plData);
            setCapitalHistory(capitalData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTotalBalanceAll = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/dashboard/total-balance-all`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            setTotalBalanceAll(await res.json());
        } catch {
            // silent
        }
    };

    const applyPreset = (preset: typeof DATE_PRESETS[0]) => {
        const range = preset.getRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        setActivePreset(preset.label);
        fetchData(range.startDate, range.endDate);
    };

    const handleApply = () => {
        setActivePreset('');
        fetchData(startDate, endDate);
    };

    const handleAddCapital = async (e: React.FormEvent) => {
        e.preventDefault();
        setCapitalLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = editingCapitalId
                ? `${API_BASE_URL}/capital/${editingCapitalId}`
                : `${API_BASE_URL}/capital`;
            const res = await fetch(url, {
                method: editingCapitalId ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(capitalForm),
            });
            if (!res.ok) throw new Error();
            setIsCapitalDialogOpen(false);
            setCapitalForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
            setEditingCapitalId(null);
            fetchData();
            fetchTotalBalanceAll();
        } catch {
            alert('Failed to save capital entry');
        } finally {
            setCapitalLoading(false);
        }
    };

    const handleEditCapital = (item: any) => {
        setCapitalForm({
            amount: item.amount.toString(),
            description: item.description,
            date: format(new Date(item.date), 'yyyy-MM-dd'),
        });
        setEditingCapitalId(item.id);
        setIsCapitalDialogOpen(true);
    };

    const handleDeleteCapital = async (id: number) => {
        if (!confirm('Hapus entri ini?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/capital/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            fetchData();
            fetchTotalBalanceAll();
        } catch {
            alert('Failed to delete');
        }
    };

    if (loading && !data) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
    );

    const s = data?.summary;
    const cmp = data?.comparison;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Profit & Loss</h1>
                    <p className="text-muted-foreground text-sm">Financial performance overview</p>
                </div>
                <Dialog open={isCapitalDialogOpen} onOpenChange={setIsCapitalDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            onClick={() => {
                                setEditingCapitalId(null);
                                setCapitalForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
                            }}
                        >
                            <Plus className="w-4 h-4" /> Add Funds
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingCapitalId ? 'Edit Capital Entry' : 'Inject Capital / Suntikan Dana'}</DialogTitle>
                            <DialogDescription>
                                {editingCapitalId ? 'Update existing capital entry.' : 'Record a new capital injection or fund add.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCapital} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input id="date" type="date" required value={capitalForm.date} onChange={e => setCapitalForm({ ...capitalForm, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (IDR)</Label>
                                <Input id="amount" type="number" placeholder="e.g. 1000000" required value={capitalForm.amount} onChange={e => setCapitalForm({ ...capitalForm, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" placeholder="e.g. Modal Awal Bulan" required value={capitalForm.description} onChange={e => setCapitalForm({ ...capitalForm, description: e.target.value })} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={capitalLoading} className="bg-zinc-900 text-white">
                                    {capitalLoading ? 'Saving...' : 'Save Entry'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Date Filter */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => applyPreset(preset)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePreset === preset.label
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                {/* Manual input */}
                <div className="flex flex-wrap gap-2 items-center">
                    <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                    <Input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
                        className="border border-zinc-200 h-8 w-[130px] text-sm focus-visible:ring-1"
                    />
                    <span className="text-zinc-400 text-sm">—</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
                        className="border border-zinc-200 h-8 w-[130px] text-sm focus-visible:ring-1"
                    />
                    <Button size="sm" onClick={handleApply} className="bg-zinc-900 text-white hover:bg-zinc-800 h-8">Apply</Button>
                </div>
            </div>

            {data && s && cmp && (
                <>
                    {/* Summary Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {s.totalCapital > 0 && (
                            <Card className="border-zinc-200 shadow-sm bg-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-wide">Capital</CardTitle>
                                    <Landmark className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-zinc-900">{formatIDR(s.totalCapital)}</div>
                                    <p className="text-xs text-zinc-500 mt-1">Suntikan dana periode ini</p>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-emerald-900">{formatIDR(s.totalRevenue)}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-emerald-600">Income from services</p>
                                    <ChangeBadge value={cmp.revenueChange} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-red-100 bg-red-50/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold text-red-700 uppercase tracking-wide">Total Expenses</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-red-900">{formatIDR(s.totalExpenses)}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-red-600">Opex + Payroll</p>
                                    <ChangeBadge value={cmp.expensesChange !== null ? -cmp.expensesChange : null} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={`border shadow-sm ${s.netProfit >= 0 ? 'border-zinc-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Net Profit</CardTitle>
                                <Wallet className="h-4 w-4 text-zinc-900" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-black ${s.netProfit >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                                    {formatIDR(s.netProfit)}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${s.profitMargin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {s.profitMargin.toFixed(1)}% margin
                                    </span>
                                    <ChangeBadge value={cmp.netProfitChange} />
                                </div>
                            </CardContent>
                        </Card>

                        {s.totalCapital > 0 && (
                            <Card className="border-zinc-900 bg-zinc-900 shadow-sm text-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Total Balance</CardTitle>
                                    <DollarSign className="h-4 w-4 text-yellow-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-white">
                                        {formatIDR(s.totalCapital + s.netProfit)}
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">Capital + Net Profit</p>
                                </CardContent>
                            </Card>
                        )}

                        {totalBalanceAll && (
                            <Card className="border-zinc-900 bg-black shadow-lg text-white ring-1 ring-zinc-800">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Total Balance All</CardTitle>
                                    <DollarSign className="h-4 w-4 text-white" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-white">
                                        {formatIDR(totalBalanceAll.totalBalance)}
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">Lifetime</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Revenue vs Expenses Trend Chart */}
                    <Card className="border-zinc-200 shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-zinc-900">Revenue vs Expenses Trend</CardTitle>
                            <p className="text-xs text-zinc-500">Daily breakdown for selected period (operational expenses only)</p>
                        </CardHeader>
                        <CardContent>
                            <TrendChart data={data.dailyTrend} />
                        </CardContent>
                    </Card>

                    {/* Breakdown Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Revenue Breakdown */}
                        <Card className="border-zinc-200 shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                    Revenue Breakdown
                                    <span className="text-xs font-normal text-zinc-500">(by Payment Method)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.breakdown.revenue.length === 0 ? (
                                    <div className="py-8 text-center text-zinc-400 italic text-sm">No revenue data for this period</div>
                                ) : (
                                    data.breakdown.revenue.map((item, i) => {
                                        const pct = s.totalRevenue > 0 ? (item.amount / s.totalRevenue) * 100 : 0;
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-zinc-700 capitalize">{item.method}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-400">{pct.toFixed(1)}%</span>
                                                        <span className="font-bold font-mono text-sm text-zinc-900">{formatIDR(item.amount)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>

                        {/* Expense Breakdown */}
                        <Card className="border-zinc-200 shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                    Expense Breakdown
                                    <span className="text-xs font-normal text-zinc-500">(by Category)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Opex categories */}
                                {data.breakdown.expenses.map((item, i) => {
                                    const pct = s.totalExpenses > 0 ? (item.amount / s.totalExpenses) * 100 : 0;
                                    return (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-zinc-700 capitalize">{item.category}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-400">{pct.toFixed(1)}%</span>
                                                    <span className="font-bold font-mono text-sm text-zinc-900">{formatIDR(item.amount)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Payroll as separate line */}
                                {s.totalPayroll > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-violet-700 flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Payroll (Gaji)
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-400">
                                                    {s.totalExpenses > 0 ? ((s.totalPayroll / s.totalExpenses) * 100).toFixed(1) : 0}%
                                                </span>
                                                <span className="font-bold font-mono text-sm text-violet-700">{formatIDR(s.totalPayroll)}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-violet-400 transition-all"
                                                style={{ width: `${s.totalExpenses > 0 ? (s.totalPayroll / s.totalExpenses) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {data.breakdown.expenses.length === 0 && s.totalPayroll === 0 && (
                                    <div className="py-8 text-center text-zinc-400 italic text-sm">No expense data for this period</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Capital History */}
                    <Card className="border-zinc-200 shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-zinc-900">
                                Capital Injections / History Funds
                                <span className="ml-2 text-xs font-normal text-purple-600">(All Records)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {capitalHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">No capital records found</td>
                                            </tr>
                                        ) : (
                                            capitalHistory.map(item => (
                                                <tr key={item.id} className="hover:bg-zinc-50">
                                                    <td className="px-4 py-3 font-mono text-zinc-600">
                                                        {format(new Date(item.date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-zinc-900">{item.description}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                                                        {formatIDR(item.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 flex justify-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => handleEditCapital(item)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteCapital(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
