import { useEffect, useState, useRef } from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Booking {
    id: number;
    barberId: number;
    barber: { id: number; name: string };
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    status: string;
    paymentProof: string | null;
}

interface PendingBookingAlertProps {
    className?: string;
}

export default function PendingBookingAlert({ className }: PendingBookingAlertProps) {
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const lastCountRef = useRef(0);

    // Sound effect (Synthesized for reliability)
    const playSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        } catch (error) {
            console.error("Audio play failed", error);
        }
    };

    const fetchPendingBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/bookings?status=pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();

                // Play sound ONLY if pending count INCREASES
                if (data.length > lastCountRef.current) {
                    playSound();
                }

                lastCountRef.current = data.length;
                setPendingBookings(data);
            }
        } catch (error) {
            console.error("Failed to fetch pending bookings", error);
        }
    };

    useEffect(() => {
        fetchPendingBookings();

        // Fast polling (5s) for "real-time" feel
        const interval = setInterval(fetchPendingBookings, 5000);

        // Also fetch on window focus
        const onFocus = () => fetchPendingBookings();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const handleAction = async (bookingId: number, status: 'confirmed' | 'cancelled') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Booking ${status === 'confirmed' ? 'Confirmed' : 'Cancelled'}`);
                setIsOpen(false);
                setSelectedBooking(null);
                fetchPendingBookings(); // Refresh
            } else {
                toast.error('Failed to update booking');
            }
        } catch (error) {
            console.error("Failed to update booking", error);
            toast.error('Error updating booking');
        }
    };

    if (pendingBookings.length === 0) return null;

    return (
        <>
            {/* Floating Alert Button (Toast-like) */}
            <div className={cn("fixed bottom-24 left-4 md:bottom-8 md:left-8 z-50", className)}>
                <Button
                    onClick={() => {
                        setSelectedBooking(pendingBookings[0]); // Open first pending
                        setIsOpen(true);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white shadow-lg rounded-full h-12 px-4 animate-bounce"
                >
                    <Bell className="w-5 h-5 mr-2" />
                    {pendingBookings.length} Pending Booking{pendingBookings.length > 1 ? 's' : ''}
                </Button>
            </div>

            {/* Modal for Details with Scrollable Content */}
            <Dialog open={isOpen} onOpenChange={(val) => {
                setIsOpen(val);
                if (!val) setSelectedBooking(null);
            }}>
                <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] flex flex-col bg-white text-zinc-900 border-zinc-200 p-0 overflow-hidden rounded-xl">
                    <DialogHeader className="p-4 md:p-6 border-b border-zinc-100 flex-shrink-0">
                        <DialogTitle>Pending Booking Request</DialogTitle>
                        <DialogDescription>
                            Please review the booking details and payment proof.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-zinc-500">Customer</p>
                                        <p className="font-bold">{selectedBooking.customerName}</p>
                                        <p className="font-mono text-xs">{selectedBooking.customerPhone}</p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500">Service Info</p>
                                        <p className="font-medium">{selectedBooking.timeSlot}</p>
                                        <p className="text-xs">{new Date(selectedBooking.bookingDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-zinc-500">Barber</p>
                                        <p className="font-medium">{selectedBooking.barber.name}</p>
                                    </div>
                                </div>

                                {selectedBooking.paymentProof ? (
                                    <div className="space-y-2">
                                        <p className="text-sm text-zinc-500">Payment Proof</p>
                                        <div className="relative group cursor-pointer border rounded-lg overflow-hidden bg-zinc-50 h-64 md:h-48 flex items-center justify-center">
                                            <img
                                                src={selectedBooking.paymentProof}
                                                alt="Proof"
                                                className="w-full h-full object-contain"
                                            />
                                            <a
                                                href={selectedBooking.paymentProof}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" /> Open Full Image
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 text-yellow-700 p-3 rounded text-sm text-center">
                                        No Payment Proof Uploaded
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedBooking && (
                        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex-shrink-0">
                            <div className="flex gap-3">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleAction(selectedBooking.id, 'cancelled')}
                                    className="flex-1"
                                >
                                    <X className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button
                                    onClick={() => handleAction(selectedBooking.id, 'confirmed')}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check className="w-4 h-4 mr-2" /> Confirm
                                </Button>
                            </div>
                            {/* Pagination/Queue Info if multiple */}
                            {pendingBookings.length > 1 && (
                                <p className="text-center text-xs text-zinc-400 mt-2">
                                    {pendingBookings.length - 1} more pending bookings waiting
                                </p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
