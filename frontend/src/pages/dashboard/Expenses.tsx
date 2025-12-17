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
            const res = await fetch('/api/expenses', {
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
            await fetch('/api/expenses', {
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
            await fetch(`/api/expenses`, {
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
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Expenses Management</h1>
                    <p className="text-muted-foreground">Track outflow and manage operational budget.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold shadow-lg shadow-destructive/20 bg-destructive text-destructive-foreground hover:bg-red-600 transition-all">
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
                                <Button type="submit" variant="destructive" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Record Expense
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-destructive/5 border-destructive/20 col-span-1 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-destructive uppercase tracking-widest flex items-center justify-between">
                            <span>Total Spend</span>
                            <Wallet className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-destructive font-mono">
                            IDR {totalExpenses.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            Recorded this month
                        </p>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-widest flex items-center justify-between">
                            <span>Monthly Budget Control</span>
                            <Target className="w-4 h-4 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-2xl font-bold font-mono">
                                {budgetUsage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Cap: IDR {monthlyBudget.toLocaleString('id-ID')}
                            </div>
                        </div>
                        <Progress value={budgetUsage} className="h-4 bg-muted" indicatorClassName={budgetUsage > 90 ? "bg-red-500" : "bg-emerald-500"} />
                        <p className="text-xs text-muted-foreground mt-4">
                            You have spent <strong>IDR {totalExpenses.toLocaleString('id-ID')}</strong> out of your set budget.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Distribution</CardTitle>
                        <CardDescription>All time expense breakdown</CardDescription>
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
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `IDR ${value.toLocaleString('id-ID')}`} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Categories</CardTitle>
                        <CardDescription>Highest spending areas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => `IDR ${value.toLocaleString('id-ID')}`} />
                                <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 shadow-lg">
                <CardHeader>
                    <CardTitle>Expense Log</CardTitle>
                    <CardDescription>Detailed transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="rounded-xl border border-border overflow-x-auto bg-card/50">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-muted/50 uppercase tracking-wider text-xs font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="p-4 pl-6">Date</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-destructive/5 transition-colors group">
                                            <td className="p-4 pl-6 text-muted-foreground font-mono text-xs">
                                                {format(new Date(expense.date), 'dd MMM yyyy')}
                                            </td>
                                            <td className="p-4 font-medium">{expense.description}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                                    {expense.category}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-destructive font-mono">
                                                IDR {expense.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" onClick={() => handleDelete(expense.id)}>
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
