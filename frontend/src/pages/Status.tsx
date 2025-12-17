import { useEffect, useState } from 'react';
import { Coffee, Scissors } from 'lucide-react';
import BookingModal from '@/components/booking/BookingModal';

interface Barber {
    id: number;
    name: string;
    availability: string;
}

interface BookingData {
    barber: { id: number; name: string };
    timeSlot: { start: string; end: string; label: string };
}

export default function StatusPage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([fetchBarbers(), fetchTodayBookings()]);
            setIsLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s instead of 5s
        return () => clearInterval(interval);
    }, []);

    const fetchBarbers = async () => {
        try {
            const res = await fetch('/api/users/barbers');
            if (res.ok) {
                const data = await res.json();
                setBarbers(data);
            }
        } catch (error) {
            console.error('Error fetching barbers:', error);
        }
    };

    const fetchTodayBookings = async () => {
        try {
            const res = await fetch('/api/bookings/today');
            if (res.ok) {
                const data = await res.json();
                setExistingBookings(data);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const generateTimeSlots = () => {
        const slots = [];
        const now = new Date();
        const currentHour = now.getHours();

        const OPENING_HOUR = 11; // 11:00
        const CLOSING_HOUR = 22; // 22:00 (last slot ends at 22:00)

        for (let startHour = OPENING_HOUR; startHour < CLOSING_HOUR; startHour++) {
            // Only show future slots for today
            if (startHour <= currentHour) continue;

            const endHour = startHour + 1;
            slots.push({
                start: `${String(startHour).padStart(2, '0')}:00`,
                end: `${String(endHour).padStart(2, '0')}:00`,
                label: `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`
            });
        }

        return slots;
    };

    const timeSlots = generateTimeSlots();

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 relative overflow-hidden">
            {/* Decorative Background Elements - Black & White */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header with Logo */}
                <div className="flex flex-col items-center mb-8 md:mb-12">
                    <div className="mb-4 md:mb-6 relative">
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                        <img
                            src="/logo.jpg"
                            alt="Staycool Logo"
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-2xl border-4 border-white relative z-10"
                        />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-wider text-center text-white uppercase mb-2">
                        Staycool Barbershop
                    </h1>
                    <div className="flex items-center gap-2 md:gap-3 text-white/40 text-xs md:text-sm uppercase tracking-widest">
                        <div className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent to-white/30"></div>
                        <Scissors className="w-3 h-3 md:w-4 md:h-4" />
                        <span>Live Status Board</span>
                        <Scissors className="w-3 h-3 md:w-4 md:h-4" />
                        <div className="w-8 md:w-12 h-px bg-gradient-to-l from-transparent to-white/30"></div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-white/60 text-lg">Loading barbers...</div>
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-white/60 text-lg">No barbers available</div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {barbers.map((barber) => {
                            const isAvailable = barber.availability === 'idle';

                            return (
                                <div
                                    key={barber.id}
                                    className={`
                                    relative overflow-hidden rounded-2xl p-4 md:p-6
                                    border-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl
                                    ${isAvailable
                                            ? 'bg-white/5 border-white shadow-white/10'
                                            : 'bg-amber-500/10 border-amber-500 shadow-amber-500/20'
                                        }
                                `}
                                >
                                    {/* Shine Effect */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                                    <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-4 md:gap-6">
                                        {/* Barber Info */}
                                        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                                            <div className={`
                                            w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold
                                            shadow-2xl relative flex-shrink-0
                                            ${isAvailable ? 'bg-white text-black shadow-white/50' : 'bg-amber-500 text-black shadow-amber-500/50'}
                                        `}>
                                                {/* Glow effect */}
                                                <div className={`absolute inset-0 rounded-full blur-xl ${isAvailable ? 'bg-white/30' : 'bg-amber-500/30'}`}></div>
                                                <span className="relative z-10">{barber.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">{barber.name}</h2>
                                                <div className={`
                                                inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider
                                                ${isAvailable
                                                        ? 'bg-white/10 text-white border border-white/20'
                                                        : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                    }
                                            `}>
                                                    {isAvailable ? (
                                                        <>
                                                            <Coffee className="w-3 h-3 md:w-4 md:h-4" />
                                                            Available
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Scissors className="w-3 h-3 md:w-4 md:h-4" />
                                                            Working
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Time Slots - Show for ALL barbers */}
                                        <div className="flex-1 w-full md:max-w-md">
                                            <p className="text-xs text-amber-400 font-semibold mb-3 uppercase tracking-wider">
                                                {isAvailable ? 'Book Ahead' : 'Available Slots'}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {timeSlots.map((slot, idx) => {
                                                    // Check if this slot is already booked
                                                    const isBooked = existingBookings.some(booking =>
                                                        booking.barberId === barber.id &&
                                                        booking.timeSlot === slot.label
                                                    );

                                                    return (
                                                        <button
                                                            key={idx}
                                                            disabled={isBooked}
                                                            className={`
                                                            px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                                                            ${isBooked
                                                                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed opacity-50'
                                                                    : 'bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500 text-white hover:scale-105'
                                                                }
                                                        `}
                                                            onClick={() => {
                                                                if (!isBooked) {
                                                                    setSelectedBooking({
                                                                        barber: { id: barber.id, name: barber.name },
                                                                        timeSlot: slot
                                                                    });
                                                                    setBookingModalOpen(true);
                                                                }
                                                            }}
                                                        >
                                                            {isBooked ? '🔒 ' : ''}{slot.label}
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
            </div>

            {/* Booking Modal */}
            {selectedBooking && (
                <BookingModal
                    open={bookingModalOpen}
                    onOpenChange={setBookingModalOpen}
                    barber={selectedBooking.barber}
                    timeSlot={selectedBooking.timeSlot}
                    bookingDate={new Date()}
                    onSuccess={() => {
                        // Refresh barbers list and bookings
                        fetchBarbers();
                        fetchTodayBookings();
                    }}
                />
            )}
        </div>
    );
}
