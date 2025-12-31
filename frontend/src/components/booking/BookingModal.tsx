import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dummy QRIS - In production, this should be real
const QRIS_IMAGE = "/qris.jpg";

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barber: { id: number; name: string };
    timeSlot: { start: string; end: string; label: string };
    bookingDate: Date;
    onSuccess?: () => void;
}

export default function BookingModal({ open, onOpenChange, barber, timeSlot, bookingDate, onSuccess }: BookingModalProps) {
    const [step, setStep] = useState(1); // 1: Details, 2: Payment
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                setError("File terlalu besar (Maks 5MB)");
                return;
            }
            setPaymentProof(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleNextStep = () => {
        setError('');
        if (!customerName.trim()) return setError('Nama harus diisi');
        if (!customerPhone.trim()) return setError('Nomor WhatsApp harus diisi');
        if (!/^08\d{8,11}$/.test(customerPhone)) return setError('Nomor WhatsApp tidak valid (08xxx)');

        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!paymentProof) return setError("Wajib upload bukti transfer!");

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('barberId', barber.id.toString());
            formData.append('customerName', customerName.trim());
            formData.append('customerPhone', customerPhone.trim());
            formData.append('bookingDate', bookingDate.toISOString());
            formData.append('timeSlot', timeSlot.label);
            formData.append('proof', paymentProof);

            const res = await fetch('/api/bookings', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal membuat booking');
            }

            // Success
            setCustomerName('');
            setCustomerPhone('');
            setPaymentProof(null);
            setPreviewUrl(null);
            setStep(1);
            onOpenChange(false);

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
            <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-zinc-900">
                        {step === 1 ? 'Booking Details' : 'Payment Verification'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        {barber.name} • {timeSlot.label}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-700">Nama Lengkap</Label>
                                <Input
                                    id="name"
                                    placeholder="Masukkan nama Anda"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="bg-white border-zinc-200 focus:ring-zinc-900"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-zinc-700">Nomor WhatsApp</Label>
                                <Input
                                    id="phone"
                                    placeholder="08xxxxxxxxxx"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="bg-white border-zinc-200 focus:ring-zinc-900"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="bg-zinc-50 p-4 rounded-lg flex flex-col items-center border border-zinc-200">
                                <p className="text-sm font-semibold text-zinc-900 mb-2">Scan QRIS untuk Pembayaran</p>
                                <img
                                    src={QRIS_IMAGE}
                                    alt="QRIS Code"
                                    className="w-48 h-48 object-cover rounded-lg border border-zinc-200 shadow-sm"
                                />
                                <p className="text-xs text-zinc-500 mt-2 text-center">
                                    Silakan transfer DP minimal Rp 20.000 (atau lunas).<br />Upload bukti transfer di bawah ini.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-700">Bukti Transfer</Label>
                                <div className="grid w-full items-center gap-1.5">
                                    <Label
                                        htmlFor="proof"
                                        className={cn(
                                            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors",
                                            previewUrl ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white"
                                        )}
                                    >
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="h-full object-contain p-2" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <UploadCloud className="w-8 h-8 text-zinc-400 mb-2" />
                                                <p className="text-sm text-zinc-500">Klik untuk upload bukti</p>
                                            </div>
                                        )}
                                        <Input
                                            id="proof"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        {step === 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 border-zinc-200 hover:bg-zinc-50 text-zinc-900"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    Lanjut Bayar <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                    className="flex-1 border-zinc-200 hover:bg-zinc-50 text-zinc-900"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Konfirmasi Booking'
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
