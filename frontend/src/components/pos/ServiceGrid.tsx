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
        const token = localStorage.getItem('token');
        fetch('/api/services', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch services');
                return res.json();
            })
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
                <h2 className="text-xl font-bold tracking-tight uppercase text-zinc-900 flex items-center gap-2">
                    <span className="bg-zinc-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Select Service
                </h2>
                <input
                    type="text"
                    placeholder="Search..."
                    className="p-2 border border-zinc-200 rounded-md text-sm w-full max-w-xs bg-white text-zinc-900 placeholder-zinc-400 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {filteredServices.map((service) => (
                    <Card key={service.id} className="cursor-pointer group hover:border-zinc-900 hover:shadow-md transition-all duration-200 bg-white border border-zinc-200 selection:none active:scale-[0.98]">
                        <CardContent className="p-0">
                            <Button
                                variant="ghost"
                                className="w-full h-auto p-4 flex flex-row items-center justify-between gap-3 text-left hover:bg-zinc-50 rounded-xl whitespace-normal"
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
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-200 text-zinc-500 group-hover:text-zinc-900 transition-colors flex-shrink-0">
                                        <Scissors className="h-5 w-5" />
                                    </div>
                                    <div className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2 leading-tight">
                                        {service.name}
                                    </div>
                                </div>
                                <div className="font-mono font-bold text-zinc-900 text-sm whitespace-nowrap">
                                    {service.price.toLocaleString('id-ID')}
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {!selectedBarber && (
                <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-4 text-center">
                    <p className="text-zinc-500 font-medium">
                        Please select a barber first to unlock services.
                    </p>
                </div>
            )}
        </div>
    );
}
