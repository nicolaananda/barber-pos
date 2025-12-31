import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scissors, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Service {
    id: number;
    name: string;
    price: number;
}

interface ServicesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ServicesModal({ open, onOpenChange }: ServicesModalProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetch('/api/services')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch');
                    return res.json();
                })
                .then(data => {
                    setServices(data);
                    setIsLoading(false);
                })
                .catch(err => console.error(err));
        }
    }, [open]);

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
            <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl overflow-hidden p-0 gap-0">
                <div className="bg-zinc-900 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-zinc-800/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-zinc-800/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Scissors className="w-6 h-6 text-white" />
                            </div>
                            Service Menu
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Professional cuts & treatments
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="h-[60vh] md:h-auto md:max-h-[60vh] p-6 bg-white overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center text-zinc-500 py-10">Loading services...</div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service, idx) => (
                                <div
                                    key={service.id}
                                    className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all cursor-default"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                            {idx % 2 === 0 ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        </div>
                                        <span className="font-semibold text-zinc-700 group-hover:text-zinc-900">{service.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-900 border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors px-3 py-1 text-sm">
                                        {formatRp(service.price)}
                                    </Badge>
                                </div>
                            ))}

                            {services.length === 0 && (
                                <div className="text-center text-zinc-400 py-10">No services available</div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Staycool Member?</p>
                        <p className="text-sm font-semibold text-zinc-900">Get 10% OFF on your 5th visit!</p>
                    </div>
                </div>

                <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                        Close Menu
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
