'use client';

import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors } from 'lucide-react';

interface Service {
    id: number;
    name: string;
    price: number;
}

export default function ServiceGrid() {
    const { addToCart, selectedBarber } = usePosStore();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false); // Default false to avoid flash if fast? No, let's keep logic

    useEffect(() => {
        setLoading(true);
        fetch('/api/services')
            .then((res) => res.json())
            .then((data) => {
                setServices(data);
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div>Loading Services...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Select Service
                </h2>
                <input
                    type="text"
                    placeholder="Search services..."
                    className="p-2 border border-border rounded-md text-sm w-full max-w-xs bg-card/50 text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredServices.map((service) => (
                    <Card key={service.id} className="cursor-pointer group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-card/60 backdrop-blur-sm border-border selection:none">
                        <CardContent className="p-0">
                            <Button
                                variant="ghost"
                                className="w-full h-full p-6 flex flex-col items-center justify-center gap-4 h-auto hover:bg-primary/5 rounded-xl"
                                disabled={!selectedBarber}
                                onClick={() =>
                                    addToCart({
                                        id: service.id.toString(),
                                        name: service.name,
                                        price: service.price,
                                        qty: 1,
                                    })
                                }
                            >
                                <div className="p-4 bg-background rounded-full border border-border group-hover:border-primary/30 group-hover:text-primary transition-colors text-muted-foreground shadow-inner">
                                    <Scissors className="h-7 w-7" />
                                </div>
                                <div className="text-center space-y-1">
                                    <div className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{service.name}</div>
                                    <div className="font-mono text-primary/90 font-bold bg-primary/5 px-2 py-0.5 rounded text-sm border border-primary/10">
                                        IDR {service.price.toLocaleString('id-ID')}
                                    </div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {!selectedBarber && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                    <p className="text-destructive font-bold animate-pulse">
                        ⚠️ Please select a barber first to unlock services.
                    </p>
                </div>
            )}
        </div>
    );
}
