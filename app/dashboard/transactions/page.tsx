'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer } from 'lucide-react';

interface Transaction {
  _id: string;
  invoiceCode: string;
  date: string;
  barberId: { name: string };
  items: { name: string; price: number; qty: number }[];
  totalAmount: number;
  paymentMethod: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const handlePrint = (tx: Transaction) => {
    // Create a temporary hidden iframe or new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${tx.invoiceCode}</title>
            <style>
              @page { margin: 0; size: 80mm 297mm; } 
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
                    <div class="row"><span>Date</span> <span>${format(new Date(tx.date), 'dd/MM/yyyy HH:mm')}</span></div>
                    <div class="row"><span>Barber</span> <span>${tx.barberId.name}</span></div>
                </div>

                <div class="border-b"></div>

                <div class="mb-2">
                    ${tx.items.map(item => `
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
      // printWindow.close(); // Optional: close immediately after print dialog
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      tx.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.barberId?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const txDate = new Date(tx.date);
    const matchesStart = startDate ? txDate >= new Date(startDate) : true;
    const matchesEnd = endDate ? txDate <= new Date(new Date(endDate).setHours(23, 59, 59)) : true;

    return matchesSearch && matchesStart && matchesEnd;
  });

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Invoice', 'Date', 'Barber', 'Items', 'Total', 'Payment Method'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        tx.invoiceCode,
        format(new Date(tx.date), 'yyyy-MM-dd HH:mm'),
        tx.barberId?.name || 'Unknown',
        `"${tx.items.map(i => `${i.qty}x ${i.name}`).join('; ')}"`,
        tx.totalAmount,
        tx.paymentMethod
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading Records...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">Manage and analyze your past sales records.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
          Export CSV
        </Button>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle className="text-foreground">Records</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="Search Invoice / Barber..."
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold">Invoice</TableHead>
                  <TableHead className="text-muted-foreground font-bold">Date</TableHead>
                  <TableHead className="text-muted-foreground font-bold">Barber</TableHead>
                  <TableHead className="text-muted-foreground font-bold">Items Summary</TableHead>
                  <TableHead className="text-muted-foreground font-bold text-right">Total</TableHead>
                  <TableHead className="text-muted-foreground font-bold">Method</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No records found matching your filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx._id} className="border-border hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-primary font-medium">{tx.invoiceCode}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(tx.date), 'dd MMM yy HH:mm')}</TableCell>
                      <TableCell className="text-foreground font-medium">{tx.barberId?.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={tx.items.map(i => i.name).join(', ')}>
                        {tx.items.length} Items ({tx.items[0]?.name}{tx.items.length > 1 ? '...' : ''})
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground font-mono">IDR {tx.totalAmount.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tx.paymentMethod === 'qris' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' : 'bg-green-900/40 text-green-400 border border-green-800'}`}>
                          {tx.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10" onClick={() => handlePrint(tx)}>
                          <Printer className="h-4 w-4" />
                        </Button>
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
