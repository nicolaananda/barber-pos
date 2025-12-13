'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ExpensesPage() {

    const [openDialog, setOpenDialog] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('operational');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: expenses = [], mutate: mutateExpenses, isLoading: loadingExpenses } = useSWR<any[]>('/api/expenses', fetcher);
    const { data: statsData, mutate: mutateStats, isLoading: loadingStats } = useSWR<any>('/api/dashboard/stats', fetcher);

    const stats = statsData?.stats;
    const loading = loadingExpenses || loadingStats;

    const refreshData = () => {
        mutateExpenses();
        mutateStats();
    };

    const resetForm = () => {
        setEditingId(null);
        setDescription('');
        setAmount('');
        setCategory('operational');
    };

    const handleOpenDialog = (isOpen: boolean) => {
        setOpenDialog(isOpen);
        if (!isOpen) resetForm();
    };

    const handleEdit = (exp: any) => {
        setEditingId(exp.id);
        setDescription(exp.description);
        setAmount(exp.amount.toString());
        setCategory(exp.category);
        setOpenDialog(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            const res = await fetch('/api/expenses', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                refreshData();
            } else {
                alert('Failed to delete expense');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        try {
            const method = editingId ? 'PATCH' : 'POST';
            const body = {
                id: editingId,
                description,
                amount: Number(amount),
                category,
            };

            const res = await fetch('/api/expenses', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                alert(editingId ? 'Expense updated' : 'Expense recorded');
                handleOpenDialog(false);
                refreshData(); // Refresh data
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to save expense');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading && !stats) return <div className="p-8">Loading Financial Data...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Bookkeeping</h1>
                    <p className="text-muted-foreground mt-1">Monitor your income, expenses, and net profit with precision.</p>
                </div>
                <Dialog open={openDialog} onOpenChange={handleOpenDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-amber-600 shadow-xl shadow-primary/20 transition-all hover:scale-105 font-bold uppercase tracking-wide">
                            <Plus className="mr-2 h-4 w-4" /> Record Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border text-foreground shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold uppercase tracking-wider text-muted-foreground">
                                {editingId ? 'Edit Expense' : 'Record Operating Expense'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="desc" className="text-muted-foreground">Description</Label>
                                <Input
                                    id="desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Electricity Token"
                                    className="bg-background border-border focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-muted-foreground">Amount (IDR)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="bg-background border-border focus:border-primary font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-muted-foreground">Category</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="operational">Operational</option>
                                    <option value="salary">Salary</option>
                                    <option value="supplies">Supplies</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-amber-600 font-bold">
                                {editingId ? 'Update Expense' : 'Save Expense'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-l-4 border-l-green-500 shadow-md group border-t-0 border-r-0 border-b-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500 font-mono">IDR {stats?.totalRevenue?.toLocaleString('id-ID') || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Gross Income</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-l-4 border-l-red-500 shadow-md group border-t-0 border-r-0 border-b-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500 font-mono">IDR {stats?.totalExpenses?.toLocaleString('id-ID') || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Operational Costs</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-l-4 border-l-primary shadow-md group border-t-0 border-r-0 border-b-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary font-mono">IDR {stats?.netProfit?.toLocaleString('id-ID') || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card border-border shadow-lg">
                <CardHeader>
                    <CardTitle className="text-foreground">Expense History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-muted-foreground font-bold">Date</TableHead>
                                    <TableHead className="text-muted-foreground font-bold">Description</TableHead>
                                    <TableHead className="text-muted-foreground font-bold">Category</TableHead>
                                    <TableHead className="text-right text-muted-foreground font-bold">Amount</TableHead>
                                    <TableHead className="text-center text-muted-foreground font-bold w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses recorded yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((exp) => (
                                        <TableRow key={exp.id} className="border-border hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</TableCell>
                                            <TableCell className="font-medium text-foreground">{exp.description}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground capitalize bg-secondary">
                                                    {exp.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-400 font-bold">IDR {exp.amount.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/20" onClick={() => handleEdit(exp)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20" onClick={() => handleDelete(exp.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
