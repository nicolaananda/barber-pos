import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, UploadCloud, Scissors, Check } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';

// Dummy QRIS - In production, this should be real
const QRIS_IMAGE = "/qris.jpg";

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barber: { id: number; name: string; username?: string };
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
                let availableServices = data.filter((s: any) => s.isActive);

                // Filter by barber specific rules
                if (barber.username) {
                    const isOwner = barber.username === 'bagus';
                    availableServices = availableServices.filter((service: any) => {
                        const serviceName = service.name.toLowerCase();
                        if (isOwner) {
                            // Owner Logic: Hide regular haircuts, show Head Barber only
                            if ((serviceName.includes('haircut') || serviceName.includes('cukur')) && !serviceName.includes('head')) return false;
                            return true;
                        } else {
                            // Staff Logic: Hide Head Barber services
                            if (serviceName.includes('head') || serviceName.includes('owner')) return false;
                            return true;
                        }
                    });
                }

                // Sort services: Haircut/Cukur first, then others
                availableServices.sort((a: any, b: any) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aIsHaircut = aName.includes('haircut') || aName.includes('cukur');
                    const bIsHaircut = bName.includes('haircut') || bName.includes('cukur');

                    if (aIsHaircut && !bIsHaircut) return -1;
                    if (!aIsHaircut && bIsHaircut) return 1;
                    return 0;
                });

                setServices(availableServices);
                // Set default if exists
                if (availableServices.length > 0) {
                    setSelectedServiceId(availableServices[0].id.toString());
                    setSelectedService(availableServices[0]);
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


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError("Hanya file gambar yang diperbolehkan");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError("File terlalu besar (Maks 5MB)");
                return;
            }

            try {
                // Show compression toast
                toast.loading('Mengompres gambar...', { id: 'compress' });

                // ⚡ AUTO-COMPRESS before upload
                const options = {
                    maxSizeMB: 0.2,          // Target 200KB
                    maxWidthOrHeight: 1920,  // Max dimension
                    useWebWorker: true,
                    fileType: 'image/jpeg',  // Convert all to JPEG
                };

                const compressedFile = await imageCompression(file, options);

                // Calculate compression ratio
                const ratio = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

                toast.success(`Gambar dikompres ${ratio}% ✨`, {
                    id: 'compress',
                    description: `${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024).toFixed(0)}KB`
                });

                setPaymentProof(compressedFile);
                setPreviewUrl(URL.createObjectURL(compressedFile));
                setError('');
            } catch (error) {
                toast.error('Gagal mengompres gambar', { id: 'compress' });
                console.error('Compression error:', error);
                setError('Gagal memproses gambar');
            }
        }
    };

    const handleNextStep = () => {
        setError('');
        if (!customerName.trim()) return setError('Nama harus diisi');
        if (customerName.trim().length < 2) return setError('Nama minimal 2 karakter');
        if (!customerPhone.trim()) return setError('Nomor WhatsApp harus diisi');

        // Strict Indonesian phone validation
        const phonePattern = /^08\d{8,11}$/;
        if (!phonePattern.test(customerPhone.trim())) {
            return setError('Nomor WhatsApp tidak valid. Format: 08xxxxxxxxxx');
        }

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

            // Success - Clear form
            setCustomerName('');
            setCustomerPhone('');
            setPaymentProof(null);
            setPreviewUrl(null);
            setStep(1);
            onOpenChange(false);

            // Show premium toast notification
            toast.success('Booking Berhasil Dibuat! ✨', {
                description: (
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Nama:</span>
                            <span className="font-bold text-zinc-900">{customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Barber:</span>
                            <span className="font-bold text-zinc-900">{barber.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Waktu:</span>
                            <span className="font-bold text-zinc-900">{timeSlot.label} WIB</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                            <p className="text-xs text-zinc-500">
                                💬 Konfirmasi akan dikirim via WhatsApp dalam beberapa saat.
                            </p>
                        </div>
                    </div>
                ),
                duration: 6000,
                classNames: {
                    toast: 'bg-white border-zinc-200',
                    title: 'text-zinc-900 font-bold',
                    description: 'text-zinc-600',
                },
            });

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
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
            <DialogContent className="sm:max-w-md bg-white p-0 max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl gap-0">
                {/* Header Section */}
                <div className="bg-zinc-50 border-b border-zinc-100 p-6 flex flex-col items-center justify-center text-center">
                    <DialogTitle className="text-xl font-black text-zinc-900 uppercase tracking-wide">
                        {step === 1 ? 'Booking Details' : 'Payment Verification'}
                    </DialogTitle>
                    <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-sm">
                        <span className="text-xs font-bold text-zinc-900">{barber.name}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs font-medium text-zinc-500">{timeSlot.label}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                            {/* Inputs Group */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pl-1">Nama Lengkap</Label>
                                    <Input
                                        id="name"
                                        placeholder="Masukkan nama Anda"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="h-12 rounded-2xl bg-zinc-50 border-transparent focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-sm font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pl-1">Nomor WhatsApp</Label>
                                    <Input
                                        id="phone"
                                        placeholder="08xxxxxxxxxx"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="h-12 rounded-2xl bg-zinc-50 border-transparent focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Service Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="service" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pl-1">Pilih Layanan</Label>
                                {isLoadingServices ? (
                                    <div className="h-24 flex items-center justify-center bg-zinc-50 rounded-2xl">
                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                                        {services.map((service) => {
                                            const getServiceImage = (name: string) => {
                                                const n = name.toLowerCase();
                                                if (n.includes('head barber')) return '/service_haircuthead.jpeg';
                                                if (n.includes('haircut') || n.includes('cukur')) return '/service_haircut.webp';
                                                if (n.includes('beard trim')) return '/service_trim_beard.jpeg';
                                                if (n.includes('beard shave')) return '/service_trim_beard.jpeg';
                                                if (n.includes('fashion colour') || n.includes('fashion color') || n.includes('coloring')) return '/service_fashioncoloring.webp';
                                                if (n.includes('toning') || n.includes('semir')) return '/service_semir.jpeg';
                                                if (n.includes('perm')) return '/service_perm.webp';
                                                if (n.includes('home service')) return '/service_home.webp';
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
                                                        "relative h-24 rounded-2xl overflow-hidden transition-all duration-300 group text-left",
                                                        isSelected
                                                            ? "ring-2 ring-zinc-900 shadow-xl scale-[1.02]"
                                                            : "ring-1 ring-zinc-100 opacity-80 hover:opacity-100 hover:scale-[1.01]"
                                                    )}
                                                >
                                                    {bgImage ? (
                                                        <>
                                                            <div
                                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                                style={{ backgroundImage: `url('${bgImage}')` }}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                        </>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-100" />
                                                    )}

                                                    {/* Checkmark Badge */}
                                                    <div className={cn(
                                                        "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                                                        isSelected ? "bg-white text-zinc-900 scale-100" : "bg-black/20 text-white/0 scale-0"
                                                    )}>
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>

                                                    <div className="absolute bottom-0 left-0 w-full p-3 text-white">
                                                        <p className={cn(
                                                            "text-[10px] font-bold uppercase tracking-wider mb-0.5 leading-tight",
                                                            !bgImage && "text-zinc-900"
                                                        )}>
                                                            {service.name}
                                                        </p>
                                                        <p className={cn(
                                                            "text-xs font-medium opacity-90",
                                                            !bgImage && "text-zinc-500"
                                                        )}>
                                                            {formatRp(service.price)}
                                                        </p>
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
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="bg-zinc-50 p-6 rounded-3xl flex flex-col items-center border border-zinc-100 text-center">
                                <div className="w-12 h-12 rounded-full bg-white border border-zinc-100 flex items-center justify-center mb-4 shadow-sm">
                                    <UploadCloud className="w-6 h-6 text-zinc-900" />
                                </div>
                                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide mb-1">Payment Verification</h3>
                                <p className="text-xs text-zinc-500 mb-6 max-w-[200px]">
                                    Scan QRIS dibawah dan upload bukti pembayaran.
                                </p>

                                <div className="relative group cursor-pointer">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-200 to-zinc-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                                    <div className="relative bg-white p-2 rounded-xl border border-zinc-100">
                                        <img
                                            src={QRIS_IMAGE}
                                            alt="QRIS Code"
                                            className="w-40 h-40 object-cover rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 inline-flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Payment</span>
                                    <span className="text-xl font-black text-zinc-900">{selectedService ? formatRp(selectedService.price) : '-'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pl-1">Bukti Transfer</Label>
                                <Label
                                    htmlFor="proof"
                                    className={cn(
                                        "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative group",
                                        previewUrl
                                            ? "border-zinc-900 bg-white"
                                            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300"
                                    )}
                                >
                                    {previewUrl ? (
                                        <div className="relative w-full h-full p-2">
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Ganti File</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-zinc-400 group-hover:text-zinc-600">
                                            <UploadCloud className="w-8 h-8 mb-2" />
                                            <p className="text-xs font-medium">Tap to upload</p>
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
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                            <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 mt-8">
                        {step === 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 rounded-full hover:bg-zinc-100 text-zinc-500 font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="flex-[2] rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-bold"
                                >
                                    Lanjut Bayar
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-full hover:bg-zinc-100 text-zinc-500 font-bold"
                                >
                                    Kembali
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-bold shadow-lg shadow-zinc-900/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Wait...
                                        </>
                                    ) : (
                                        'Konfirmasi'
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
