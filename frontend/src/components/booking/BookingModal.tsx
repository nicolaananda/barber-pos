import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barber: { id: number; name: string };
    timeSlot: { start: string; end: string; label: string };
    bookingDate: Date;
    onSuccess?: () => void;
}

export default function BookingModal({ open, onOpenChange, barber, timeSlot, bookingDate, onSuccess }: BookingModalProps) {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!customerName.trim()) {
            setError('Nama harus diisi');
            return;
        }

        if (!customerPhone.trim()) {
            setError('Nomor WhatsApp harus diisi');
            return;
        }

        if (!/^08\d{8,11}$/.test(customerPhone)) {
            setError('Nomor WhatsApp harus dimulai dengan 08 dan 10-13 digit');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barberId: barber.id,
                    customerName: customerName.trim(),
                    customerPhone: customerPhone.trim(),
                    bookingDate: bookingDate.toISOString(),
                    timeSlot: timeSlot.label
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal membuat booking');
            }

            // Success
            setCustomerName('');
            setCustomerPhone('');
            onOpenChange(false);

            // Show success notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Booking Berhasil!', {
                    body: `${customerName} telah booking ${timeSlot.label} dengan ${barber.name}`,
                    icon: '/logo.jpg'
                });
            }

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">Booking Appointment</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {barber.name} • {timeSlot.label}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-foreground">Nama Lengkap</Label>
                        <Input
                            id="name"
                            placeholder="Masukkan nama Anda"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            disabled={isSubmitting}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-foreground">Nomor WhatsApp</Label>
                        <Input
                            id="phone"
                            placeholder="08xxxxxxxxxx"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            disabled={isSubmitting}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Konfirmasi Booking'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
