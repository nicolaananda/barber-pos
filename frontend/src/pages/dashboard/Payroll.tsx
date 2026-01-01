import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, DollarSign, TrendingUp, Users, Calculator, Printer } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';

interface PayrollData {
    barberId: number;
    barberName: string;
    totalTransactions: number;
    totalRevenue: number;
    estimatedCommission: number;
    period: string;
}

export default function PayrollPage() {
    const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        fetchPayroll();
    }, [selectedMonth, selectedYear]);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/payroll?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch payroll');
            const data = await res.json();
            setPayrollData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalCommissions = payrollData.reduce((sum, item) => sum + item.estimatedCommission, 0);
    const totalRevenue = payrollData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalTransactions = payrollData.reduce((sum, item) => sum + item.totalTransactions, 0);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const handlePrintBarber = (barber: PayrollData) => {
        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        if (!printWindow) return;

        const monthName = months[parseInt(selectedMonth)];
        const year = selectedYear;
        const printDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Slip Gaji - ${barber.barberName} - ${monthName} ${year}</title>
                <style>
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        color: #000;
                        background: #fff;
                        line-height: 1.5;
                    }
                    .container {
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 25px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #000;
                    }
                    .logo-section {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        margin-bottom: 10px;
                    }
                    .logo {
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 2px solid #000;
                        filter: grayscale(100%);
                    }
                    .company-name {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .company-address {
                        font-size: 11px;
                        margin: 2px 0;
                        line-height: 1.4;
                    }
                    .document-title {
                        margin-top: 20px;
                        font-size: 16px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .period {
                        font-size: 12px;
                        font-weight: normal;
                        margin-top: 5px;
                        text-transform: capitalize;
                    }
                    .employee-name {
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        font-size: 11px;
                    }
                    .info-table td {
                        padding: 8px 12px;
                        border: 1px solid #000;
                    }
                    .info-table td:first-child {
                        width: 30%;
                        font-weight: bold;
                        background: #f5f5f5;
                    }
                    .info-table td:last-child {
                        width: 70%;
                    }
                    .section-title {
                        font-size: 12px;
                        font-weight: bold;
                        margin: 20px 0 10px 0;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #000;
                        text-transform: uppercase;
                    }
                    .detail-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                        font-size: 11px;
                    }
                    .detail-table th,
                    .detail-table td {
                        padding: 8px 10px;
                        border: 1px solid #000;
                        text-align: left;
                    }
                    .detail-table th {
                        background: #f5f5f5;
                        font-weight: bold;
                        text-align: center;
                        text-transform: uppercase;
                    }
                    .detail-table td:last-child {
                        text-align: right;
                        font-family: 'Courier New', monospace;
                        font-weight: bold;
                    }
                    .detail-table td:nth-child(2) {
                        text-align: center;
                    }
                    .total-row {
                        font-weight: bold;
                        background: #f5f5f5;
                    }
                    .total-row td {
                        padding: 10px;
                        font-size: 12px;
                        border-top: 2px solid #000;
                    }
                    .calculation-section {
                        margin: 20px 0;
                    }
                    .calc-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
                    }
                    .calc-table td {
                        padding: 6px 10px;
                        border: 1px solid #000;
                    }
                    .calc-table td:first-child {
                        width: 70%;
                        background: #f5f5f5;
                    }
                    .calc-table td:last-child {
                        width: 30%;
                        text-align: right;
                        font-family: 'Courier New', monospace;
                        font-weight: bold;
                    }
                    .calc-table .total-row td {
                        background: #f5f5f5;
                        border-top: 2px solid #000;
                        font-size: 13px;
                        padding: 10px;
                    }
                    .signature-section {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 45%;
                        text-align: center;
                    }
                    .signature-line {
                        margin-top: 60px;
                        border-top: 1px solid #000;
                        padding-top: 5px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 9px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo-section">
                            <img src="/logo.jpg" class="logo" alt="Logo" />
                            <div>
                                <div class="company-name">Staycool Hairlab</div>
                                <div class="company-address">Jl. Imam Bonjol Pertigaan No.370, Ngadirejo</div>
                                <div class="company-address">Kota Kediri - Telp: 0877-7099-5270</div>
                            </div>
                        </div>
                        <div class="document-title">
                            Slip Gaji
                            <div class="period">Periode: ${monthName} ${year}</div>
                        </div>
                        <div class="employee-name">${barber.barberName}</div>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td>Nama Karyawan</td>
                            <td>${barber.barberName}</td>
                        </tr>
                        <tr>
                            <td>Periode</td>
                            <td>${monthName} ${year}</td>
                        </tr>
                        <tr>
                            <td>Tanggal Cetak</td>
                            <td>${printDate}</td>
                        </tr>
                    </table>

                    <div class="section-title">Rincian Pendapatan</div>
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th style="width: 50%;">Keterangan</th>
                                <th style="width: 25%;">Jumlah</th>
                                <th style="width: 25%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Transaksi</td>
                                <td>${barber.totalTransactions}</td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <td>Total Pendapatan</td>
                                <td>-</td>
                                <td>IDR ${barber.totalRevenue.toLocaleString('id-ID')}</td>
                            </tr>

                        </tbody>
                    </table>

                    <div class="section-title">Perhitungan Komisi</div>
                    <table class="calc-table">
                        <tr>
                            <td>Total Pendapatan</td>
                            <td>IDR ${barber.totalRevenue.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                            <td>Total Transaksi</td>
                            <td>${barber.totalTransactions} transaksi</td>
                        </tr>
                        <tr class="total-row">
                            <td>TOTAL KOMISI YANG DITERIMA</td>
                            <td>IDR ${barber.estimatedCommission.toLocaleString('id-ID')}</td>
                        </tr>
                    </table>

                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-line">Karyawan</div>
                            <div style="margin-top: 5px; font-size: 10px;">${barber.barberName}</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Owner</div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Dokumen ini dicetak secara otomatis oleh sistem Staycool Hairlab</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Payroll Management</h1>
                    <p className="text-muted-foreground">Track barber commissions and salary calculations.</p>
                </div>
                <div className="flex gap-3 items-end">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-900 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-300 uppercase tracking-widest flex items-center justify-between">
                            <span>Total Commissions</span>
                            <DollarSign className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white font-mono">
                            IDR {totalCommissions.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                            <Calculator className="w-3 h-3 text-zinc-400" />
                            Estimated payroll for period
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-zinc-200 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-widest flex items-center justify-between text-zinc-500">
                            <span>Total Revenue</span>
                            <TrendingUp className="w-4 h-4 text-zinc-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold font-mono text-zinc-900">
                            IDR {totalRevenue.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Generated by all barbers
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-zinc-200 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-widest flex items-center justify-between text-zinc-500">
                            <span>Total Transactions</span>
                            <Users className="w-4 h-4 text-zinc-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold font-mono text-zinc-900">
                            {totalTransactions}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Cuts completed this period
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-zinc-900 font-bold">Barber Payroll Summary</CardTitle>
                    <CardDescription className="text-zinc-500">
                        Commission breakdown for {months[parseInt(selectedMonth)]} {selectedYear}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-900" /></div>
                    ) : payrollData.length === 0 ? (
                        <div className="text-center p-12 text-zinc-500">
                            No payroll data available for this period
                        </div>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 overflow-x-auto bg-white">
                            <table className="w-full text-sm text-left min-w-[800px]">
                                <thead className="bg-zinc-50 uppercase tracking-wider text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-4 pl-6">Barber</th>
                                        <th className="p-4 text-center">Transactions</th>
                                        <th className="p-4 text-right">Revenue</th>
                                        <th className="p-4 text-right">Commission</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {payrollData.map((barber) => (
                                        <tr key={barber.barberId} className="hover:bg-zinc-50 transition-colors group">
                                            <td className="p-4 pl-6 font-bold text-zinc-900">{barber.barberName}</td>
                                            <td className="p-4 text-center font-mono text-zinc-500">
                                                {barber.totalTransactions}
                                            </td>
                                            <td className="p-4 text-right font-mono text-zinc-900">
                                                IDR {barber.totalRevenue.toLocaleString('id-ID')}
                                            </td>

                                            <td className="p-4 text-right font-bold text-zinc-900 font-mono text-base">
                                                IDR {barber.estimatedCommission.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handlePrintBarber(barber)}
                                                    className="h-8 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                                                >
                                                    <Printer className="w-3 h-3 mr-1" />
                                                    Print
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-zinc-50 border-t border-zinc-200">
                                    <tr>
                                        <td className="p-4 pl-6 font-bold uppercase text-sm text-zinc-900">Total</td>
                                        <td className="p-4 text-center font-mono font-bold text-zinc-900">
                                            {totalTransactions}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-zinc-900">
                                            IDR {totalRevenue.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-4 text-right font-bold text-zinc-900 font-mono text-lg">
                                            IDR {totalCommissions.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
