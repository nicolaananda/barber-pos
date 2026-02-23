import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Loader2, Phone, CalendarDays, Clock, Scissors, CheckCircle2, ChevronLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Barber { id: number; name: string }

interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    serviceName: string | null;
    status: 'pending' | 'confirmed';
    rescheduleCount: number;
    barber: Barber;
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const BUSINESS_HOURS = Array.from({ length: 11 }, (_, i) => {
    const start = 11 + i;
    const end = start + 1;
    return `${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00`;
}); // 11:00–22:00

type Step = 'lookup' | 'select-booking' | 'select-schedule' | 'success';

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export default function RescheduleBooking() {
    const [step, setStep] = useState<Step>('lookup');
    const [phone, setPhone] = useState('');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [newDate, setNewDate] = useState<string>('');
    const [newTimeSlot, setNewTimeSlot] = useState('');
    const [takenSlots, setTakenSlots] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Available dates: today+1 to today+30
    const today = startOfDay(new Date());
    const minDate = format(addDays(today, 0), 'yyyy-MM-dd');
    const maxDate = format(addDays(today, 30), 'yyyy-MM-dd');

    // Fetch taken slots when date or barber changes
    useEffect(() => {
        if (!selectedBooking || !newDate) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookings/date/${newDate}`);
                if (res.ok) {
                    const data: { timeSlot: string; barberId: number }[] = await res.json();
                    const taken = data
                        .filter(b => b.barberId === selectedBooking.barber.id)
                        .map(b => b.timeSlot);
                    setTakenSlots(taken);
                }
            } catch {
                setTakenSlots([]);
            }
        })();
    }, [newDate, selectedBooking]);

    // ------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------
    const handleLookup = async () => {
        setError('');
        const trimmed = phone.trim();
        if (!trimmed) return setError('Masukkan nomor HP terlebih dahulu');
        const phonePattern = /^08\d{8,11}$/;
        if (!phonePattern.test(trimmed)) return setError('Format nomor tidak valid. Contoh: 08xxxxxxxxxx');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/active?phone=${encodeURIComponent(trimmed)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mencari booking');
            if (!data.length) {
                setError('Tidak ada booking aktif yang ditemukan untuk nomor ini.');
                setIsLoading(false);
                return;
            }
            setBookings(data);
            setStep('select-booking');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBooking = (booking: Booking) => {
        if (booking.rescheduleCount >= 1) {
            toast.error('Booking ini sudah pernah direschedule (maks. 1x).');
            return;
        }
        setSelectedBooking(booking);
        setNewDate('');
        setNewTimeSlot('');
        setError('');
        setStep('select-schedule');
    };

    const handleSubmit = async () => {
        if (!newDate || !newTimeSlot) return setError('Pilih tanggal dan jam terlebih dahulu');
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: selectedBooking!.id,
                    phone: phone.trim(),
                    newDate,
                    newTimeSlot
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal reschedule');
            setStep('success');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const reset = () => {
        setStep('lookup');
        setPhone('');
        setBookings([]);
        setSelectedBooking(null);
        setNewDate('');
        setNewTimeSlot('');
        setError('');
    };

    // ------------------------------------------------------------------
    // UI helpers
    // ------------------------------------------------------------------
    const StatusBadge = ({ status }: { status: string }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
            {status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
        </span>
    );

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
            {/* Logo / Brand */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                    <Scissors className="w-6 h-6 text-white" />
                    <span className="text-white font-black text-xl tracking-tight">Staycool Hairlab</span>
                </div>
                <p className="text-zinc-400 text-sm">Ubah Jadwal Booking</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">

                {/* ── STEP: LOOKUP ─────────────────────────────────────────── */}
                {step === 'lookup' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h1 className="text-white font-black text-2xl">Cari Booking</h1>
                            <p className="text-zinc-400 text-sm mt-1">Masukkan nomor HP yang dipakai saat booking</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Nomor WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    placeholder="08xxxxxxxxxx"
                                    value={phone}
                                    onChange={e => { setPhone(e.target.value); setError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                    className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleLookup}
                            disabled={isLoading}
                            className="w-full h-12 rounded-2xl bg-white text-zinc-900 font-bold hover:bg-zinc-100 text-sm"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari Booking Saya'}
                        </Button>
                    </div>
                )}

                {/* ── STEP: SELECT BOOKING ─────────────────────────────────── */}
                {step === 'select-booking' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <button onClick={reset} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h2 className="text-white font-black text-xl">Pilih Booking</h2>
                                <p className="text-zinc-400 text-xs mt-0.5">Tap booking yang ingin diubah jadwalnya</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {bookings.map(b => {
                                const canReschedule = b.rescheduleCount < 1;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => handleSelectBooking(b)}
                                        disabled={!canReschedule}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${canReschedule
                                                ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-750'
                                                : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-white font-bold text-sm">{b.serviceName || 'Potong Rambut'}</p>
                                            <StatusBadge status={b.status} />
                                        </div>
                                        <div className="space-y-1 text-zinc-400 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarDays className="w-3 h-3" />
                                                {format(new Date(b.bookingDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {b.timeSlot} WIB
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Scissors className="w-3 h-3" />
                                                {b.barber.name}
                                            </div>
                                        </div>
                                        {!canReschedule && (
                                            <p className="mt-2 text-[10px] text-red-400 font-medium">Sudah direschedule 1x (tidak bisa reschedule lagi)</p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── STEP: SELECT SCHEDULE ────────────────────────────────── */}
                {step === 'select-schedule' && selectedBooking && (
                    <div className="p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setStep('select-booking')} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h2 className="text-white font-black text-xl">Pilih Jadwal Baru</h2>
                                <p className="text-zinc-400 text-xs mt-0.5">Untuk: <span className="text-white font-medium">{selectedBooking.serviceName || 'Potong Rambut'}</span></p>
                            </div>
                        </div>

                        {/* Old schedule summary */}
                        <div className="bg-zinc-800 rounded-2xl p-3 border border-zinc-700">
                            <p className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold mb-2">Jadwal Sekarang</p>
                            <div className="flex gap-4 text-sm text-white">
                                <div className="flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                                    {format(new Date(selectedBooking.bookingDate), 'dd MMM yyyy', { locale: idLocale })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                    {selectedBooking.timeSlot}
                                </div>
                            </div>
                        </div>

                        {/* Date picker */}
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Tanggal Baru</Label>
                            <input
                                type="date"
                                value={newDate}
                                min={minDate}
                                max={maxDate}
                                onChange={e => { setNewDate(e.target.value); setNewTimeSlot(''); setError(''); }}
                                className="w-full h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                            />
                        </div>

                        {/* Time slots grid */}
                        {newDate && (
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Jam Baru</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {BUSINESS_HOURS.map(slot => {
                                        const isTaken = takenSlots.includes(slot);
                                        const isCurrent = slot === selectedBooking.timeSlot && newDate === format(new Date(selectedBooking.bookingDate), 'yyyy-MM-dd');
                                        const isSelected = newTimeSlot === slot;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                disabled={isTaken && !isCurrent}
                                                onClick={() => { if (!isTaken || isCurrent) { setNewTimeSlot(slot); setError(''); } }}
                                                className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-150
                                                    ${isSelected
                                                        ? 'bg-white text-zinc-900 shadow-lg scale-105'
                                                        : isTaken && !isCurrent
                                                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed line-through'
                                                            : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                                                    }`}
                                            >
                                                {slot.split(' - ')[0]}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-zinc-500 text-[10px]">Jam yang dicoret sudah terisi</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !newDate || !newTimeSlot}
                            className="w-full h-12 rounded-2xl bg-white text-zinc-900 font-bold hover:bg-zinc-100 text-sm disabled:opacity-40"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses...</>
                            ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" />Konfirmasi Reschedule</>
                            )}
                        </Button>
                    </div>
                )}

                {/* ── STEP: SUCCESS ─────────────────────────────────────────── */}
                {step === 'success' && selectedBooking && (
                    <div className="p-8 flex flex-col items-center text-center space-y-5">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-9 h-9 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-2xl mb-1">Berhasil!</h2>
                            <p className="text-zinc-400 text-sm">Jadwal booking Anda telah diubah</p>
                        </div>

                        <div className="w-full bg-zinc-800 rounded-2xl p-4 text-left space-y-3 border border-zinc-700">
                            <div>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Jadwal Baru</p>
                                <p className="text-white font-bold text-sm mt-1">
                                    {format(new Date(newDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                                </p>
                                <p className="text-zinc-300 text-sm">{newTimeSlot} WIB</p>
                            </div>
                            <div className="border-t border-zinc-700 pt-3">
                                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Layanan</p>
                                <p className="text-white text-sm mt-1">{selectedBooking.serviceName || 'Potong Rambut'}</p>
                                <p className="text-zinc-400 text-xs">Barber: {selectedBooking.barber.name}</p>
                            </div>
                        </div>

                        <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-3 text-left w-full">
                            <p className="text-blue-300 text-xs leading-relaxed">
                                💬 Konfirmasi telah dikirim ke WhatsApp Anda. Mohon datang <strong>10 menit sebelum</strong> jadwal.
                            </p>
                        </div>

                        <Button
                            onClick={reset}
                            variant="outline"
                            className="w-full rounded-2xl border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                            Kembali ke Awal
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <p className="text-zinc-600 text-xs mt-6">
                📍 Staycool Hairlab · Jl. Imam Bonjol No.370 Kediri
            </p>
        </div>
    );
}
