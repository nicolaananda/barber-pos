import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { Download, Calendar, User, Phone } from 'lucide-react';


interface Booking {
    id: number;
    barberId: number;
    barber: {
        id: number;
        name: string;
    };
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    serviceName: string | null;
    servicePrice: number | null;
    status: string;
    paymentProof: string | null;
    createdAt: string;
}

interface BookingHistoryData {
    bookings: Booking[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

interface BookingHistoryProps {
    startDate?: string;
    endDate?: string;
}

export default function BookingHistoryTable({ startDate, endDate }: BookingHistoryProps) {
    const [data, setData] = useState<BookingHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        barberId: '',
        status: '',
        customerPhone: '',
        limit: 50,
        offset: 0
    });

    useEffect(() => {
        setFilters(prev => ({ ...prev, startDate: startDate ?? '', endDate: endDate ?? '', offset: 0 }));
    }, [startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) params.append(key, value.toString());
                });
                const response = await apiFetch<{ data: BookingHistoryData }>(`/analytics/booking-history?${params}`);
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch booking history:', error);
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
    };

    const handlePageChange = (newOffset: number) => {
        setFilters(prev => ({ ...prev, offset: newOffset }));
    };

    const exportToCSV = () => {
        if (!data || data.bookings.length === 0) return;

        const headers = ['ID', 'Customer Name', 'Phone', 'Barber', 'Date', 'Time', 'Service', 'Price', 'Status', 'Created At'];
        const rows = data.bookings.map(booking => [
            booking.id,
            booking.customerName,
            booking.customerPhone,
            booking.barber.name,
            new Date(booking.bookingDate).toLocaleDateString('id-ID'),
            booking.timeSlot,
            booking.serviceName || '-',
            booking.servicePrice || 0,
            booking.status,
            new Date(booking.createdAt).toLocaleString('id-ID')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `booking-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-zinc-900 text-white';
            case 'completed':
                return 'bg-zinc-200 text-zinc-800';
            case 'cancelled':
                return 'bg-zinc-100 text-zinc-400 line-through';
            default:
                return 'bg-zinc-100 text-zinc-600 border border-zinc-300';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64 bg-white border border-zinc-200 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm text-zinc-500 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-500 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-500 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-500 mb-1">Customer Phone</label>
                        <input
                            type="text"
                            value={filters.customerPhone}
                            onChange={(e) => handleFilterChange('customerPhone', e.target.value)}
                            placeholder="Search by phone..."
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={exportToCSV}
                            disabled={!data || data.bookings.length === 0}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            {data && (
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <p>
                        Showing {data.pagination.offset + 1} - {Math.min(data.pagination.offset + data.bookings.length, data.pagination.total)} of {data.pagination.total} bookings
                    </p>
                </div>
            )}

            {/* Bookings Table */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">ID</th>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Customer</th>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Barber</th>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Date & Time</th>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Service</th>
                                <th className="text-right py-3 px-6 text-zinc-600 font-medium">Price</th>
                                <th className="text-center py-3 px-6 text-zinc-600 font-medium">Status</th>
                                <th className="text-left py-3 px-6 text-zinc-600 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {data && data.bookings.length > 0 ? (
                                data.bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="py-3 px-6 text-zinc-500">#{booking.id}</td>
                                        <td className="py-3 px-6">
                                            <div>
                                                <p className="text-zinc-900 font-medium flex items-center gap-2">
                                                    <User className="w-3 h-3 text-zinc-400" />
                                                    {booking.customerName}
                                                </p>
                                                <p className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                                                    <Phone className="w-3 h-3 text-zinc-400" />
                                                    {booking.customerPhone}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-zinc-800">{booking.barber.name}</td>
                                        <td className="py-3 px-6">
                                            <div>
                                                <p className="text-zinc-900 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-zinc-400" />
                                                    {new Date(booking.bookingDate).toLocaleDateString('id-ID', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-1">{booking.timeSlot}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-zinc-700">{booking.serviceName || '-'}</td>
                                        <td className="py-3 px-6 text-right text-zinc-900 font-medium">
                                            {booking.servicePrice ? formatCurrency(booking.servicePrice) : '-'}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)} border-transparent`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-xs text-zinc-400">
                                            {new Date(booking.createdAt).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                                        No bookings found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {data && data.pagination.total > filters.limit && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                        disabled={filters.offset === 0}
                        className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed text-zinc-700 rounded-lg transition-all shadow-sm"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-zinc-500">
                        Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(data.pagination.total / filters.limit)}
                    </span>
                    <button
                        onClick={() => handlePageChange(filters.offset + filters.limit)}
                        disabled={!data.pagination.hasMore}
                        className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed text-zinc-700 rounded-lg transition-all shadow-sm"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
