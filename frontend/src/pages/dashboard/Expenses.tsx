import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Wallet, Tag, TrendingDown, Target } from 'lucide-react';
import { format } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Progress } from "@/components/ui/progress"
import { API_BASE_URL } from '@/lib/api';


interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    date: string;
}

const CATEGORIES = ['Operational', 'Supplies', 'Maintenance', 'Marketing', 'Salary', 'Other'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Operational');

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/expenses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch expenses');
            const data = await res.json();
            setExpenses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description, amount: Number(amount), category })
            });
            await fetchExpenses();
            handleClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/expenses`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id })
            });
            await fetchExpenses();
        } catch (error) {
            console.error(error);
        }
    };

    const handleClose = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setDescription(''); setAmount(''); setCategory('Operational');
        }, 150);
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const monthlyBudget = 10000000; // Mocked Monthly Budget
    const budgetUsage = Math.min((totalExpenses / monthlyBudget) * 100, 100);

    // Chart Data
    const pieData = CATEGORIES.map(cat => {
        const val = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
        return { name: cat, value: val };
    }).filter(d => d.value > 0);

    const barData = pieData.sort((a, b) => b.value - a.value).slice(0, 5);

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-900">Expenses Management</h1>
                    <p className="text-zinc-500">Track outflow and manage operational budget.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold shadow-sm bg-zinc-900 text-white hover:bg-zinc-800 transition-all border border-zinc-900">
                            <Plus className="mr-2 h-4 w-4" /> Record Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount (IDR)</Label>
                                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Record Expense
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-zinc-900 text-white shadow-sm border-zinc-900 col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-300 uppercase tracking-widest flex items-center justify-between">
                            <span>Total Spend</span>
                            <Wallet className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white font-mono">
                            IDR {totalExpenses.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-zinc-300" />
                            Recorded this month
                        </p>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 shadow-sm bg-white border-zinc-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-widest flex items-center justify-between text-zinc-500">
                            <span>Monthly Budget Control</span>
                            <Target className="w-4 h-4 text-zinc-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-2xl font-bold font-mono text-zinc-900">
                                {budgetUsage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-zinc-500">
                                Cap: IDR {monthlyBudget.toLocaleString('id-ID')}
                            </div>
                        </div>
                        <Progress value={budgetUsage} className="h-4 bg-zinc-100 border border-zinc-100" indicatorClassName="bg-zinc-900" />
                        <p className="text-xs text-zinc-500 mt-4">
                            You have spent <strong className="text-zinc-900">IDR {totalExpenses.toLocaleString('id-ID')}</strong> out of your set budget.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-900 font-bold">Distribution</CardTitle>
                        <CardDescription className="text-zinc-500">All time expense breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
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
                                        <Cell key={`cell-${index}`} fill={['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'][index % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `IDR ${value.toLocaleString('id-ID')}`}
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', borderRadius: '0.5rem', color: '#18181b', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-zinc-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-900 font-bold">Top Categories</CardTitle>
                        <CardDescription className="text-zinc-500">Highest spending areas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f4f4f5' }}
                                    formatter={(value: number) => `IDR ${value.toLocaleString('id-ID')}`}
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', borderRadius: '0.5rem', color: '#18181b', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                                />
                                <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-zinc-900 font-bold">Expense Log</CardTitle>
                    <CardDescription className="text-zinc-500">Detailed transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-900" /></div>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 overflow-x-auto bg-white">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-zinc-50 uppercase tracking-wider text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-4 pl-6">Date</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-zinc-50 transition-colors group">
                                            <td className="p-4 pl-6 text-zinc-500 font-mono text-xs">
                                                {format(new Date(expense.date), 'dd MMM yyyy')}
                                            </td>
                                            <td className="p-4 font-medium text-zinc-900">{expense.description}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-zinc-600">
                                                    <Tag className="w-3 h-3 text-zinc-400" />
                                                    {expense.category}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-zinc-900 font-mono">
                                                IDR {expense.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all" onClick={() => handleDelete(expense.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
