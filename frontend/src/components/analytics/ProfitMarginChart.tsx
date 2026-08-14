import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../lib/api';

type Props = { startDate?: string; endDate?: string };
type DeltaSet = { revenue?: number; operatingResult?: number; transactionCount?: number; averageTicket?: number };
type Data = { overall: { totalRevenue: number; totalExpenses: number; grossProfit: number; grossMargin: number; operatingResult?: number; transactionCount?: number; averageTicket?: number; previousPeriodDeltas?: DeltaSet; deltas?: DeltaSet }; byService: Record<string, { revenue: number; profit: number; margin: number }>; byBarber: Record<string, { barberName: string; revenue: number; netRevenue: number; margin: number }> };
type Response = { data: Data };
const money = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

function Delta({ value }: { value?: number }) {
    if (value == null) return <span className="text-zinc-400">Perbandingan belum tersedia</span>;
    const word = value > 0 ? 'Naik' : value < 0 ? 'Turun' : 'Tetap';
    return <span className={value >= 0 ? 'text-emerald-700' : 'text-red-700'}>{word} {value > 0 ? '+' : ''}{value.toFixed(1)}% vs periode sebelumnya</span>;
}

export default function ProfitMarginChart({ startDate, endDate }: Props) {
    const [data, setData] = useState<Data | null>(null); const [error, setError] = useState(''); const [view, setView] = useState<'service' | 'barber'>('service');
    useEffect(() => { const params = new URLSearchParams(); if (startDate) params.set('startDate', startDate); if (endDate) params.set('endDate', endDate); Promise.resolve().then(() => { setData(null); setError(''); return apiFetch<Response>(`/analytics/profit-margin?${params}`); }).then(r => setData(r.data)).catch(() => setError('Profitabilitas gagal dimuat.')); }, [startDate, endDate]);
    if (error) return <div role="alert" className="p-6 bg-white border border-red-200 rounded-xl text-red-700">{error}</div>;
    if (!data) return <div className="p-10 bg-white border border-zinc-200 rounded-xl text-center text-zinc-500">Memuat profitabilitas…</div>;
    const deltas = data.overall.previousPeriodDeltas ?? data.overall.deltas ?? {};
    const transactionCount = data.overall.transactionCount ?? Object.values(data.byBarber).reduce((sum, row) => sum + Number((row as { transactionCount?: number }).transactionCount ?? 0), 0);
    const averageTicket = data.overall.averageTicket ?? (transactionCount ? data.overall.totalRevenue / transactionCount : 0);
    const cards = [['Pendapatan', money(data.overall.totalRevenue), deltas.revenue], ['Hasil operasional', money(data.overall.operatingResult ?? data.overall.grossProfit), deltas.operatingResult], ['Jumlah transaksi', transactionCount.toLocaleString('id-ID'), deltas.transactionCount], ['Tiket rata-rata', money(averageTicket), deltas.averageTicket]] as const;
    const chartData = view === 'service' ? Object.entries(data.byService).map(([name, x]) => ({ name, revenue: x.revenue, result: x.profit, margin: x.margin })).sort((a, b) => b.revenue - a.revenue) : Object.values(data.byBarber).map(x => ({ name: x.barberName, revenue: x.revenue, result: x.netRevenue, margin: x.margin })).sort((a, b) => b.revenue - a.revenue);
    return <section className="space-y-5" aria-labelledby="profit-title"><div><h2 id="profit-title" className="text-xl font-bold text-zinc-900">Kinerja Operasional</h2><p className="text-sm text-zinc-500">Headline periode terpilih dan perubahan terhadap periode sebelumnya.</p></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(([label, value, delta]) => <article key={label} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p><p className="text-xl font-black text-zinc-900 mt-1">{value}</p><p className="text-xs mt-2"><Delta value={delta} /></p></article>)}</div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-3 mb-5"><div><h3 className="font-bold">Drill-down pendapatan</h3><p className="text-xs text-zinc-500">Pendapatan dibanding kontribusi setelah biaya terkait.</p></div><div className="flex gap-1" aria-label="Dimensi grafik">{(['service', 'barber'] as const).map(x => <button key={x} aria-pressed={view === x} onClick={() => setView(x)} className={`px-3 py-2 rounded-lg text-sm ${view === x ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>{x === 'service' ? 'Per layanan' : 'Per barber'}</button>)}</div></div>
            {chartData.length ? <><ResponsiveContainer width="100%" height={300}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={n => `${n / 1000}rb`} /><Tooltip formatter={v => money(Number(v))} /><Legend /><Bar dataKey="revenue" name="Pendapatan" fill="#18181b" /><Bar dataKey="result" name="Kontribusi" fill="#a1a1aa" /></BarChart></ResponsiveContainer><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="border-b"><th scope="col" className="p-2 text-left">Nama</th><th scope="col" className="p-2 text-right">Pendapatan</th><th scope="col" className="p-2 text-right">Kontribusi</th><th scope="col" className="p-2 text-right">Margin</th></tr></thead><tbody>{chartData.map(row => <tr key={row.name} className="border-b border-zinc-100"><td className="p-2">{row.name}</td><td className="p-2 text-right">{money(row.revenue)}</td><td className="p-2 text-right">{money(row.result)}</td><td className="p-2 text-right">{row.margin.toFixed(1)}%</td></tr>)}</tbody></table></div></> : <p className="py-12 text-center text-zinc-500">Belum ada transaksi pada periode ini.</p>}
        </div></section>;
}
