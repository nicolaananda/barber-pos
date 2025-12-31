import { useEffect, useState } from 'react';
import { Calendar, User, Phone, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('');

    useEffect(() => {
        fetchBookings();
        const interval = setInterval(fetchBookings, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [filterStatus, filterDate]);

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            let url = '/api/bookings?';

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
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/bookings/${bookingId}/status`, {
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
                                </div>

                                {/* Actions */}
                                {booking.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-zinc-900 text-white hover:bg-zinc-800 font-bold shadow-sm"
                                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                                {booking.status === 'confirmed' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-zinc-900 text-zinc-900 hover:bg-zinc-50 font-medium"
                                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                                    >
                                        Mark Complete
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
