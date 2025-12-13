'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CheckoutModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { cart, selectedBarber, customerName, customerPhone, setCustomerInfo, clearCart } = usePosStore();
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lastTx, setLastTx] = useState<any>(null);

    // Customer Autocomplete State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Cash Calculator State
    const [cashReceived, setCashReceived] = useState('');
    const change = Number(cashReceived) - totalAmount;

    useEffect(() => {
        if (!open) {
            setCashReceived('');
            setShowSuggestions(false);
            setSearchQuery('');
        }
    }, [open]);

    // Simple debounce search could be implemented, but direct fetch on > 2 chars is fine for small scale
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const res = await fetch(`/api/customers?q=${query}`);
            const data = await res.json();
            setSearchResults(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error(error);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectCustomer = (customer: any) => {
        setCustomerInfo(customer.name, customer.phone);
        setSearchQuery(''); // Clear search after selection
        setShowSuggestions(false);
    };

    const handleCheckout = async () => {
        if (!selectedBarber || cart.length === 0) return;

        setLoading(true);

        try {
            // 1. Save/Update Customer if info exists
            if (customerName && customerPhone) {
                await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: customerName, phone: customerPhone }),
                });
            }

            // 2. Create Transaction
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barberId: selectedBarber.id,
                    items: cart,
                    totalAmount,
                    paymentMethod,
                    customerName,
                    customerPhone,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || errorData.error || 'Transaction failed');
            }

            const data = await res.json();
            setLastTx(data);
            setSuccess(true);
        } catch (error) {
            console.error(error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert(`Checkout Failed: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (success) {
            clearCart();
            setSuccess(false);
            setPaymentMethod('cash');
            setLastTx(null);
            setCustomerInfo('', ''); // Clear customer info after success
        }
        onOpenChange(false);
    };

    const handlePrint = () => {
        if (!lastTx) return;
        const tx = lastTx;

        // Calculate change display for receipt if cash
        const cashIn = paymentMethod === 'cash' ? Number(cashReceived) : 0;
        const changeAmount = cashIn > 0 ? cashIn - tx.totalAmount : 0;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                  <head>
                    <title>Receipt ${tx.invoiceCode}</title>
                    <style>
                      @page { margin: 0; size: 80mm 297mm; } /* Optimize for thermal paper width */
                      body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; }
                      .container { width: 100%; max-width: 80mm; margin: 0 auto; padding: 10px; box-sizing: border-box; }
                      .text-center { text-align: center; }
                      .text-right { text-align: right; }
                      .bold { font-weight: bold; }
                      .mb-1 { margin-bottom: 5px; }
                      .mb-2 { margin-bottom: 10px; }
                      .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                      .border-t { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                      .row { display: flex; justify-content: space-between; width: 100%; }
                      .col { display: flex; flex-direction: column; }
                      .logo { width: 50px; height: 50px; border-radius: 50%; display: block; margin: 0 auto 5px; object-fit: cover; filter: grayscale(100%); }
                      
                      /* Table-like structure for items */
                      .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                      .item-name { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                      .item-qty { margin-right: 5px; font-size: 10px; }
                      .item-price { flex: 1; text-align: right; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                        <div class="text-center mb-2">
                            <img src="/logo.jpg" class="logo" />
                            <h2 style="margin:0; font-size: 16px; text-transform: uppercase;">Staycool Hairlab</h2>
                            <p style="margin:2px 0; font-size: 10px;">Jl. Imam Bonjol Pertigaan No.370</p>
                            <p style="margin:0; font-size: 10px;">Ngadirejo, Kota Kediri</p>
                            <p style="margin:2px 0; font-size: 10px;">0877-7099-5270</p>
                        </div>

                        <div class="border-b"></div>

                        <div class="mb-2" style="font-size: 11px;">
                            <div class="row"><span>Invoice</span> <span class="bold">${tx.invoiceCode}</span></div>
                            <div class="row"><span>Date</span> <span>${format(new Date(tx.date || new Date()), 'dd/MM/yyyy HH:mm')}</span></div>
                            <div class="row"><span>Barber</span> <span>${usePosStore.getState().selectedBarber?.name}</span></div>
                            ${tx.customerName ? `<div class="row"><span>Cust</span> <span>${tx.customerName}</span></div>` : ''}
                        </div>

                        <div class="border-b"></div>

                        <div class="mb-2">
                            ${tx.items.map((item: any) => `
                            <div class="item-row">
                                <span class="item-name"><span class="item-qty">${item.qty}x</span> ${item.name}</span>
                                <span class="item-price">${(item.price * item.qty).toLocaleString('id-ID')}</span>
                            </div>
                            `).join('')}
                        </div>

                        <div class="border-t">
                            <div class="row bold" style="font-size: 14px; margin-top: 5px;">
                                <span>TOTAL</span>
                                <span>IDR ${tx.totalAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div class="row" style="margin-top: 5px; font-size: 11px;">
                                <span>Payment</span>
                                <span style="text-transform: uppercase;">${tx.paymentMethod}</span>
                            </div>
                            ${paymentMethod === 'cash' && cashIn > 0 ? `
                            <div class="row" style="font-size: 11px;">
                               <span>Cash</span>
                               <span>IDR ${cashIn.toLocaleString('id-ID')}</span>
                            </div>
                            <div class="row" style="font-size: 11px;">
                               <span>Change</span>
                               <span>IDR ${changeAmount.toLocaleString('id-ID')}</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="text-center" style="margin-top: 20px; font-size: 10px;">
                            <p style="margin-bottom: 5px;">Thank you for coming!</p>
                            <p>Follow us on Instagram<br>@staycool_hairlab</p>
                        </div>
                    </div>
                  </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    if (success) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[425px] bg-card border-primary/20 text-foreground shadow-2xl shadow-primary/10">
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        <CheckCircle2 className="h-16 w-16 text-primary animate-in zoom-in spin-in-180 duration-500" />
                        <h2 className="text-xl font-bold tracking-wide uppercase">Payment Successful!</h2>
                        {paymentMethod === 'cash' && Number(cashReceived) > 0 && (
                            <div className="text-center bg-background/50 p-4 rounded-lg w-full border border-border">
                                <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Change (Kembalian)</p>
                                <p className="text-3xl font-bold text-primary font-mono">IDR {change.toLocaleString('id-ID')}</p>
                            </div>
                        )}
                        <div className="flex gap-2 w-full pt-4">
                            <Button onClick={handlePrint} variant="outline" className="flex-1 border-primary/50 text-primary hover:bg-primary/10">Print Invoice</Button>
                            <Button onClick={handleClose} className="flex-1 bg-primary text-primary-foreground hover:bg-amber-600 font-bold">New Transaction</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-widest uppercase flex items-center gap-2">
                        Checkout <span className="text-primary text-sm font-light normal-case tracking-normal">Complete Payment</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex justify-between items-center text-lg font-bold border-b border-border pb-4">
                        <span className="text-muted-foreground uppercase text-sm tracking-wide">Total Due</span>
                        <span className="text-3xl font-bold text-primary tracking-tight">IDR {totalAmount.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="grid gap-4 border border-border p-4 rounded-xl bg-background/30 relative">
                        <Label className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 block">Customer Details (Optional)</Label>

                        {/* 1. Search Bar */}
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="searchCust"
                                    className="pl-9 bg-card border-border focus:border-primary transition-colors"
                                    placeholder="Search by Name or Phone..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && searchResults.length > 0 && (
                                <ul className="absolute top-full left-0 right-0 bg-card border border-border shadow-xl rounded-md mt-1 z-50 max-h-[200px] overflow-y-auto">
                                    {searchResults.map((cust) => (
                                        <li
                                            key={cust.id}
                                            className="p-3 hover:bg-primary/10 cursor-pointer text-sm border-b border-border last:border-0 flex flex-col group transition-colors"
                                            onClick={() => handleSelectCustomer(cust)}
                                        >
                                            <span className="font-bold text-foreground group-hover:text-primary transition-colors">{cust.name}</span>
                                            <span className="text-muted-foreground text-xs">{cust.phone} • {cust.totalVisits} visits</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Input
                                    id="custPhone"
                                    placeholder="Phone (0812...)"
                                    className="bg-card border-border"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerInfo(customerName, e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Input
                                    id="custName"
                                    placeholder="Cust. Name"
                                    className="bg-card border-border"
                                    value={customerName}
                                    onChange={(e) => setCustomerInfo(e.target.value, customerPhone)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <Label className="uppercase text-xs tracking-wider text-muted-foreground">Payment Method</Label>
                        <RadioGroup
                            value={paymentMethod}
                            onValueChange={(v) => setPaymentMethod(v as 'cash' | 'qris')}
                            className="flex gap-4"
                        >
                            <div className={cn("flex items-center space-x-3 border rounded-xl p-4 w-full cursor-pointer transition-all duration-300", paymentMethod === 'cash' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' : 'border-border bg-card hover:bg-white/5')}>
                                <RadioGroupItem value="cash" id="cash" className="text-primary border-primary" />
                                <Label htmlFor="cash" className="cursor-pointer flex-1 font-bold text-foreground">Cash</Label>
                            </div>
                            <div className={cn("flex items-center space-x-3 border rounded-xl p-4 w-full cursor-pointer transition-all duration-300", paymentMethod === 'qris' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' : 'border-border bg-card hover:bg-white/5')}>
                                <RadioGroupItem value="qris" id="qris" className="text-primary border-primary" />
                                <Label htmlFor="qris" className="cursor-pointer flex-1 font-bold text-foreground">QRIS</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Cash Calculator */}
                    {paymentMethod === 'cash' && (
                        <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50 mt-2 space-y-3 animate-in slide-in-from-top-2">
                            <div className="grid gap-2">
                                <Label className="text-emerald-400 font-bold uppercase text-xs tracking-wider">Cash Received</Label>
                                <Input
                                    type="number"
                                    placeholder="Enter Amount..."
                                    className="text-lg font-mono bg-emerald-950/50 border-emerald-900 text-emerald-100 placeholder:text-emerald-800 focus:ring-emerald-500"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-900/50">
                                <span className="text-sm text-emerald-600 font-medium">Change:</span>
                                <span className={`text-xl font-bold font-mono ${change < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                    IDR {change.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-destructive/10 hover:text-destructive">Cancel</Button>
                    <Button
                        onClick={handleCheckout}
                        disabled={loading || cart.length === 0 || (paymentMethod === 'cash' && change < 0)}
                        className={cn("font-bold tracking-wide uppercase px-8 transition-all hover:scale-105", paymentMethod === 'cash' && change < 0 ? 'opacity-50' : 'bg-primary text-primary-foreground hover:bg-amber-600 shadow-xl shadow-primary/20')}
                    >
                        {loading ? 'Processing...' : `Pay IDR ${totalAmount.toLocaleString('id-ID')}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
