import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Clock, Crown, Scissors, Sparkles, TrendingUp, UserX, Users } from 'lucide-react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import ProfitMarginChart from '../../components/analytics/ProfitMarginChart';
import RevenueForecast from '../../components/analytics/RevenueForecast';
import CustomerSegmentation from '../../components/analytics/CustomerSegmentation';
import PeakHoursHeatmap from '../../components/analytics/PeakHoursHeatmap';
import ChurnRateDisplay from '../../components/analytics/ChurnRateDisplay';
import CLVRankings from '../../components/analytics/CLVRankings';
import BookingHistoryTable from '../../components/analytics/BookingHistoryTable';
import { apiFetch } from '../../lib/api';

type AnalyticsTab = 'overview' | 'profit-margin' | 'barber-performance' | 'revenue-forecast' | 'customer-segmentation' | 'peak-hours' | 'churn-rate' | 'clv' | 'booking-history';
type DateRange = { startDate: string; endDate: string };
type Barber = { barberId: number; barberName: string; totalRevenue: number; contributionAfterCommission?: number; netRevenue?: number; totalTransactions: number; avgTicket: number; revenueDelta?: number; transactionDelta?: number; avgTicketDelta?: number };
type ApiResponse<T> = { success: boolean; data: T };

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const query = ({ startDate, endDate }: DateRange) => new URLSearchParams({ startDate, endDate }).toString();

function Delta({ value }: { value?: number }) {
    if (value == null) return <span className="text-zinc-400">—</span>;
    const direction = value > 0 ? 'Naik' : value < 0 ? 'Turun' : 'Tetap';
    return <span className={value >= 0 ? 'text-emerald-700' : 'text-red-700'}>{direction} {value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

function BarberPerformance({ range, compact = false }: { range: DateRange; compact?: boolean }) {
    const [data, setData] = useState<Barber[] | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        Promise.resolve().then(() => { setData(null); setError(''); return apiFetch<ApiResponse<Barber[]>>(`/analytics/barber-comparison?${query(range)}`); })
            .then(result => setData(result.data))
            .catch(() => setError('Performa barber gagal dimuat.'));
    }, [range]);
    return <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden" aria-labelledby="barber-performance-title">
        <div className="p-5 border-b border-zinc-200"><h2 id="barber-performance-title" className="font-bold text-zinc-900">Performa Barber</h2><p className="text-sm text-zinc-500">Kontribusi pendapatan pada periode terpilih.</p></div>
        {error ? <p role="alert" className="p-6 text-red-700">{error}</p> : data === null ? <p className="p-6 text-zinc-500">Memuat performa barber…</p> : data.length === 0 ? <p className="p-6 text-zinc-500">Belum ada transaksi barber pada periode ini.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 text-zinc-600"><tr><th scope="col" className="p-3 text-left">Peringkat</th><th scope="col" className="p-3 text-left">Barber</th><th scope="col" className="p-3 text-right">Pendapatan</th><th scope="col" className="p-3 text-right">Kontribusi setelah komisi</th>{!compact && <><th scope="col" className="p-3 text-right">Transaksi</th><th scope="col" className="p-3 text-right">Tiket rata-rata</th><th scope="col" className="p-3 text-right">Delta pendapatan</th></>}</tr></thead><tbody className="divide-y divide-zinc-100">{data.map((barber, index) => <tr key={barber.barberId} className="hover:bg-zinc-50"><td className="p-3 font-bold">#{index + 1}</td><td className="p-3 font-medium">{barber.barberName}</td><td className="p-3 text-right">{money(barber.totalRevenue)}</td><td className="p-3 text-right">{barber.contributionAfterCommission != null || barber.netRevenue != null ? money(barber.contributionAfterCommission ?? barber.netRevenue ?? 0) : 'Belum tersedia'}</td>{!compact && <><td className="p-3 text-right">{barber.totalTransactions.toLocaleString('id-ID')}<div className="text-xs"><Delta value={barber.transactionDelta} /></div></td><td className="p-3 text-right">{money(barber.avgTicket)}<div className="text-xs"><Delta value={barber.avgTicketDelta} /></div></td><td className="p-3 text-right"><Delta value={barber.revenueDelta} /></td></>}</tr>)}</tbody></table></div>}
    </section>;
}

export default function Analytics() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') });
    const tabs = [
        ['overview', 'Ringkasan', Sparkles], ['profit-margin', 'Profitabilitas', BarChart3], ['barber-performance', 'Performa Barber', Scissors], ['revenue-forecast', 'Proyeksi', TrendingUp], ['customer-segmentation', 'Segmen', Users], ['peak-hours', 'Jam Ramai', Clock], ['churn-rate', 'Retensi', UserX], ['clv', 'Nilai Pelanggan', Crown], ['booking-history', 'Booking', Calendar]
    ] as const;
    const props = { startDate: dateRange.startDate, endDate: dateRange.endDate };
    const content = activeTab === 'overview' ? <div className="space-y-6"><ProfitMarginChart {...props} /><div className="grid gap-6 xl:grid-cols-2"><CustomerSegmentation {...props} compact /><BarberPerformance range={dateRange} compact /></div><PeakHoursHeatmap {...props} /></div>
        : activeTab === 'profit-margin' ? <ProfitMarginChart {...props} />
        : activeTab === 'barber-performance' ? <BarberPerformance range={dateRange} />
        : activeTab === 'revenue-forecast' ? <RevenueForecast />
        : activeTab === 'customer-segmentation' ? <CustomerSegmentation {...props} />
        : activeTab === 'peak-hours' ? <PeakHoursHeatmap {...props} />
        : activeTab === 'churn-rate' ? <ChurnRateDisplay {...props} />
        : activeTab === 'clv' ? <CLVRankings {...props} />
        : <BookingHistoryTable startDate={dateRange.startDate} endDate={dateRange.endDate} />;
    return <main className="min-h-screen bg-zinc-50 p-4 md:p-6"><div className="max-w-7xl mx-auto space-y-5">
        <header><h1 className="text-3xl md:text-4xl font-black text-zinc-900">Analitik Bisnis</h1><p className="text-zinc-500">Ringkasan keputusan, pelanggan, kapasitas, dan profitabilitas.</p></header>
        <section className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm" aria-label="Rentang tanggal global"><div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"><label className="text-sm font-medium text-zinc-700">Tanggal mulai<input aria-label="Tanggal mulai" type="date" value={dateRange.startDate} max={dateRange.endDate} onChange={e => setDateRange(v => ({ ...v, startDate: e.target.value }))} className="mt-1 block w-full border border-zinc-300 rounded-lg px-3 py-2" /></label><label className="text-sm font-medium text-zinc-700">Tanggal akhir<input aria-label="Tanggal akhir" type="date" value={dateRange.endDate} min={dateRange.startDate} onChange={e => setDateRange(v => ({ ...v, endDate: e.target.value }))} className="mt-1 block w-full border border-zinc-300 rounded-lg px-3 py-2" /></label><p className="text-xs text-zinc-500 pb-2">Berlaku untuk analitik yang mendukung periode.</p></div></section>
        <nav className="bg-white border border-zinc-200 rounded-xl p-2 overflow-x-auto shadow-sm" aria-label="Analitik terperinci"><div className="flex min-w-max gap-1" role="tablist">{tabs.map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${activeTab === id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}><Icon className="w-4 h-4" />{label}</button>)}</div></nav>
        <div role="tabpanel">{content}</div>
    </div></main>;
}
