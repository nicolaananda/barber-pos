import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Calendar, FileText, Filter, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/useAuth';
import { toast } from 'sonner';
import { moneyToNumber } from '@/lib/money';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
    id: number;
    invoiceCode: string;
    totalAmount: number;
    paymentMethod: string;
    date: string;
    customerName?: string;
    items: { name: string; price: number; qty: number }[];
    barberId: { name: string };
}

function normalizeTransaction(transaction: Transaction): Transaction {
    return {
        ...transaction,
        totalAmount: moneyToNumber(transaction.totalAmount),
        items: Array.isArray(transaction.items)
            ? transaction.items.map((item) => ({
                ...item,
                price: moneyToNumber(item.price),
                qty: Number(item.qty || 1),
            }))
            : [],
    };
}

export default function TransactionsPage() {
    const { token } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'all'>('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [pinDialogOpen, setPinDialogOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [editForm, setEditForm] = useState<Transaction | null>(null);
    // Delete Mode State
    const [deletePinDialogOpen, setDeletePinDialogOpen] = useState(false);
    const [deletePin, setDeletePin] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchTransactions();
    }, [currentPage, viewMode, dateFilter, monthFilter, methodFilter]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', currentPage.toString());
            params.set('limit', itemsPerPage.toString());

            if (viewMode === 'daily' && dateFilter) {
                params.set('date', dateFilter);
            } else if (viewMode === 'monthly' && monthFilter) {
                params.set('month', monthFilter);
            }

            if (methodFilter !== 'all') {
                params.set('method', methodFilter);
            }

            const res = await fetch(`${API_BASE_URL}/transactions?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const json = await res.json();

            if (json.pagination) {
                setTransactions(json.data.map(normalizeTransaction));
                setTotalPages(json.pagination.totalPages);
                setTotalRecords(json.pagination.total);
            } else {
                // Fallback for old API response
                setTransactions(json.map(normalizeTransaction));
                setTotalPages(Math.ceil(json.length / itemsPerPage));
                setTotalRecords(json.length);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    }

    const setFilter = (mode: 'daily' | 'monthly' | 'all', value: string) => {
        setViewMode(mode);
        if (mode === 'daily') setDateFilter(value);
        if (mode === 'monthly') setMonthFilter(value);
        setCurrentPage(1);
    };

    const handleEditClick = () => {
        if (selectedTransaction) {
            setEditForm(normalizeTransaction(JSON.parse(JSON.stringify(selectedTransaction)))); // Deep copy
            setIsEditing(true);
        }
    };



    const handleItemChange = (index: number, field: string, value: string | number) => {
        if (!editForm) return;
        const newItems = [...editForm.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate total
        const newTotal = newItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty || 1)), 0);

        setEditForm({ ...editForm, items: newItems, totalAmount: newTotal });
    };

    const handleSaveClick = () => {
        setPin('');
        setPinDialogOpen(true);
    };

    const confirmSave = async () => {
        if (!pin) {
            toast.error('Please enter PIN');
            return;
        }

        try {

            // Verify PIN server-side first
            const pinRes = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pin })
            });

            if (!pinRes.ok) {
                const pinData = await pinRes.json();
                toast.error(pinData.error || 'Invalid PIN Code');
                return;
            }

            const res = await fetch(`${API_BASE_URL}/transactions/${editForm?.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });

            if (!res.ok) throw new Error('Failed to update transaction');

            // Success
            setPinDialogOpen(false);
            setIsEditing(false);
            setSelectedTransaction(null);
            fetchTransactions(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error('Failed to update transaction');
        }
    };

    const handleDeleteClick = () => {
        setDeletePin('');
        setDeletePinDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletePin) {
            toast.error('Please enter PIN');
            return;
        }
        if (!selectedTransaction) return;

        setDeleteLoading(true);
        try {
            // Verify PIN server-side first
            const pinRes = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pin: deletePin })
            });

            if (!pinRes.ok) {
                const pinData = await pinRes.json();
                toast.error(pinData.error || 'Invalid PIN Code');
                return;
            }

            const res = await fetch(`${API_BASE_URL}/transactions/${selectedTransaction.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Voided via dashboard' })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete transaction');
            }

            toast.success(`Invoice ${selectedTransaction.invoiceCode} deleted`);
            setDeletePinDialogOpen(false);
            setSelectedTransaction(null);
            setIsEditing(false);
            fetchTransactions();
        } catch (error: unknown) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* ... (Existing Filter and Table UI) ... */}

            <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                {/* ... (Existing Filter UI) ... */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-700">Filters:</span>
                </div>

                <div className="flex gap-2 items-center flex-1 w-full md:w-auto overflow-x-auto">
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === 'daily' && dateFilter === format(new Date(), 'yyyy-MM-dd') ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter('daily', format(new Date(), 'yyyy-MM-dd'))}
                            className={viewMode === 'daily' && dateFilter === format(new Date(), 'yyyy-MM-dd') ? "bg-zinc-900 text-white" : "text-zinc-600"}
                        >
                            Today
                        </Button>
                        <Button
                            variant={viewMode === 'daily' && dateFilter === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter('daily', format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'))}
                            className={viewMode === 'daily' && dateFilter === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') ? "bg-zinc-900 text-white" : "text-zinc-600"}
                        >
                            Yesterday
                        </Button>
                        <Button
                            variant={viewMode === 'monthly' && monthFilter === format(new Date(), 'yyyy-MM') ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter('monthly', format(new Date(), 'yyyy-MM'))}
                            className={viewMode === 'monthly' && monthFilter === format(new Date(), 'yyyy-MM') ? "bg-zinc-900 text-white" : "text-zinc-600"}
                        >
                            This Month
                        </Button>
                        <Button
                            variant={viewMode === 'monthly' && monthFilter === format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM') ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter('monthly', format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM'))}
                            className={viewMode === 'monthly' && monthFilter === format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM') ? "bg-zinc-900 text-white" : "text-zinc-600"}
                        >
                            Last Month
                        </Button>
                        <Button
                            variant={viewMode === 'all' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter('all', '')}
                            className={viewMode === 'all' ? "bg-zinc-900 text-white" : "text-zinc-600"}
                        >
                            All Time
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 bg-zinc-50 border border-zinc-200 rounded-md px-2 items-center w-auto">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <Input
                        type="date"
                        className="border-0 bg-transparent focus-visible:ring-0 w-full text-zinc-900"
                        value={viewMode === 'daily' ? dateFilter : ''}
                        onChange={(e) => setFilter('daily', e.target.value)}
                        placeholder="Pick a date"
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
                        <span className="text-sm font-normal text-zinc-500">Showing {totalRecords} records</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs text-zinc-400 md:hidden mb-2">&larr; Geser untuk lihat semua &rarr;</p>
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
                                            <th className="p-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 bg-white">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-12 text-center text-zinc-400 font-medium">
                                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    No transactions found for current filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => { setSelectedTransaction(tx); setIsEditing(false); }}>
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
                                                    <td className="p-4 text-center">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                                    <div className="text-xs text-zinc-500">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                                const pageNum = startPage + i;
                                                if (pageNum > totalPages) return null;
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "ghost"}
                                                        size="sm"
                                                        className={`h-8 w-8 ${currentPage === pageNum ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
                                                        onClick={() => handlePageChange(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedTransaction} onOpenChange={(open) => {
                if (!open) {
                    setSelectedTransaction(null);
                    setIsEditing(false);
                }
            }}>
                <DialogContent className="sm:max-w-md bg-white text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Transaction Details</span>
                            {!isEditing && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={handleDeleteClick} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleEditClick} className="text-blue-600 hover:text-blue-700">
                                        Edit Invoice
                                    </Button>
                                </div>
                            )}
                            {isEditing && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Editing Mode</span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Invoice: <span className="font-mono text-zinc-900 font-bold">{selectedTransaction?.invoiceCode}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {!isEditing ? (
                        /* Read Only View */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500">Date</p>
                                    <p className="font-medium">{selectedTransaction && format(new Date(selectedTransaction.date), 'dd MMM yyyy HH:mm')}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500">Staff</p>
                                    <p className="font-medium">{selectedTransaction?.barberId?.name}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500">Customer</p>
                                    <p className="font-medium">{selectedTransaction?.customerName || 'Walk-in'}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500">Payment Method</p>
                                    <div className="mt-1">
                                        <Badge variant="outline" className="border-zinc-300">
                                            {selectedTransaction?.paymentMethod.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-200 pt-4">
                                <h4 className="font-semibold mb-2 text-sm text-zinc-900">Items</h4>
                                <div className="space-y-2">
                                    {selectedTransaction?.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm py-1 border-b border-zinc-100 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-800">{item.name}</span>
                                                <span className="text-xs text-zinc-500">@{item.price.toLocaleString('id-ID')} x {item.qty || 1}</span>
                                            </div>
                                            <span className="font-mono font-medium">
                                                IDR {((item.price) * (item.qty || 1)).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-zinc-200 pt-4 flex justify-between items-center bg-zinc-50 p-3 rounded-lg -mx-2">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-bold text-lg font-mono">
                                    IDR {selectedTransaction?.totalAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Edit View */
                        <div className="space-y-4">
                            {editForm && (
                                <>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-zinc-500 mb-1">Customer Name</p>
                                            <Input
                                                value={editForm.customerName || ''}
                                                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 mb-1">Payment</p>
                                            <Select
                                                value={editForm.paymentMethod}
                                                onValueChange={(val) => setEditForm({ ...editForm, paymentMethod: val })}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="qris">QRIS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-200 pt-4">
                                        <h4 className="font-semibold mb-2 text-sm text-zinc-900">Edit Items</h4>
                                        <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                                            {editForm.items.map((item, i) => (
                                                <div key={i} className="bg-zinc-50 p-2 rounded-lg border border-zinc-100 space-y-2">
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(i, 'name', e.target.value)}
                                                        className="h-8 text-sm"
                                                        placeholder="Service Name"
                                                    />
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <Input
                                                                type="number"
                                                                value={item.price}
                                                                onChange={(e) => handleItemChange(i, 'price', Number(e.target.value))}
                                                                className="h-8 text-sm"
                                                                placeholder="Price"
                                                            />
                                                        </div>
                                                        <div className="w-20">
                                                            <Input
                                                                type="number"
                                                                value={item.qty || 1}
                                                                onChange={(e) => handleItemChange(i, 'qty', Number(e.target.value))}
                                                                className="h-8 text-sm"
                                                                placeholder="Qty"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-200 pt-4 flex justify-between items-center bg-zinc-50 p-3 rounded-lg -mx-2">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold font-mono">
                                            IDR {editForm.totalAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleSaveClick}>Save Changes</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
                <DialogContent className="sm:max-w-[300px] bg-white">
                    <DialogHeader>
                        <DialogTitle>Enter Secret Code</DialogTitle>
                        <DialogDescription>Enter your authorization PIN to save changes.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            type="password"
                            placeholder="PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="text-center tracking-widest text-lg font-bold"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={confirmSave} className="w-full bg-zinc-900 text-white">Confirm</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={deletePinDialogOpen} onOpenChange={setDeletePinDialogOpen}>
                <DialogContent className="sm:max-w-[300px] bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Invoice</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-mono font-bold text-zinc-900">{selectedTransaction?.invoiceCode}</span>? Enter your PIN to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            type="password"
                            placeholder="PIN"
                            value={deletePin}
                            onChange={(e) => setDeletePin(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                            className="text-center tracking-widest text-lg font-bold"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={confirmDelete} disabled={deleteLoading} className="w-full bg-red-600 text-white hover:bg-red-700">
                            {deleteLoading ? 'Deleting...' : 'Delete Invoice'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
