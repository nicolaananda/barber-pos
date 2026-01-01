import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Calendar, FileText, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/lib/api';

interface Transaction {
    id: number;
    invoiceCode: string;
    totalAmount: number;
    paymentMethod: string;
    date: string;
    customerName?: string;
    items: any[];
    barberId: { name: string };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('all');

    useEffect(() => {
        fetchTransactions();
    }, [dateFilter]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = dateFilter ? `?date=${dateFilter}` : '';
            const res = await fetch(`${API_BASE_URL}/transactions${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const data = await res.json();
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (methodFilter === 'all') return true;
        return tx.paymentMethod === methodFilter;
    });

    const exportCSV = () => {
        const headers = ["Date", "Invoice", "Barber", "Customer", "Amount", "Method", "Items"];
        const rows = filteredTransactions.map(tx => [
            format(new Date(tx.date), 'yyyy-MM-dd HH:mm'),
            tx.invoiceCode,
            tx.barberId?.name,
            tx.customerName || 'Walk-in',
            tx.totalAmount,
            tx.paymentMethod,
            tx.items.map((i: any) => i.name).join('; ')
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transactions_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Transactions History</h1>
                    <p className="text-muted-foreground">Monitor financial records and invoices.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-700">Filters:</span>
                </div>

                <div className="flex gap-2 bg-zinc-50 border border-zinc-200 rounded-md px-2 items-center flex-1 w-full md:w-auto">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <Input
                        type="date"
                        className="border-0 bg-transparent focus-visible:ring-0 w-full text-zinc-900"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>

                <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full md:w-[150px] bg-white border-zinc-200 text-zinc-900">
                        <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center font-bold text-zinc-900">
                        <span>Invoice Log</span>
                        <span className="text-sm font-normal text-zinc-500">Showing {filteredTransactions.length} records</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
                        </div>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 uppercase tracking-wider text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-4 pl-6">Date & Time</th>
                                        <th className="p-4">Invoice</th>
                                        <th className="p-4">Staff</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">
                                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                No transactions found for current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="p-4 pl-6 text-zinc-500 font-mono text-xs">
                                                    {format(new Date(tx.date), 'dd MMM yyyy HH:mm')}
                                                </td>
                                                <td className="p-4 font-bold text-zinc-900 font-mono tracking-tight">
                                                    {tx.invoiceCode}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                                                            {tx.barberId?.name?.charAt(0) || 'S'}
                                                        </div>
                                                        <span className="font-medium text-zinc-700">{tx.barberId?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-zinc-500">
                                                    {tx.customerName || <span className="italic text-xs opacity-50">Walk-in</span>}
                                                </td>
                                                <td className="p-4 text-right font-bold text-zinc-900 font-mono">
                                                    IDR {tx.totalAmount.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={tx.paymentMethod === 'cash'
                                                            ? 'border-zinc-300 text-zinc-600 bg-zinc-100'
                                                            : 'border-zinc-900 text-white bg-zinc-900'}
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
