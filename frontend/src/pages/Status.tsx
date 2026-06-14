import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { moneyToNumber } from '@/lib/money';
import { MapPin, Instagram, MessageCircle, Clock, Search, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import BookingModal from '@/components/booking/BookingModal';
import ServicesModal from '@/components/pos/ServicesModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { VersionFooter } from '@/components/VersionFooter';

interface Barber {
    id: number;
    name: string;
    username: string;
    availability: string;
    defaultOffDay?: number | null;
}

interface ServiceSummary {
    id: number;
    name: string;
    price: number;
}

interface BookingData {
    barber: { id: number; name: string; username: string };
    timeSlot: { start: string; end: string; label: string };
}

interface HistoryItem {
    type: 'booking' | 'transaction';
    date: string;
    barberName: string;
    customerName: string;
    service: string | null;
    amount: number | null;
    status: string;
    timeSlot: string | null;
    paymentMethod: string | null;
    invoiceCode: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending:     { label: 'Menunggu Konfirmasi', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    confirmed:   { label: 'Dikonfirmasi ✓',      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    completed:   { label: 'Selesai',              color: 'text-zinc-500 bg-zinc-50 border-zinc-200' },
    cancelled:   { label: 'Dibatalkan',           color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function StatusPage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [servicesModalOpen, setServicesModalOpen] = useState(false);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentOffDays, setCurrentOffDays] = useState<any[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [blackout, setBlackout] = useState<{ enabled: boolean; start: string | null; end: string | null }>({ enabled: false, start: null, end: null });

    // Success feedback state (#8)
    const [lastBookedInfo, setLastBookedInfo] = useState<{ barberName: string; slot: string } | null>(null);

    // Booking status check state (#5)
    const [statusPhone, setStatusPhone] = useState('');
    const [statusResults, setStatusResults] = useState<HistoryItem[] | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [statusSectionOpen, setStatusSectionOpen] = useState(false);
    const [startingPrice, setStartingPrice] = useState<number | null>(null);
    const [services, setServices] = useState<ServiceSummary[]>([]);
    const bookingSectionRef = useRef<HTMLDivElement | null>(null);
    const statusSectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        // Fetch blackout config once on mount
        fetch(`${API_BASE_URL}/bookings/config`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.blackout) setBlackout(data.blackout); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsAvailabilityLoading(true);
            await Promise.all([
                fetchBarbers(),
                fetchBookingsForDate(selectedDate),
                fetchOffDaysForDate(selectedDate),
                fetchServicesSummary(),
            ]);
            setIsLoading(false);
            setIsAvailabilityLoading(false);
        };
        fetchData();
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    // Auto-dismiss success banner after 6s (#8)
    useEffect(() => {
        if (!lastBookedInfo) return;
        const t = setTimeout(() => setLastBookedInfo(null), 6000);
        return () => clearTimeout(t);
    }, [lastBookedInfo]);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                const sorted = data.sort((a: Barber, b: Barber) => {
                    if (a.username === 'bagus') return -1;
                    if (b.username === 'bagus') return 1;
                    return a.name.localeCompare(b.name);
                });
                setBarbers(sorted);
            }
        } catch (err) {
            console.error('Error fetching barbers:', err);
        }
    };

    const fetchServicesSummary = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/services`);
            if (!res.ok) return;
            const data = await res.json();
            const normalizedServices = (data as ServiceSummary[]).map((service) => ({
                ...service,
                price: moneyToNumber(service.price),
            }));
            setServices(normalizedServices);
            const activeServices = normalizedServices
                .map((service) => service.price)
                .filter((price) => price > 0);
            setStartingPrice(activeServices.length ? Math.min(...activeServices) : null);
        } catch (err) {
            console.error('Error fetching services:', err);
        }
    };

    const fetchBookingsForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/bookings/date/${dateStr}`);
            if (res.ok) setExistingBookings(await res.json());
        } catch (err) {
            console.error('Error fetching bookings:', err);
        }
    };

    const fetchOffDaysForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/offdays?start=${dateStr}&end=${dateStr}`);
            if (res.ok) setCurrentOffDays(await res.json());
        } catch (err) {
            console.error('Error fetching off days:', err);
        }
    };

    const handleCheckStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusPhone.trim()) return;
        setStatusLoading(true);
        setStatusError('');
        setStatusResults(null);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/status?phone=${encodeURIComponent(statusPhone.trim())}`);
            if (!res.ok) throw new Error((await res.json()).error || 'Gagal mengecek status');
            const data = await res.json();
            setStatusResults(data);
            if (data.length === 0) setStatusError('Tidak ada booking ditemukan untuk nomor ini.');
        } catch (err: any) {
            setStatusError(err.message || 'Terjadi kesalahan. Coba lagi.');
        } finally {
            setStatusLoading(false);
        }
    };

    const generateTimeSlots = (forDate: Date) => {
        const slots = [];
        const now = new Date();
        const isToday = forDate.toDateString() === now.toDateString();
        const currentHour = now.getHours();
        const isFriday = forDate.getDay() === 5;
        const OPENING_HOUR = isFriday ? 13 : 11;
        const CLOSING_HOUR = 22;

        for (let startHour = OPENING_HOUR; startHour < CLOSING_HOUR; startHour++) {
            if (isToday && startHour <= currentHour) continue;
            const endHour = startHour + 1;
            slots.push({
                start: `${String(startHour).padStart(2, '0')}:00`,
                end: `${String(endHour).padStart(2, '0')}:00`,
                label: `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`,
            });
        }
        return slots;
    };

    const isBarberOffday = (username: string, date: Date) => {
        const manualOff = currentOffDays.find((od: any) => od.user.username === username);
        if (manualOff) return true;
        const barber = barbers.find(b => b.username === username);
        if (barber?.defaultOffDay !== null && barber?.defaultOffDay !== undefined) {
            if (date.getDay() === barber.defaultOffDay) return true;
        }
        return false;
    };

    const isBlackoutDate = (date: Date) => {
        if (!blackout.enabled || !blackout.start || !blackout.end) return false;
        const start = new Date(blackout.start + 'T00:00:00');
        const end = new Date(blackout.end + 'T23:59:59');
        return date >= start && date <= end;
    };

    const timeSlots = generateTimeSlots(selectedDate);
    const isBlackout = isBlackoutDate(selectedDate);
    const availableBarberCount = barbers.filter((barber) => !isBarberOffday(barber.username, selectedDate)).length;

    const bookingDaysAhead = parseInt(import.meta.env.VITE_BOOKING_DAYS_AHEAD || '3', 10);
    const dateOptions = Array.from({ length: bookingDaysAhead }, (_, i) => addDays(new Date(), i));
    const prioritizedStatusResults = statusResults
        ? [...statusResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : null;
    const blackoutMessage = blackout.start && blackout.end
        ? `Periode ${blackout.start} s/d ${blackout.end}: booking online ditutup, hanya walk-in langsung ke tempat.`
        : null;

    const getBarberStartingPrice = (username: string) => {
        const isHeadBarber = username === 'bagus';
        const filtered = services.filter((service) => {
            const lower = service.name.toLowerCase();
            const isHeadBarberService = lower.includes('head barber') || lower.includes('by head');
            const isBasicHaircut = lower.includes('haircut') || lower.includes('cukur');

            if (isHeadBarber) return !isBasicHaircut || isHeadBarberService;
            return !isHeadBarberService;
        });

        if (filtered.length === 0) return startingPrice;
        return Math.min(...filtered.map((service) => service.price).filter((price) => price > 0));
    };

    const getSlotDisabledReason = (isBooked: boolean, isOffday: boolean, isBlackoutActive: boolean) => {
        if (isBlackoutActive) return 'Booking online tutup';
        if (isOffday) return 'Barber libur';
        if (isBooked) return 'Sudah terisi';
        return null;
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pb-20">
            {/* Offline Warning */}
            {!isOnline && (
                <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-semibold sticky top-0 z-50">
                    ⚠️ Tidak ada koneksi internet. Beberapa fitur mungkin tidak tersedia.
                </div>
            )}

            {/* Blackout Banner (driven by backend config) */}
            {blackout.enabled && blackout.start && blackout.end && new Date() <= new Date(blackout.end + 'T23:59:59') && (
                <div className="bg-amber-400 text-amber-900 text-center py-3 px-4 text-sm font-bold sticky top-0 z-40 flex items-center justify-center gap-2 shadow-md">
                    <span>{blackoutMessage}</span>
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 pt-12 md:pt-20">

                {/* Success Banner (#8) */}
                {lastBookedInfo && (
                    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        <div>
                            <p className="font-bold text-emerald-800">Booking berhasil dibuat!</p>
                            <p className="text-sm text-emerald-700">
                                {lastBookedInfo.barberName} · {lastBookedInfo.slot}
                            </p>
                        </div>
                    </div>
                )}

                {/* Hero */}
                <div className="text-center mb-8 md:mb-12 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Waktunya Tampil Keren!
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 uppercase">
                        STAYCOOLHAIR <br className="hidden md:block" />
                        <span className="text-zinc-400">LAB.</span>
                    </h1>
                    <p className="text-zinc-500 max-w-lg mx-auto text-base leading-relaxed">
                        Pilih barber dan slot waktu yang tersedia di bawah.
                    </p>
                    

                    {/* Jam Operasional (#4) */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-200 shadow-sm text-xs text-zinc-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Sen–Kam & Sab–Min: <strong>11:00–22:00</strong></span>
                        <span className="text-zinc-300">|</span>
                        <span>Jumat: <strong>13:00–22:00</strong></span>
                    </div>

                </div>

                <div className="md:hidden sticky bottom-4 z-30 mb-6">
                    <div className="mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur px-4 py-3 shadow-xl flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Tanggal dipilih</p>
                            <p className="text-sm font-bold text-zinc-900">{format(selectedDate, 'EEEE, d MMM', { locale: idLocale })}</p>
                        </div>
                        <button
                            onClick={() => bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
                        >
                            Pilih Slot
                        </button>
                        <button
                            onClick={() => statusSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold"
                        >
                            Cek Booking
                        </button>
                    </div>
                </div>

                {/* Date Selector — 7 hari */}
                <div className="flex justify-center mb-10 relative">
                    {/* Scroll fade indicators for mobile */}
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#FAFAFA] to-transparent z-10 pointer-events-none md:hidden" />
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#FAFAFA] to-transparent z-10 pointer-events-none md:hidden" />
                    <div className="flex gap-2 overflow-x-auto pb-2 max-w-full px-4 scrollbar-none" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                        {dateOptions.map((date, i) => {
                            const isSelected = selectedDate.toDateString() === date.toDateString();
                            const isToday = i === 0;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={`
                                        flex flex-col items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 shrink-0 min-w-[72px]
                                        ${isSelected
                                            ? 'bg-zinc-900 text-white shadow-md scale-105'
                                            : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
                                        }
                                    `}
                                >
                                    <span className="text-[10px] uppercase tracking-wide opacity-70">
                                        {isToday ? 'Hari Ini' : format(date, 'EEE', { locale: idLocale })}
                                    </span>
                                    <span className="text-lg leading-tight">{format(date, 'd')}</span>
                                    <span className="text-[10px] opacity-60">{format(date, 'MMM')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Blackout Banner */}
                {isBlackout && (
                    <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 py-5 flex gap-4 items-start shadow-sm">
                        <span className="text-2xl mt-0.5">🚫</span>
                        <div>
                            <p className="font-black text-amber-800 text-base leading-snug">
                                Booking Online Tidak Tersedia ({blackout.start}–{blackout.end})
                            </p>
                            <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                                {blackoutMessage || 'Selama periode ini kami hanya melayani walk-in langsung ke barbershop.'}
                                Silakan datang ke <span className="font-bold">Jl. Imam Bonjol Pertigaan No.370 Kediri</span>.
                            </p>
                        </div>
                    </div>
                )}

                {(!isLoading && (isBlackout || availableBarberCount === 0)) && (
                    <div className="mb-8 rounded-2xl border border-zinc-200 bg-white px-6 py-5 shadow-sm">
                        <p className="font-black text-zinc-900 text-base mb-2">
                            {isBlackout ? 'Booking online sedang ditutup.' : 'Tidak ada barber yang tersedia di tanggal ini.'}
                        </p>
                        <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                            {isBlackout
                                ? 'Selama periode blackout kami hanya melayani walk-in langsung ke barbershop atau konfirmasi lewat WhatsApp.'
                                : 'Coba pindah ke tanggal lain, atau datang langsung ke tempat untuk cek ketersediaan terbaru.'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <a href="https://wa.me/6287770995270" className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-bold">WhatsApp Admin</a>
                            <a href="https://maps.app.goo.gl/AitnhHiAY3Ka9fAM9" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-bold">Lihat Lokasi</a>
                        </div>
                    </div>
                )}

                {/* Barbers Grid */}
                <div ref={bookingSectionRef} />
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                        <p className="text-zinc-400 font-medium">Loading availability...</p>
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400">No barbers available.</div>
                ) : (
                    <div className="grid gap-6">
                        {isAvailabilityLoading && (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 animate-pulse">
                                Menyegarkan ketersediaan barber dan slot...
                            </div>
                        )}
                        {barbers.map((barber) => {
                            const onOffday = isBarberOffday(barber.username, selectedDate);
                            const isToday = selectedDate.toDateString() === new Date().toDateString();
                            const actualAvailability = onOffday
                                ? 'offday'
                                : isToday
                                ? barber.availability
                                : 'available';

                            const isAvailable = actualAvailability === 'available';
                            const isOffday = actualAvailability === 'offday';

                            // Slot counter (#3)
                            const bookedSlots = existingBookings.filter(b =>
                                b.barberId === barber.id &&
                                timeSlots.some(slot => slot.label === b.timeSlot)
                            ).length;
                            const availableSlotCount = isOffday || isBlackout ? 0 : timeSlots.length - bookedSlots;

                            return (
                                <div
                                    key={barber.id}
                                    className={`
                                        group relative bg-white rounded-3xl p-6 md:p-8
                                        transition-all duration-200 ease-out
                                        ${isOffday
                                            ? 'opacity-60 grayscale border border-dashed border-zinc-200'
                                            : 'border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-0.5'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Barber Profile */}
                                        <div className="flex md:flex-col items-center gap-5 md:w-48 shrink-0">
                                            <div
                                                className="relative group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                                                onClick={() => {
                                                    if (barber.username === 'bagus') {
                                                        setSelectedImage('/bagus.webp');
                                                        setImageModalOpen(true);
                                                    } else if (barber.username === 'diva') {
                                                        setSelectedImage('/profil_diva.webp');
                                                        setImageModalOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg bg-zinc-100">
                                                    {barber.username === 'bagus' ? (
                                                        <img src="/bagus.webp" alt="Owner" className="w-full h-full object-cover" />
                                                    ) : barber.username === 'diva' ? (
                                                        <img src="/profil_diva.webp" alt="Diva" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-zinc-300">
                                                            {barber.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`
                                                    absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white
                                                    ${isAvailable ? 'bg-zinc-900 text-white' : isOffday ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-100 text-zinc-900'}
                                                `}>
                                                    {isAvailable ? 'OPEN' : isOffday ? 'OFF' : 'BUSY'}
                                                </div>
                                            </div>

                                             <div className="text-left md:text-center w-full">
                                                 <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{barber.name}</h3>
                                                 <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-1">
                                                     {barber.username === 'bagus' ? 'Head Barber' : 'Barber'}
                                                 </p>
                                                 
                                             </div>
                                        </div>

                                        {/* Slots */}
                                        <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-6 md:pt-0 md:pl-8">
                                            {/* Slot header with counter (#3) */}
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-sm font-semibold text-zinc-900">Available Slots</h4>
                                                    {!isOffday && !isBlackout && (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            availableSlotCount === 0
                                                                ? 'bg-red-100 text-red-600'
                                                                : availableSlotCount <= 3
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {availableSlotCount === 0 ? 'Penuh' : `${availableSlotCount} slot tersisa`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                    {isOffday ? (
                                                        <span className="bg-zinc-100 px-2 py-1 rounded">Not Taking Bookings</span>
                                                    ) : (
                                                        <>
                                                            <span className="w-2 h-2 rounded-full bg-zinc-900" /> Available
                                                            <span className="w-2 h-2 rounded-full bg-zinc-200 ml-2" /> Booked
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {timeSlots.map((slot, idx) => {
                                                    const isBooked = existingBookings.some(booking =>
                                                        booking.barberId === barber.id &&
                                                        booking.timeSlot === slot.label
                                                    );
                                                    const isLocked = isBooked || isOffday || isBlackout;
                                                    const disabledReason = getSlotDisabledReason(isBooked, isOffday, isBlackout);

                                                    return (
                                                        <button
                                                            key={idx}
                                                            disabled={isLocked}
                                                            title={disabledReason || undefined}
                                                            aria-label={`Book ${barber.name} at ${slot.label}${disabledReason ? ` (${disabledReason})` : ''}`}
                                                            onClick={() => {
                                                                if (!isLocked) {
                                                                    setSelectedBooking({
                                                                        barber: { id: barber.id, name: barber.name, username: barber.username },
                                                                        timeSlot: slot,
                                                                    });
                                                                    setBookingModalOpen(true);
                                                                }
                                                            }}
                                                            className={`
                                                                relative py-3 rounded-xl text-xs font-bold transition-all duration-200
                                                                ${isLocked
                                                                    ? 'bg-zinc-50 text-zinc-300 cursor-not-allowed'
                                                                    : 'bg-white border text-zinc-600 hover:bg-zinc-900 hover:text-white hover:shadow-lg hover:-translate-y-0.5 border-zinc-200'
                                                                }
                                                            `}
                                                        >
                                                            {slot.start}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Cek Status Booking (#5) */}
                <div ref={statusSectionRef} className="mt-16 border border-zinc-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                    <button
                        onClick={() => setStatusSectionOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-zinc-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-zinc-900">Cek Status Booking</p>
                                <p className="text-xs text-zinc-400">Masukkan nomor HP untuk melihat status booking kamu</p>
                            </div>
                        </div>
                        {statusSectionOpen ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                    </button>

                    {statusSectionOpen && (
                        <div className="px-6 pb-6 border-t border-zinc-100">
                            <form onSubmit={handleCheckStatus} className="flex gap-3 mt-5">
                                <input
                                    type="tel"
                                    placeholder="Contoh: 08123456789"
                                    value={statusPhone}
                                    onChange={e => setStatusPhone(e.target.value)}
                                    className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-zinc-50"
                                />
                                <button
                                    type="submit"
                                    disabled={statusLoading}
                                    className="px-5 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                    {statusLoading ? '...' : 'Cek'}
                                </button>
                            </form>

                            {statusError && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {statusError}
                                </div>
                            )}

                            {prioritizedStatusResults && prioritizedStatusResults.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">
                                        {prioritizedStatusResults.length} riwayat ditemukan (90 hari terakhir)
                                    </p>
                                    {prioritizedStatusResults.map((item, idx) => {
                                        const st = STATUS_LABEL[item.status] ?? { label: item.status, color: 'text-zinc-500 bg-zinc-50 border-zinc-200' };
                                        const isBooking = item.type === 'booking';
                                        const isNearest = idx === 0;
                                        return (
                                            <div key={idx} className={`border rounded-2xl p-4 ${isNearest ? 'border-zinc-900 bg-white shadow-sm' : 'border-zinc-100 bg-zinc-50'}`}>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-bold text-zinc-900">{item.customerName}</p>
                                                            {isNearest && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-zinc-900 text-white">Terdekat</span>}
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${isBooking ? 'bg-blue-100 text-blue-600' : 'bg-zinc-200 text-zinc-600'}`}>
                                                                {isBooking ? 'Booking' : 'Walk-in'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">
                                                            {format(new Date(item.date), 'EEEE, d MMM yyyy', { locale: idLocale })}
                                                            {item.timeSlot && ` · ${item.timeSlot}`}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${st.color}`}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                                    <span>✂️ {item.barberName}</span>
                                                    {item.service && <span>· {item.service}</span>}
                                                    {item.amount && <span>· IDR {item.amount.toLocaleString('id-ID')}</span>}
                                                    {item.paymentMethod && (
                                                        <span className="ml-auto font-medium text-zinc-400 uppercase tracking-wide">
                                                            {item.paymentMethod}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-16 border-t border-zinc-200 py-12 text-center">
                    <p className="text-zinc-400 text-sm mb-6">
                        &copy; {new Date().getFullYear()} Staycool Hairlab. All rights reserved.
                    </p>
                    <div className="flex justify-center gap-6 mb-6">
                        <a
                            href="https://maps.app.goo.gl/AitnhHiAY3Ka9fAM9"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all hover:scale-110"
                            aria-label="Location"
                        >
                            <MapPin className="w-5 h-5" />
                        </a>
                        <a
                            href="https://www.instagram.com/staycoolhair_lab/?hl=en"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all hover:scale-110"
                            aria-label="Instagram"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                        <a
                            href="https://wa.me/6287770995270"
                            className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all hover:scale-110"
                            aria-label="Support"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </a>
                    </div>
                    <VersionFooter compact />
                </footer>
            </main>

            {/* Modals */}
            {selectedBooking && (
                <BookingModal
                    open={bookingModalOpen}
                    onOpenChange={setBookingModalOpen}
                    barber={selectedBooking.barber}
                    timeSlot={selectedBooking.timeSlot}
                    bookingDate={selectedDate}
                    onSuccess={() => {
                        // #8 — tampilkan success banner
                        setLastBookedInfo({
                            barberName: selectedBooking.barber.name,
                            slot: selectedBooking.timeSlot.label,
                        });
                        fetchBarbers();
                        fetchBookingsForDate(selectedDate);
                    }}
                />
            )}

            <ServicesModal open={servicesModalOpen} onOpenChange={setServicesModalOpen} />

            <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center ring-0 focus:ring-0">
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Full Profile"
                            className="w-auto max-h-[85vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
