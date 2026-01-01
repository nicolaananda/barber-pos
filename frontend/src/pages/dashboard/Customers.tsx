import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, User, Phone, CalendarDays, History, Loader2, MoreHorizontal, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { API_BASE_URL } from '@/lib/api';


interface Customer {
    id: number;
    name: string;
    phone: string;
    totalVisits: number;
    lastVisit: string;
    createdAt: string;
}

interface Transaction {
    id: number;
    invoiceCode: string;
    totalAmount: number;
    paymentMethod: string;
    date: string;
    items: any[];
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit State
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // History State
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCustomers(searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchCustomers = async (search: string = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/customers?q=${search}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch customers');
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (customer: Customer) => {
        setEditingCustomer(customer);
        setEditName(customer.name);
        setEditPhone(customer.phone);
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/customers/${editingCustomer.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editName, phone: editPhone })
            });

            if (!res.ok) throw new Error('Failed to update');

            await fetchCustomers(searchTerm);
            setEditingCustomer(null);
        } catch (error) {
            console.error(error);
            alert('Failed to update customer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHistoryClick = async (customer: Customer) => {
        setHistoryCustomer(customer);
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/transactions?phone=${customer.phone}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();
            setHistoryTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setHistoryLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Customers Database</h1>
                    <p className="text-muted-foreground">View and manage your loyal client base.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white border-zinc-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-zinc-900">{customers.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-zinc-900 font-bold">Customer List</CardTitle>
                        <CardDescription className="text-zinc-500">Search by name or phone number</CardDescription>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <Input
                            className="pl-9 bg-zinc-50 border-zinc-200 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
                        </div>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 overflow-x-auto bg-white">
                            <table className="w-full text-sm text-left min-w-[800px]">
                                <thead className="bg-zinc-50 uppercase tracking-wider text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-4 pl-6">Customer</th>
                                        <th className="p-4">Contact Information</th>
                                        <th className="p-4 text-center">Engagement</th>
                                        <th className="p-4">Timestamps</th>
                                        <th className="p-4 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {customers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-zinc-400">
                                                No customers found matching "{searchTerm}"
                                            </td>
                                        </tr>
                                    ) : (
                                        customers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-zinc-50 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold shadow-sm border border-zinc-900">
                                                            {customer.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-900">{customer.name}</div>
                                                            <div className="text-xs text-zinc-500 font-mono">ID: #{customer.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 p-1.5 bg-zinc-50 border border-zinc-200 rounded-md w-fit text-xs font-mono text-zinc-700">
                                                        <Phone className="w-3 h-3 text-zinc-400" />
                                                        {customer.phone}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Badge variant={customer.totalVisits > 5 ? "default" : "secondary"} className={`font-mono border ${customer.totalVisits > 5 ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
                                                            {customer.totalVisits} Visits
                                                        </Badge>
                                                        {customer.totalVisits > 10 && <span className="text-[10px] text-zinc-900 font-black tracking-wide border-b-2 border-zinc-900">VIP</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex items-center gap-2 text-zinc-600" title="Last Visit">
                                                            <History className="w-3 h-3 text-zinc-400" />
                                                            {customer.lastVisit ? format(new Date(customer.lastVisit), 'dd MMM yyyy') : '-'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-zinc-400" title="Joined">
                                                            <CalendarDays className="w-3 h-3 opacity-70" />
                                                            {format(new Date(customer.createdAt), 'MMM yyyy')}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="border-zinc-200">
                                                            <DropdownMenuLabel className="text-zinc-500 text-xs uppercase tracking-wider">Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleHistoryClick(customer)} className="text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900">
                                                                View History
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditClick(customer)} className="text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900">
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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

            {/* Edit Dialog */}
            <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateCustomer} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isSubmitting} className="bg-zinc-900 text-white hover:bg-zinc-800">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Like Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Sheet */}
            <Sheet open={!!historyCustomer} onOpenChange={(open) => !open && setHistoryCustomer(null)}>
                <SheetContent className="w-[400px] sm:w-[540px] border-l border-zinc-200">
                    <SheetHeader>
                        <SheetTitle>Transaction History</SheetTitle>
                        <SheetDescription>
                            Past visits for <strong>{historyCustomer?.name}</strong>
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-8 space-y-4">
                        {historyLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-900" /></div>
                        ) : historyTransactions.length === 0 ? (
                            <div className="text-center p-8 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-lg">
                                No history found for this customer.
                            </div>
                        ) : (
                            historyTransactions.map(tx => (
                                <div key={tx.id} className="p-4 border border-zinc-200 rounded-lg bg-white flex justify-between items-center hover:shadow-sm transition-shadow">
                                    <div>
                                        <div className="font-bold text-zinc-900 font-mono tracking-tight">{tx.invoiceCode}</div>
                                        <div className="text-xs text-zinc-500">{format(new Date(tx.date), 'dd MMM yyyy HH:mm')}</div>
                                        <div className="text-xs text-zinc-400 mt-1 uppercase tracking-wide font-medium">
                                            {tx.items.length} items • {tx.paymentMethod}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold font-mono text-zinc-900">IDR {tx.totalAmount.toLocaleString('id-ID')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
