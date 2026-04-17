import { useEffect, useState } from 'react';
import { Calendar, User, Phone, Clock, Filter, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Booking {
    id: number;
    barberId: number;
    barber: { id: number; name: string };
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    status: string;
    createdAt: string;
    paymentProof: string | null;
}

export default function BookingsPage() {
    const { token } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('active');
    const [filterDate, setFilterDate] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Reschedule Modal State
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
    const [newDate, setNewDate] = useState<string>('');
    const [newTimeSlot, setNewTimeSlot] = useState<string>('');
    const [newBarberId, setNewBarberId] = useState<string>('');
    const [availableBarbers, setAvailableBarbers] = useState<{ id: number; name: string }[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submittingReschedule, setSubmittingReschedule] = useState(false);

    useEffect(() => {
        fetchBookings();
        fetchBarbers(); // Need barbers for the reschedule dropdown
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const startPolling = () => { if (!intervalId) intervalId = setInterval(fetchBookings, 10000); };
        const stopPolling = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
        const handleVisibility = () => {
            if (document.hidden) { stopPolling(); } else { fetchBookings(); startPolling(); }
        };
        startPolling();
        document.addEventListener('visibilitychange', handleVisibility);
        return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
    }, [filterStatus, filterDate]);

    // Fetch slots when date or barber changes
    useEffect(() => {
        if (newDate && newBarberId) {
            fetchAvailableSlots(newDate, parseInt(newBarberId));
        } else {
            setAvailableSlots([]);
        }
    }, [newDate, newBarberId]);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                setAvailableBarbers(data);
            }
        } catch (error) {
            console.error('Failed to fetch barbers:', error);
        }
    };

    const fetchAvailableSlots = async (date: string, barberId: number) => {
        setLoadingSlots(true);
        try {
            const res = await fetch(`${API_BASE_URL}/slots/available?date=${date}&barberId=${barberId}`);
            if (res.ok) {
                const data = await res.json();
                setAvailableSlots(data.availableSlots || []);
            }
        } catch (error) {
            console.error('Failed to fetch available slots:', error);
        } finally {
            setLoadingSlots(false);
        }
    };

    const openRescheduleModal = (booking: Booking) => {
        setSelectedBookingForReschedule(booking);
        setNewDate('');
        setNewTimeSlot('');
        setNewBarberId(booking.barberId.toString());
        setIsRescheduleModalOpen(true);
    };

    const handleReschedule = async () => {
        if (!selectedBookingForReschedule || !newDate || !newTimeSlot) return;

        setSubmittingReschedule(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/${selectedBookingForReschedule.id}/reschedule`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newBookingDate: newDate,
                    newTimeSlot: newTimeSlot,
                    newBarberId: parseInt(newBarberId)
                })
            });

            if (res.ok) {
                setIsRescheduleModalOpen(false);
                fetchBookings();
                // We could add a toast notification here
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to reschedule');
            }
        } catch (error) {
            console.error('Reschedule error:', error);
            toast.error('An error occurred while rescheduling');
        } finally {
            setSubmittingReschedule(false);
        }
    };

    const fetchBookings = async () => {
        try {
            let url = `${API_BASE_URL}/bookings?`;

            if (filterStatus !== 'all') {
                url += `status=${filterStatus}&`;
            }

            if (filterDate) {
                url += `date=${filterDate}&`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data: Booking[] = await res.json();

                // Sort: Pending first, then by Creation Date Descending (Newest First)
                const sorted = data.sort((a, b) => {
                    // Prioritize Pending
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;

                    // Then by CreatedAt Descending
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });

                setBookings(sorted);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: number, newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchBookings(); // Refresh list
            }
        } catch (error) {
            console.error('Failed to update booking:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-zinc-100 text-zinc-500 border-zinc-200',
            confirmed: 'bg-zinc-900 text-white border-zinc-900',
            cancelled: 'bg-white text-zinc-400 line-through border-zinc-100',
            completed: 'bg-white text-zinc-900 border-zinc-900'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[status as keyof typeof styles] || ''}`}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-zinc-500">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Bookings</h1>
                    <p className="text-zinc-500">Manage customer appointments</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-sm text-zinc-500 mb-2 block font-medium">Filter by Date</label>
                    <Input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-sm text-zinc-500 mb-2 block font-medium">Filter by Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="bg-white border-zinc-200 focus:ring-zinc-900">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant="outline"
                    onClick={() => {
                        setFilterDate('');
                        setFilterStatus('all');
                    }}
                    className="border-zinc-200 hover:bg-zinc-50 text-zinc-900"
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset
                </Button>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-zinc-100 shadow-sm">
                        <Calendar className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                        <p className="text-zinc-500">No bookings found</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-zinc-500" />
                                            <span className="font-bold text-zinc-900">
                                                {formatDate(booking.bookingDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-zinc-500" />
                                            <span className="text-zinc-900 font-mono">{booking.timeSlot}</span>
                                        </div>
                                        {getStatusBadge(booking.status)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Barber</p>
                                            <p className="font-bold text-zinc-900">{booking.barber.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Customer</p>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-zinc-400" />
                                                <p className="font-medium text-zinc-900">{booking.customerName}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Phone</p>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-zinc-400" />
                                                <p className="font-mono text-zinc-900">{booking.customerPhone}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info Row: Proof & Notes */}
                                    {booking.paymentProof && (
                                        <div className="mt-2 pt-2 border-t border-zinc-50 flex items-center gap-2">
                                            <p className="text-xs text-zinc-500">Bukti Transfer:</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedImage(booking.paymentProof)}
                                                className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded flex items-center gap-1 transition-colors h-auto"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Lihat Gambar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {booking.status === 'pending' && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        className="bg-zinc-900 text-white hover:bg-zinc-800 font-bold shadow-sm"
                                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    >
                                        Confirm
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium"
                                        onClick={() => openRescheduleModal(booking)}
                                    >
                                        Reschedule
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => {
                                            toast('Yakin ingin membatalkan booking ini?', {
                                                action: {
                                                    label: 'Ya, Batalkan',
                                                    onClick: () => updateBookingStatus(booking.id, 'cancelled'),
                                                },
                                                duration: 5000,
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                            {booking.status === 'confirmed' && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-900 text-zinc-900 hover:bg-zinc-50 font-medium"
                                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                                    >
                                        Mark Complete
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium"
                                        onClick={() => openRescheduleModal(booking)}
                                    >
                                        Reschedule
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Reschedule Modal */}
            <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reschedule Booking</DialogTitle>
                    </DialogHeader>
                    {selectedBookingForReschedule && (
                        <div className="grid gap-4 py-4">
                            <div className="text-sm border p-3 rounded-md bg-zinc-50">
                                <p className="font-semibold text-zinc-900">{selectedBookingForReschedule.customerName}</p>
                                <p className="text-zinc-500">
                                    Current: {formatDate(selectedBookingForReschedule.bookingDate)} at {selectedBookingForReschedule.timeSlot}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Date</label>
                                <Input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => {
                                        setNewDate(e.target.value);
                                        setNewTimeSlot(''); // Reset slot when date changes
                                    }}
                                    min={new Date().toISOString().split('T')[0]} // Cannot schedule for past dates
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Barber</label>
                                <Select value={newBarberId} onValueChange={setNewBarberId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select barber" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableBarbers.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Time Slot</label>
                                <Select value={newTimeSlot} onValueChange={setNewTimeSlot} disabled={!newDate || availableSlots.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !newDate ? "Select date first" :
                                                loadingSlots ? "Loading slots..." :
                                                    availableSlots.length === 0 ? "No slots available" :
                                                        "Select time slot"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSlots.map((slot) => (
                                            <SelectItem key={slot} value={slot}>
                                                {slot}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full mt-2"
                                onClick={handleReschedule}
                                disabled={!newDate || !newTimeSlot || submittingReschedule}
                            >
                                {submittingReschedule ? "Saving..." : "Save Reschedule"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Image Preview Modal */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-3xl bg-white border-zinc-200 p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-zinc-100">
                        <DialogTitle>Bukti Transfer</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="flex items-center justify-center bg-zinc-900/5 p-4">
                            <img
                                src={selectedImage}
                                alt="Payment Proof"
                                className="max-h-[80vh] w-auto object-contain rounded-md shadow-lg"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
