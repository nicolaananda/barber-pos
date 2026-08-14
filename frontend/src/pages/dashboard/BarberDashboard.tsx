import { useEffect, useState, type ComponentType } from 'react';
import { useAuth } from '@/context/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, DollarSign, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    timeSlot: string;
    serviceName: string;
    servicePrice: number;
    status: string;
    bookingDate: string;
}

interface Summary {
    totalBookings: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    estimatedRevenue: number;
}

interface TodayData {
    date: string;
    bookings: Booking[];
    summary: Summary;
}

export default function BarberDashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<TodayData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    useEffect(() => {
        fetchTodayBookings();

        // Auto refresh every 30 seconds
        const interval = setInterval(() => {
            fetchTodayBookings();
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    const fetchTodayBookings = async () => {
        if (!user || !token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/bookings/barber/${user.id}/today`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch bookings');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching today bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: number, status: string) => {
        setUpdatingStatus(bookingId);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error('Failed to update status');

            // Refresh data
            await fetchTodayBookings();
        } catch (error) {
            console.error('Error updating booking status:', error);
            toast.error('Gagal update status booking');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: ComponentType<{ className?: string }>; label: string }> = {
            confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
            pending: { variant: 'secondary', icon: AlertCircle, label: 'Pending' },
            completed: { variant: 'outline', icon: CheckCircle, label: 'Completed' },
            cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' }
        };

        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!data) {
        return <div className="p-8 text-center">No data available</div>;
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/pos')}
                                className="text-zinc-500 hover:text-zinc-900"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to POS
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Dashboard Barber</h1>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Logged in as</p>
                            <p className="font-semibold">{user?.name}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Booking</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalBookings}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.confirmed}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.pending}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimasi Pendapatan</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            Rp {data.summary.estimatedRevenue.toLocaleString('id-ID')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bookings List */}
            <Card>
                <CardHeader>
                    <CardTitle>Jadwal Hari Ini</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.bookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Tidak ada booking hari ini
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.bookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-semibold">{booking.customerName}</span>
                                            {getStatusBadge(booking.status)}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>{booking.timeSlot}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>✂️</span>
                                                <span>{booking.serviceName || 'Potong Rambut'}</span>
                                            </div>
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            📱 {booking.customerPhone}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-lg font-bold">
                                                Rp {(booking.servicePrice || 0).toLocaleString('id-ID')}
                                            </div>
                                        </div>

                                        {booking.status === 'confirmed' && (
                                            <Button
                                                size="sm"
                                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                                disabled={updatingStatus === booking.id}
                                            >
                                                {updatingStatus === booking.id ? 'Loading...' : 'Mark Done'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
