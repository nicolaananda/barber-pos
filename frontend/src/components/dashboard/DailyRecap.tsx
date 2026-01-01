'use client';

import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, DollarSign, Trophy, Wallet } from 'lucide-react';

interface DailyStats {
    totalRevenue: number;
    transactionCount: number;
    cashTotal: number;
    qrisTotal: number;
    topBarber: {
        name: string;
        revenue: number;
        count: number;
    } | null;
    recentTransactions: {
        id: number;
        invoiceCode: string;
        time: string;
        barberName: string;
        totalAmount: number;
        paymentMethod: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: any[];
    }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DailyRecap() {
    const { data: stats, error, isLoading } = useSWR<DailyStats>(`${API_BASE_URL}/dashboard/daily`, fetcher);

    if (isLoading) return <div className="h-[200px] flex items-center justify-center animate-pulse text-muted-foreground">Loading Daily Recap...</div>;
    if (error) return <div className="h-[200px] flex items-center justify-center text-destructive">Failed to load daily recap</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <Card className="bg-card border-border shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3">
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5" />
                        Daily Recap ({new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                        <div className="p-4 flex flex-col justify-center items-center text-center space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Revenue</span>
                            <div className="text-2xl font-black text-foreground">IDR {stats.totalRevenue.toLocaleString('id-ID')}</div>
                            <span className="text-sm text-muted-foreground">{stats.transactionCount} Transactions</span>
                        </div>

                        <div className="p-4 flex flex-col justify-center space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground"><Wallet className="w-4 h-4" /> Cash</span>
                                <span className="font-mono font-bold">IDR {stats.cashTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" /> QRIS</span>
                                <span className="font-mono font-bold">IDR {stats.qrisTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="p-4 flex flex-col justify-center items-center text-center space-y-1 bg-gradient-to-b from-transparent to-primary/5">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-500" /> Top Barber
                            </span>
                            {stats.topBarber ? (
                                <>
                                    <div className="text-lg font-bold text-foreground">{stats.topBarber.name}</div>
                                    <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">IDR {stats.topBarber.revenue.toLocaleString('id-ID')}</span>
                                </>
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No sales yet</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-lg">
                <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-lg font-bold text-foreground">Today's Cuts History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Time</th>
                                    <th className="px-4 py-3 font-semibold">Invoice</th>
                                    <th className="px-4 py-3 font-semibold">Barber</th>
                                    <th className="px-4 py-3 font-semibold">Items</th>
                                    <th className="px-4 py-3 font-semibold">Amount</th>
                                    <th className="px-4 py-3 font-semibold text-right">Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                                    stats.recentTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{new Date(tx.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.invoiceCode}</td>
                                            <td className="px-4 py-3 font-medium">{tx.barberName}</td>
                                            <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                                                {tx.items.map((i: any) => i.name).join(', ')}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-foreground">IDR {tx.totalAmount.toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${tx.paymentMethod === 'cash'
                                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    }`}>
                                                    {tx.paymentMethod.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                            No transactions recorded today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
