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
            pending: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
            confirmed: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
            cancelled: 'bg-red-500/20 text-red-500 border-red-500/30',
            completed: 'bg-blue-500/20 text-blue-500 border-blue-500/30'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${styles[status as keyof typeof styles] || ''}`}>
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
                <div className="text-muted-foreground">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
                    <p className="text-muted-foreground">Manage customer appointments</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-2 block">Filter by Date</label>
                    <Input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-background border-border"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-2 block">Filter by Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="bg-background border-border">
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
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset
                </Button>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-lg border border-border">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No bookings found</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-semibold text-foreground">
                                                {formatDate(booking.bookingDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-foreground">{booking.timeSlot}</span>
                                        </div>
                                        {getStatusBadge(booking.status)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Barber</p>
                                            <p className="font-medium text-foreground">{booking.barber.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Customer</p>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <p className="font-medium text-foreground">{booking.customerName}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Phone</p>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                <p className="font-medium text-foreground">{booking.customerPhone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {booking.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500 text-red-500 hover:bg-red-500/10"
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
                                        className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
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
