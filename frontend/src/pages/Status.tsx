import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Coffee, Scissors, Sparkles, BookOpen } from 'lucide-react';
import BookingModal from '@/components/booking/BookingModal';
import ServicesModal from '@/components/pos/ServicesModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Barber {
    id: number;
    name: string;
    username: string;
    availability: string;
}

interface BookingData {
    barber: { id: number; name: string; username: string };
    timeSlot: { start: string; end: string; label: string };
}

export default function StatusPage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [servicesModalOpen, setServicesModalOpen] = useState(false);

    // Image Modal State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentOffDays, setCurrentOffDays] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchBarbers(),
                fetchBookingsForDate(selectedDate),
                fetchOffDaysForDate(selectedDate)
            ]);
            setIsLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                // Sort: Owner (username 'bagus') first, then others alphabetically
                const sortedData = data.sort((a: Barber, b: Barber) => {
                    if (a.username === 'bagus') return -1;
                    if (b.username === 'bagus') return 1;
                    return a.name.localeCompare(b.name);
                });
                setBarbers(sortedData);
            }
        } catch (error) {
            console.error('Error fetching barbers:', error);
        }
    };

    const fetchBookingsForDate = async (date: Date) => {
        try {
            // Format date as YYYY-MM-DD using local time
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/bookings/date/${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                setExistingBookings(data);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const fetchOffDaysForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            // Fetch off days for this specific date
            const res = await fetch(`${API_BASE_URL}/offdays?start=${dateStr}&end=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentOffDays(data);
            }
        } catch (error) {
            console.error('Error fetching off days:', error);
        }
    };

    const generateTimeSlots = (forDate: Date) => {
        const slots = [];
        const now = new Date();
        const isToday = forDate.toDateString() === now.toDateString();
        const currentHour = now.getHours();

        const OPENING_HOUR = 11;
        const CLOSING_HOUR = 22;

        for (let startHour = OPENING_HOUR; startHour < CLOSING_HOUR; startHour++) {
            if (isToday && startHour <= currentHour) continue;

            const endHour = startHour + 1;
            slots.push({
                start: `${String(startHour).padStart(2, '0')}:00`,
                end: `${String(endHour).padStart(2, '0')}:00`,
                label: `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`
            });
        }

        return slots;
    };

    // Helper function to check if barber is on offday
    const isBarberOffday = (username: string, date: Date) => {
        // 1. Check Manual Off Days (Database)
        const manualOff = currentOffDays.find((od: any) => od.user.username === username);
        if (manualOff) return true;

        // 2. Check Regular Off Days (Hardcoded)
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        if (username === 'bagus' && dayOfWeek === 4) return true; // Thursday
        if (username === 'diva' && dayOfWeek === 2) return true; // Tuesday
        return false;
    };

    const timeSlots = generateTimeSlots(selectedDate);

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pb-20">
            {/* Navbar Removed */}

            <main className="max-w-4xl mx-auto px-4 pt-12 md:pt-20">
                {/* Hero Section */}
                <div className="text-center mb-12 md:mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Booking Board
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 uppercase">
                        STAYCOOLHAIR <br className="hidden md:block" />
                        <span className="text-zinc-400">LAB.</span>
                    </h1>
                    <p className="text-zinc-500 max-w-lg mx-auto text-lg leading-relaxed">
                        Select your preferred barber and time slot below.
                    </p>
                </div>

                {/* Date Selector - Floating Segmented Control */}
                <div className="flex justify-center mb-12 sticky top-20 z-40">
                    <div className="inline-flex bg-white/80 backdrop-blur-md border border-zinc-200/50 p-1.5 rounded-full shadow-lg shadow-zinc-200/50">
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className={`
                                relative px-8 py-3 rounded-full text-sm font-bold transition-all duration-300
                                flex flex-col items-center leading-none gap-1 min-w-[120px]
                                ${selectedDate.toDateString() === new Date().toDateString()
                                    ? 'bg-zinc-900 text-white shadow-md transform scale-105'
                                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
                                }
                            `}
                        >
                            <span className="uppercase tracking-wide text-[10px]">Today</span>
                            <span className="text-base">{format(new Date(), 'd MMM')}</span>
                        </button>
                        <button
                            onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setSelectedDate(tomorrow);
                            }}
                            className={`
                                relative px-8 py-3 rounded-full text-sm font-bold transition-all duration-300
                                flex flex-col items-center leading-none gap-1 min-w-[120px]
                                ${selectedDate.toDateString() !== new Date().toDateString()
                                    ? 'bg-zinc-900 text-white shadow-md transform scale-105'
                                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
                                }
                            `}
                        >
                            <span className="uppercase tracking-wide text-[10px]">Tomorrow</span>
                            <span className="text-base">
                                {format((() => {
                                    const t = new Date();
                                    t.setDate(t.getDate() + 1);
                                    return t;
                                })(), 'd MMM')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Barbers Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-400 font-medium">Loading availability...</p>
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400">
                        No barbers available.
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {barbers.map((barber) => {
                            const onOffday = isBarberOffday(barber.username, selectedDate);
                            const isToday = selectedDate.toDateString() === new Date().toDateString();
                            const actualAvailability = onOffday
                                ? 'offday'
                                : isToday
                                    ? barber.availability
                                    : 'available';

                            const isAvailable = actualAvailability === 'available';
                            const isWorking = actualAvailability === 'working';
                            const isOffday = actualAvailability === 'offday';

                            return (
                                <div
                                    key={barber.id}
                                    className={`
                                        group relative bg-white rounded-3xl p-6 md:p-8
                                        transition-all duration-300
                                        ${isOffday
                                            ? 'opacity-60 grayscale border border-dashed border-zinc-200'
                                            : 'border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1'
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
                                                {/* Status Badge Over Avatar */}
                                                <div className={`
                                                    absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white
                                                    ${isAvailable ? 'bg-zinc-900 text-white' : isOffday ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-100 text-zinc-900'}
                                                `}>
                                                    {isAvailable ? 'OPEN' : isOffday ? 'OFF' : 'BUSY'}
                                                </div>
                                            </div>

                                            <div className="text-left md:text-center w-full">
                                                <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{barber.name}</h3>
                                                <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-1">Master Barber</p>
                                            </div>
                                        </div>

                                        {/* Slots Grid */}
                                        <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-6 md:pt-0 md:pl-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-sm font-semibold text-zinc-900">Available Slots</h4>
                                                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                    {isOffday ? (
                                                        <span className="bg-zinc-100 px-2 py-1 rounded">Not Taking Bookings</span>
                                                    ) : (
                                                        <>
                                                            <span className="w-2 h-2 rounded-full bg-zinc-900"></span> Available
                                                            <span className="w-2 h-2 rounded-full bg-zinc-200 ml-2"></span> Booked
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

                                                    // Determine visual state
                                                    const isLocked = isBooked || isOffday;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            disabled={isLocked}
                                                            onClick={() => {
                                                                if (!isLocked) {
                                                                    setSelectedBooking({
                                                                        barber: { id: barber.id, name: barber.name, username: barber.username },
                                                                        timeSlot: slot
                                                                    });
                                                                    setBookingModalOpen(true);
                                                                }
                                                            }}
                                                            className={`
                                                                group relative py-3 rounded-xl text-xs font-bold transition-all duration-200
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

                {/* Footer */}
                <footer className="mt-24 border-t border-zinc-200 py-12 text-center">
                    <p className="text-zinc-400 text-sm mb-4">
                        &copy; {new Date().getFullYear()} Staycool Hairlab. All rights reserved.
                    </p>
                    <div className="flex justify-center gap-6 text-zinc-900 font-medium text-sm">
                        <a href="https://maps.app.goo.gl/AitnhHiAY3Ka9fAM9" target="_blank" className="hover:underline">Location</a>
                        <a href="#" className="hover:underline">Instagram</a>
                        <a href="#" className="hover:underline">Support</a>
                    </div>
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
