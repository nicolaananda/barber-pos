import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

import BarberSelector from '@/components/pos/BarberSelector';
import ServiceGrid from '@/components/pos/ServiceGrid';
import Cart from '@/components/pos/Cart';
import CheckoutModal from '@/components/pos/CheckoutModal';
import PendingBookingAlert from '@/components/pos/PendingBookingAlert';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function PosPage() {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeShift, setActiveShift, selectedBarber, setCustomerInfo, setBarber, addToCart, setBookingId, clearCart } = usePosStore();
    const [loading, setLoading] = useState(true);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const cart = usePosStore((state: any) => state.cart);
    const cartTotal = cart.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
    const cartCount = cart.reduce((sum: number, item: any) => sum + item.qty, 0);

    useEffect(() => {
        // Auth check handled by ProtectedRoute mostly, but role check valid here
    }, []);

    useEffect(() => {
        const state = location.state as any;
        if (state?.booking) {
            const b = state.booking;
            clearCart();
            setCustomerInfo(b.customerName, b.customerPhone || '');
            setBookingId(b.id);
            if (b.barberId) {
                setBarber({ id: String(b.barberId), name: b.barberName, username: b.barberUsername || '' });
            }
            if (b.serviceId && b.serviceName) {
                addToCart({ id: String(b.serviceId), name: b.serviceName, price: b.servicePrice || 0, qty: 1 });
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, clearCart, setCustomerInfo, setBookingId, setBarber, addToCart, navigate]);

    useEffect(() => {
        const checkShift = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/shifts?status=open`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch shifts');
                const shifts = await res.json();
                if (shifts && shifts.length > 0) {
                    setActiveShift({ id: shifts[0].id, status: 'open' });
                } else {
                    setActiveShift(null);
                }
            } catch (error) {
                console.error('Failed to check shift', error);
            } finally {
                setLoading(false);
            }
        };
        checkShift();
    }, [setActiveShift]);

    useEffect(() => {
        if (user?.role === 'staff' && !selectedBarber) {
            usePosStore.getState().setBarber({
                id: user.id,
                name: user.name || 'Staff',
                username: user.username,
            });
        }
    }, [user, selectedBarber]);

    const handleToggleAvailability = async () => {
        if (!user || isTogglingStatus) return;

        setIsTogglingStatus(true);
        const newStatus = user.availability === 'working' ? 'available' : 'working';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/${user.id}/availability`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                throw new Error('Failed to update status');
            }

            // Refresh user data from database
            await refreshUser();
            setIsTogglingStatus(false);
        } catch (error) {
            console.error("Failed to update status", error);
            alert('Failed to update status. Please try again.');
            setIsTogglingStatus(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
            {/* Main Interactive Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="flex-none p-4 md:px-6 md:py-4 bg-white border-b border-zinc-200 flex justify-between items-center shadow-sm z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.jpg"
                            alt="Logo"
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200 grayscale"
                        />
                        <div>
                            <h1 className="text-lg font-bold tracking-widest uppercase text-zinc-900 leading-none">
                                Staycool <span className="font-light">POS</span>
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 tracking-wider hidden md:flex">
                                <span className="uppercase font-medium">
                                    Operator
                                </span>
                                <span className="truncate max-w-[100px] md:max-w-none text-zinc-900 font-bold">
                                    {user?.name || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 font-bold transition-all border-zinc-200",
                                user?.availability === 'working'
                                    ? "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900"
                                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                            )}
                            onClick={handleToggleAvailability}
                            disabled={isTogglingStatus}
                        >
                            {isTogglingStatus ? '...' : (user?.availability === 'working' ? 'WORKING' : 'AVAILABLE')}
                        </Button>
                        {user?.role === 'owner' ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 h-9 hidden md:inline-flex"
                                onClick={() => navigate('/dashboard')}
                            >
                                Dashboard
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 h-9 px-2 md:px-4"
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                            >
                                <span className="hidden md:inline">Logout</span>
                                <span className="md:hidden">Exit</span>
                            </Button>
                        )}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-32 md:pb-8 scroll-smooth">
                    {user?.role !== 'staff' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <BarberSelector />
                        </div>
                    )}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        <ServiceGrid />
                    </div>
                </div>

                {/* Mobile Fixed Bottom Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-sm font-medium text-zinc-500">
                            {cartCount} Items
                        </div>
                        <div className="text-xl font-bold text-zinc-900">
                            IDR {cartTotal.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                            onClick={() => setIsCartOpen(true)}
                        >
                            View Cart
                        </Button>
                        <Button
                            className="flex-1 font-bold shadow-lg bg-zinc-900 text-white hover:bg-zinc-800"
                            onClick={() => setIsCheckoutOpen(true)}
                            disabled={cart.length === 0}
                        >
                            Pay Now
                        </Button>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar (Responsive for Tablet) */}
            <div className="hidden md:flex w-[340px] lg:w-[33%] flex-none bg-white border-l border-zinc-200 shadow-xl shadow-zinc-200/50 flex-col h-full z-20">
                <div className="p-6 border-b border-zinc-100 bg-white">
                    <h2 className="font-bold text-lg tracking-wide text-zinc-900 uppercase flex items-center gap-2">
                        Currently Serving
                    </h2>
                    {selectedBarber ? (
                        <div className="text-sm font-medium mt-1 text-zinc-600 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                            {selectedBarber.name}
                        </div>
                    ) : (
                        <div className="text-sm text-red-500 mt-1 italic flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Select a barber
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-zinc-50/50 custom-scrollbar">
                    <Cart />
                </div>

                <div className="p-6 border-t border-zinc-100 bg-white space-y-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center text-sm text-zinc-500">
                        <span>Items</span>
                        <span className="font-mono">{cartCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-3xl font-bold text-zinc-900 tracking-tight">
                        <span>Total</span>
                        <span>{cartTotal.toLocaleString('id-ID')}</span>
                    </div>
                    <Button
                        className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-[0.98]"
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={cart.length === 0}
                    >
                        Checkout
                    </Button>
                </div>
            </div>

            {/* Mobile Bottom Sheet for Cart */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 bg-white">
                    <SheetHeader className="p-4 border-b border-zinc-100">
                        <SheetTitle className="text-zinc-900">Current Order</SheetTitle>
                        <SheetDescription>
                            {selectedBarber
                                ? `Barber: ${selectedBarber.name}`
                                : 'No barber selected'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto bg-zinc-50">
                        <Cart />
                    </div>
                    <div className="p-4 border-t border-zinc-100 bg-white space-y-3">
                        <div className="flex justify-between items-center text-xl font-bold text-zinc-900">
                            <span>Total</span>
                            <span>IDR {cartTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <Button
                            className="w-full h-12 text-lg font-bold bg-zinc-900 text-white hover:bg-zinc-800"
                            onClick={() => {
                                setIsCartOpen(false);
                                setIsCheckoutOpen(true);
                            }}
                            disabled={cart.length === 0}
                        >
                            Proceed to Checkout
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <CheckoutModal
                open={isCheckoutOpen}
                onOpenChange={setIsCheckoutOpen}
            />
            <PendingBookingAlert />
        </div>
    );
}
