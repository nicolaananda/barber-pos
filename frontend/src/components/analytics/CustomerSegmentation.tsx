import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { apiFetch } from '../../lib/api';

type Customer = { customerId: number; name: string; recency: number; frequency: number; monetary: number; segment: string; recommendedAction?: string };
type Data = { segments: Record<string, Customer[]>; summary: Record<string, number> };
type Props = { startDate?: string; endDate?: string; compact?: boolean };
const colors = ['#18181b', '#52525b', '#a1a1aa', '#d4d4d8', '#e4e4e7'];
const money = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const action = (customer: Customer) => customer.recommendedAction ?? (customer.segment === 'VIP' ? 'Pertahankan dengan benefit loyalitas.' : customer.segment === 'At-Risk' ? 'Tawarkan alasan relevan untuk kembali.' : customer.segment === 'Lost' ? 'Evaluasi nilai reaktivasi sebelum promosi.' : 'Dorong kunjungan berikutnya secara terukur.');

export default function CustomerSegmentation({ startDate, endDate, compact = false }: Props) {
    const [data, setData] = useState<Data | null>(null); const [error, setError] = useState(''); const [segment, setSegment] = useState('VIP');
    useEffect(() => { const p = new URLSearchParams(); if (startDate) p.set('startDate', startDate); if (endDate) p.set('endDate', endDate); setData(null); setError(''); apiFetch<{ data: Data }>(`/analytics/customer-segmentation?${p}`).then(r => setData(r.data)).catch(() => setError('Segmentasi pelanggan gagal dimuat.')); }, [startDate, endDate]);
    const chart = useMemo(() => data ? ['VIP', 'Regular', 'Occasional', 'At-Risk', 'Lost'].map(name => ({ name, value: data.summary[name] || 0 })).filter(x => x.value) : [], [data]);
    if (error) return <div role="alert" className="p-6 bg-white border border-red-200 rounded-xl text-red-700">{error}</div>;
    if (!data) return <div className="p-10 bg-white border border-zinc-200 rounded-xl text-center text-zinc-500">Memuat segmentasi…</div>;
    const priority = data.segments[segment] ?? [];
    return <section className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden" aria-labelledby="segment-title"><div className="p-5 border-b border-zinc-200"><h2 id="segment-title" className="font-bold text-zinc-900">Segmentasi Pelanggan</h2><p className="text-sm text-zinc-500">Prioritas tindakan berbasis recency, frequency, dan monetary.</p></div>
        <div className={`grid ${compact ? '' : 'lg:grid-cols-[300px_1fr]'} gap-4 p-5`}><div><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={chart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82}>{chart.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="grid grid-cols-2 gap-2">{chart.map((item, i) => <button key={item.name} aria-pressed={segment === item.name} onClick={() => setSegment(item.name)} className={`text-left rounded-lg border p-2 text-sm ${segment === item.name ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'}`}><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: colors[i] }} />{item.name}: <strong>{item.value}</strong></button>)}</div></div>
        {!compact && <div className="overflow-x-auto"><h3 className="font-bold mb-3">Daftar tindakan: {segment}</h3>{priority.length ? <table className="w-full text-sm"><thead className="bg-zinc-50"><tr><th scope="col" className="p-3 text-left">Pelanggan</th><th scope="col" className="p-3 text-right">Terakhir datang</th><th scope="col" className="p-3 text-right">Frekuensi</th><th scope="col" className="p-3 text-right">Nilai historis</th><th scope="col" className="p-3 text-left">Rekomendasi</th></tr></thead><tbody className="divide-y divide-zinc-100">{priority.map(c => <tr key={c.customerId}><td className="p-3 font-medium">{c.name}</td><td className="p-3 text-right">{c.recency} hari</td><td className="p-3 text-right">{c.frequency} transaksi</td><td className="p-3 text-right">{money(c.monetary)}</td><td className="p-3 max-w-xs">{action(c)}</td></tr>)}</tbody></table> : <p className="py-10 text-center text-zinc-500">Tidak ada pelanggan dalam segmen ini.</p>}</div>}</div></section>;
}
