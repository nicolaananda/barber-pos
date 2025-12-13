'use client';

import { useState } from 'react';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then((res) => res.json());
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';

interface PayrollStat {
    barberName: string;
    totalTransactions: number;
    totalRevenue: number;
    commissionType: string;
    commissionRate: number;
    estimatedCommission: number;
    period: string; // e.g. "January 2024"
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollPage() {
    const router = useRouter(); // eslint-disable-line @typescript-eslint/no-unused-vars


    // Default to current month/year
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());

    // Construct URL based on state
    const query = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
    });

    // Use SWR dependent on key
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: stats = [], isLoading: loading } = useSWR<PayrollStat[]>(`/api/payroll?${query}`, fetcher);

    const handlePrintSlip = (stat: PayrollStat) => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                 <html>
                   <head>
                     <title>Salary Slip - ${stat.barberName}</title>
                     <style>
                       body { font-family: sans-serif; padding: 40px; color: #333; }
                       .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                       .content { max-width: 600px; margin: 0 auto; }
                       .row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dotted #ccc; }
                       .total-row { display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
                       .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; }
                     </style>
                   </head>
                   <body>
                     <div class="header">
                       <h1>Staycool Hairlab</h1>
                       <h3>Salary Slip</h3>
                       <p>Period: ${stat.period}</p>
                     </div>
                     <div class="content">
                       <div class="row">
                         <span>Employee Name:</span>
                         <strong>${stat.barberName}</strong>
                       </div>
                       <div class="row">
                         <span>Total Services:</span>
                         <span>${stat.totalTransactions} Cuts</span>
                       </div>
                       <div class="row">
                         <span>Total Revenue Generated:</span>
                         <span>IDR ${stat.totalRevenue.toLocaleString('id-ID')}</span>
                       </div>
                       <div class="row">
                         <span>Commission Scheme:</span>
                         <span>${stat.commissionType === 'percentage' ? `${stat.commissionRate}%` : `Flat IDR ${stat.commissionRate}`}</span>
                       </div>
                       
                       <div class="total-row">
                         <span>Total Take Home Pay:</span>
                         <span>IDR ${stat.estimatedCommission.toLocaleString('id-ID')}</span>
                       </div>

                       <div style="margin-top: 40px; text-align: right;">
                          <p>Authorized Signature</p>
                          <br><br><br>
                          <p>( ________________ )</p>
                       </div>
                     </div>
                     <div class="footer">
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                     </div>
                   </body>
                 </html>
             `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    if (loading) return <div className="p-8">Loading Payroll Data...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Payroll & Commission</h1>
                    <p className="text-muted-foreground mt-1">Automated salary and commission calculations for your team.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i} value={i.toString()} className="hover:bg-primary/10 cursor-pointer">{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px] bg-card border-border text-foreground">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="2024" className="hover:bg-primary/10 cursor-pointer">2024</SelectItem>
                            <SelectItem value="2025" className="hover:bg-primary/10 cursor-pointer">2025</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stats.length === 0 && !loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No payroll data available for this period.
                    </div>
                ) : (
                    stats.map((stat) => (
                        <Card key={stat.barberName} className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/30">
                                        {stat.barberName.substring(0, 2).toUpperCase()}
                                    </div>
                                    {stat.barberName}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => handlePrintSlip(stat)} className="hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
                                    <Printer className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-sm border-b border-border pb-4 border-dashed">
                                        <div className="text-muted-foreground">Period</div>
                                        <div className="font-medium text-foreground text-right">{stat.period}</div>

                                        <div className="text-muted-foreground">Transactions</div>
                                        <div className="font-medium text-foreground text-right">{stat.totalTransactions} Cuts</div>

                                        <div className="text-muted-foreground">Revenue Gen.</div>
                                        <div className="font-medium text-foreground text-right">IDR {stat.totalRevenue.toLocaleString('id-ID')}</div>
                                    </div>

                                    <div className="bg-secondary/30 rounded-lg p-3 border border-border">
                                        <div className="flex justify-between items-center text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                            <span>Commission</span>
                                            <span>{stat.commissionType === 'percentage' ? `${stat.commissionRate}%` : `Flat IDR ${stat.commissionRate}`}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-semibold text-foreground">Take Home Pay</span>
                                            <span className="text-xl font-bold font-mono text-primary tracking-tight">IDR {stat.estimatedCommission.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
