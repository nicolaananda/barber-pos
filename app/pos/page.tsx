'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import BarberSelector from './components/BarberSelector';
import ServiceGrid from './components/ServiceGrid';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function PosPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { activeShift, setActiveShift, selectedBarber } = usePosStore();
    const [loading, setLoading] = useState(true);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const cart = usePosStore((state) => state.cart);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        const checkShift = async () => {
            try {
                const res = await fetch('/api/shifts?status=open');
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
        if (session?.user?.role === 'staff' && !selectedBarber) {
            usePosStore.getState().setBarber({
                id: session.user.id,
                name: session.user.name || 'Staff'
            });
        }
    }, [session, selectedBarber]);

    if (status === 'loading' || loading) return <div className="p-8 text-center">Loading...</div>;

    // Blocking removed. 




    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Main Interactive Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="flex-none p-4 md:px-8 md:py-5 bg-card/80 backdrop-blur-md border-b border-border flex justify-between items-center shadow-sm z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-primary" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase text-foreground">Staycool <span className="text-primary">POS</span></h1>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-wider">
                                <span className="uppercase font-medium text-primary/80">Operator</span>
                                <span className="truncate max-w-[100px] md:max-w-none text-foreground">{session?.user?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                    {session?.user?.role === 'owner' ? (
                        <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => router.push('/dashboard')}>
                            Exit Station
                        </Button>
                    ) : (
                        <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => window.location.href = '/api/auth/signout'}>
                            Logout
                        </Button>
                    )}
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32 md:pb-8">
                    {session?.user?.role !== 'staff' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <BarberSelector />
                        </div>
                    )}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        <ServiceGrid />
                    </div>
                </div>

                {/* Mobile Fixed Bottom Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.5)] z-30">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-sm font-medium text-muted-foreground">
                            {cartCount} Items
                        </div>
                        <div className="text-xl font-bold text-primary">
                            IDR {cartTotal.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 border-primary/50 text-primary hover:bg-primary/10" onClick={() => setIsCartOpen(true)}>
                            View Cart
                        </Button>
                        <Button
                            className="flex-1 font-bold shadow-lg bg-primary text-primary-foreground hover:bg-amber-600"
                            onClick={() => setIsCheckoutOpen(true)}
                            disabled={cart.length === 0}
                        >
                            Pay Now
                        </Button>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <div className="hidden md:flex w-[420px] flex-none bg-card border-l border-border shadow-2xl flex-col h-full z-20">
                <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
                    <h2 className="font-bold text-xl tracking-wide text-foreground uppercase flex items-center gap-2">
                        <span>Current Order</span>
                    </h2>
                    {selectedBarber ? (
                        <div className="text-sm font-medium mt-2 text-primary flex items-center gap-2">
                            <span className="text-muted-foreground">Barber:</span>
                            <span className="bg-primary/10 px-2 py-0.5 rounded text-primary border border-primary/20">
                                {selectedBarber.name}
                            </span>
                        </div>
                    ) : (
                        <div className="text-sm text-destructive mt-2 italic flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Please select a barber
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
                    <Cart />
                </div>

                <div className="p-6 border-t border-border bg-card space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Items Count</span>
                        <span>{cartCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-3xl font-bold text-primary tracking-tight">
                        <span>Total</span>
                        <span>IDR {cartTotal.toLocaleString('id-ID')}</span>
                    </div>
                    <Button
                        className="w-full h-16 text-xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-amber-600 transition-all active:scale-[0.98]"
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={cart.length === 0}
                    >
                        Checkout
                    </Button>
                </div>
            </div>

            {/* Mobile Bottom Sheet for Cart */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>Current Order</SheetTitle>
                        <SheetDescription>
                            {selectedBarber ? `Barber: ${selectedBarber.name}` : 'No barber selected'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                        <Cart />
                    </div>
                    <div className="p-4 border-t bg-slate-50 space-y-3">
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total</span>
                            <span>IDR {cartTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <Button className="w-full h-12 text-lg font-bold" onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} disabled={cart.length === 0}>
                            Proceed to Checkout
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <CheckoutModal open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen} />
        </div>
    );
}
