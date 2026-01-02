import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Wallet,
    PieChart,
    Plus,
    Landmark,
    Trash2,
    Pencil
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';

interface ProfitLossData {
    range: {
        start: string;
        end: string;
    };
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        totalCapital: number;
        netProfit: number;
    };
    breakdown: {
        expenses: { category: string; amount: number }[];
        revenue: { method: string; amount: number }[];
    };
}

export default function ProfitLossPage() {
    const [data, setData] = useState<ProfitLossData | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // Capital Dialog State
    const [isCapitalDialogOpen, setIsCapitalDialogOpen] = useState(false);
    const [capitalLoading, setCapitalLoading] = useState(false);
    const [capitalHistory, setCapitalHistory] = useState<any[]>([]);
    const [editingCapitalId, setEditingCapitalId] = useState<number | null>(null);
    const [capitalForm, setCapitalForm] = useState({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams({ startDate, endDate }).toString();

            // Parallel fetch
            const [plRes, capitalRes] = await Promise.all([
                fetch(`${API_BASE_URL}/dashboard/profit-loss?${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/capital?${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!plRes.ok || !capitalRes.ok) throw new Error('Failed to fetch data');

            const plData = await plRes.json();
            const capitalData = await capitalRes.json();

            setData(plData);
            setCapitalHistory(capitalData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCapital = async (e: React.FormEvent) => {
        e.preventDefault();
        setCapitalLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = editingCapitalId
                ? `${API_BASE_URL}/capital/${editingCapitalId}`
                : `${API_BASE_URL}/capital`;

            const method = editingCapitalId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(capitalForm)
            });
            if (!res.ok) throw new Error('Failed to save capital');

            setIsCapitalDialogOpen(false);
            setCapitalForm({
                amount: '',
                description: '',
                date: format(new Date(), 'yyyy-MM-dd')
            });
            setEditingCapitalId(null);
            fetchData(); // Refresh data
        } catch (error) {
            console.error(error);
            alert('Failed to save capital entry');
        } finally {
            setCapitalLoading(false);
        }
    };

    const handleEditCapital = (item: any) => {
        setCapitalForm({
            amount: item.amount.toString(),
            description: item.description,
            date: format(new Date(item.date), 'yyyy-MM-dd')
        });
        setEditingCapitalId(item.id);
        setIsCapitalDialogOpen(true);
    };

    const handleDeleteCapital = async (id: number) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/capital/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Failed to delete');
        }
    }

    if (loading && !data) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Profit & Loss</h1>
                    <p className="text-muted-foreground text-sm">
                        Financial performance overview
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Dialog open={isCapitalDialogOpen} onOpenChange={setIsCapitalDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                onClick={() => {
                                    setEditingCapitalId(null);
                                    setCapitalForm({
                                        amount: '',
                                        description: '',
                                        date: format(new Date(), 'yyyy-MM-dd')
                                    });
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                Add Funds
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
                                    <Input
                                        id="date"
                                        type="date"
                                        required
                                        value={capitalForm.date}
                                        onChange={(e) => setCapitalForm({ ...capitalForm, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (IDR)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="e.g. 1000000"
                                        required
                                        value={capitalForm.amount}
                                        onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        placeholder="e.g. Modal Awal Bulan"
                                        required
                                        value={capitalForm.description}
                                        onChange={(e) => setCapitalForm({ ...capitalForm, description: e.target.value })}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={capitalLoading} className="bg-zinc-900 text-white">
                                        {capitalLoading ? 'Saving...' : 'Save Entry'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-0 h-8 p-0 w-[110px] focus-visible:ring-0"
                            />
                            <span className="text-zinc-400">-</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-0 h-8 p-0 w-[110px] focus-visible:ring-0"
                            />
                        </div>
                        <Button size="sm" onClick={fetchData} className="bg-zinc-900 text-white hover:bg-zinc-800">
                            Apply
                        </Button>
                    </div>
                </div>
            </div>

            {data && (
                <>
                    {/* Main Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <Card className="border-zinc-200 shadow-sm bg-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-blue-600 uppercase tracking-wide">Capital Injections</CardTitle>
                                <Landmark className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-zinc-900">
                                    IDR {data.summary.totalCapital?.toLocaleString('id-ID') || '0'}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">Suntikan Dana</p>
                            </CardContent>
                        </Card>

                        <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-emerald-900">
                                    IDR {data.summary.totalRevenue.toLocaleString('id-ID')}
                                </div>
                                <p className="text-xs text-emerald-600 mt-1">Income from services</p>
                            </CardContent>
                        </Card>

                        <Card className="border-red-100 bg-red-50/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-red-600 uppercase tracking-wide">Total Expenses</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-red-900">
                                    IDR {data.summary.totalExpenses.toLocaleString('id-ID')}
                                </div>
                                <p className="text-xs text-red-600 mt-1">Operational costs</p>
                            </CardContent>
                        </Card>

                        <Card className={`border shadow-sm ${data.summary.netProfit >= 0 ? 'border-zinc-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wide">Net Profit</CardTitle>
                                <Wallet className="h-4 w-4 text-zinc-900" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-black ${data.summary.netProfit >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                                    IDR {data.summary.netProfit.toLocaleString('id-ID')}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">Revenue - Expenses</p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-900 bg-zinc-900 shadow-sm text-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-wide">Total Balance</CardTitle>
                                <DollarSign className="h-4 w-4 text-yellow-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-white">
                                    IDR {((data.summary.totalCapital || 0) + data.summary.netProfit).toLocaleString('id-ID')}
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">Capital + Net Profit</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Revenue Breakdown */}
                        <Card className="border-zinc-200 shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                    Revenue Breakdown <span className="text-xs font-normal text-zinc-500">(by Payment Method)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.breakdown.revenue.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 rounded-full bg-emerald-500" />
                                                <span className="font-medium text-zinc-700 capitalize">{item.method}</span>
                                            </div>
                                            <span className="font-bold font-mono text-zinc-900">IDR {item.amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    ))}
                                    {data.breakdown.revenue.length === 0 && (
                                        <div className="text-center py-8 text-zinc-400 italic">No revenue data for this period</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expense Breakdown */}
                        <Card className="border-zinc-200 shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                    Expense Breakdown <span className="text-xs font-normal text-zinc-500">(by Category)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.breakdown.expenses.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 rounded-full bg-red-500" />
                                                <span className="font-medium text-zinc-700 capitalize">{item.category}</span>
                                            </div>
                                            <span className="font-bold font-mono text-zinc-900">IDR {item.amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    ))}
                                    {data.breakdown.expenses.length === 0 && (
                                        <div className="text-center py-8 text-zinc-400 italic">No expense data for this period</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Capital History */}
                    <Card className="border-zinc-200 shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                Capital Injections / History Funds
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
                                                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">
                                                    No capital records found for this period
                                                </td>
                                            </tr>
                                        ) : (
                                            capitalHistory.map((item) => (
                                                <tr key={item.id} className="hover:bg-zinc-50">
                                                    <td className="px-4 py-3 font-mono text-zinc-600">
                                                        {format(new Date(item.date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-zinc-900">
                                                        {item.description}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                                                        IDR {item.amount.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3 flex justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                                                            onClick={() => handleEditCapital(item)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteCapital(item.id)}
                                                        >
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
