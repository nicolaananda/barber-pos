import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, UploadCloud, Scissors, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';

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

interface Service {
    id: number;
    name: string;
    price: number;
}

export default function BookingModal({ open, onOpenChange, barber, timeSlot, bookingDate, onSuccess }: BookingModalProps) {
    const [step, setStep] = useState(1); // 1: Details, 2: Payment
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Service State
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            fetchServices();
        }
    }, [open]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const res = await fetch(`${API_BASE_URL}/services`);
            if (res.ok) {
                const data = await res.json();
                setServices(data.filter((s: any) => s.isActive));
                // Set default if exists
                if (data.length > 0) {
                    setSelectedServiceId(data[0].id.toString());
                    setSelectedService(data[0]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch services", error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const handleServiceChange = (value: string) => {
        setSelectedServiceId(value);
        const service = services.find(s => s.id.toString() === value);
        setSelectedService(service || null);
    };

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
        if (!selectedServiceId) return setError('Pilih layanan');

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
            formData.append('serviceId', selectedServiceId);
            formData.append('proof', paymentProof);

            const res = await fetch(`${API_BASE_URL}/bookings`, {
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

    // Format currency
    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
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

                            <div className="space-y-2">
                                <Label htmlFor="service" className="text-zinc-700">Pilih Layanan</Label>
                                {isLoadingServices ? (
                                    <div className="text-sm text-zinc-500">Loading services...</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                                        {services.map((service) => {
                                            const getServiceImage = (name: string) => {
                                                const n = name.toLowerCase();
                                                if (n.includes('coloring')) return '/service_fashioncoloring.webp';
                                                if (n.includes('cukur')) return '/service_haircut.webp';
                                                return null;
                                            };
                                            const bgImage = getServiceImage(service.name);
                                            const isSelected = selectedServiceId === service.id.toString();

                                            return (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => handleServiceChange(service.id.toString())}
                                                    className={cn(
                                                        "relative flex flex-col items-start justify-end p-3 h-24 rounded-xl border text-left transition-all overflow-hidden group",
                                                        isSelected
                                                            ? "ring-2 ring-zinc-900 border-zinc-900"
                                                            : "border-zinc-200 hover:border-zinc-300",
                                                        bgImage ? "border-0" : "bg-white"
                                                    )}
                                                >
                                                    {bgImage ? (
                                                        <>
                                                            <div
                                                                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                                style={{ backgroundImage: `url('${bgImage}')` }}
                                                            />
                                                            <div className={cn(
                                                                "absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity",
                                                                isSelected ? "opacity-90" : "opacity-70 group-hover:opacity-80"
                                                            )} />
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 z-10 bg-white text-zinc-900 rounded-full p-0.5">
                                                                    <Check className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className={cn(
                                                                "absolute top-2 right-2 p-1.5 rounded-lg transition-colors",
                                                                isSelected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400 group-hover:text-zinc-600"
                                                            )}>
                                                                {isSelected ? <Check className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className={cn("relative z-10 w-full", bgImage ? "text-white" : "text-zinc-900")}>
                                                        <div className={cn("font-bold text-xs line-clamp-2 leading-tight mb-0.5", bgImage && "drop-shadow-sm")}>
                                                            {service.name}
                                                        </div>
                                                        <div className={cn("text-xs font-mono", bgImage ? "text-white/90" : "text-zinc-500", bgImage && "font-bold")}>
                                                            {formatRp(service.price)}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
                                    Total yang harus dibayar:<br />
                                    <span className="text-lg font-bold text-zinc-900">{selectedService ? formatRp(selectedService.price) : '-'}</span>
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
