'use client';

import { useState, useEffect } from 'react';

import { usePosStore } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface Barber {
    id: number;
    name: string;
    username: string; // Added username
}

export default function BarberSelector() {
    const { selectedBarber, setBarber } = usePosStore();
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch users');
                return res.json();
            })
            .then((data) => {
                setBarbers(data);
                setLoading(false);

                // Validation: Check if selectedBarber from store (persisted) is valid
                const currentFromStore = usePosStore.getState().selectedBarber;
                if (currentFromStore) {
                    // Check if ID exists in new data
                    // eslint-disable-next-line eqeqeq
                    const isValid = data.find((b: Barber) => b.id == (currentFromStore.id as unknown as number));

                    if (!isValid) {
                        // ID invalid (stale), check if we can recover by name
                        const matchByName = data.find((b: Barber) => b.name === currentFromStore.name);
                        if (matchByName) {
                            console.log('Auto-healing stale barber ID', currentFromStore.id, 'to', matchByName.id);
                            setBarber({ id: matchByName.id.toString(), name: matchByName.name });
                        } else {
                            console.warn('Selected barber no longer exists, clearing selection');
                            setBarber(null);
                        }
                    }
                }
            })
            .catch((err) => console.error(err));
    }, [setBarber]);

    if (loading) return <div>Loading Barbers...</div>;

    const getBarberImage = (username: string) => {
        if (username === 'bagus') return '/bagus.webp';
        if (username === 'diva') return '/profil_diva.webp';
        return null; // Fallback to icon
    };

    return (
        <div className="mb-6 md:mb-8">
            <h2 className="text-xl font-bold mb-4 tracking-tight uppercase text-zinc-900 flex items-center gap-2">
                <span className="bg-zinc-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Select Barber
            </h2>
            <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-4 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {barbers.map((barber) => {
                    const imageUrl = getBarberImage(barber.username);
                    const isSelected = selectedBarber?.id == (barber.id as unknown as string); // eslint-disable-line eqeqeq

                    return (
                        <Card
                            key={barber.id}
                            className={cn(
                                'cursor-pointer transition-all duration-200 border min-w-[140px] md:min-w-0 snap-center shadow-sm',
                                'hover:border-zinc-900 flex-shrink-0',
                                isSelected
                                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-md scale-[1.02]'
                                    : 'bg-white border-zinc-200 text-zinc-900 hover:shadow-md'
                            )}
                            onClick={() => setBarber({ id: barber.id.toString(), name: barber.name })}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4 md:p-5 gap-3">
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors relative",
                                    isSelected
                                        ? "border-white bg-zinc-800"
                                        : "border-zinc-100 bg-zinc-50"
                                )}>
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={barber.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className={cn(
                                            "h-8 w-8",
                                            isSelected ? "text-white" : "text-zinc-400"
                                        )} />
                                    )}
                                </div>
                                <span className="font-bold text-center tracking-wide text-sm md:text-base line-clamp-1">{barber.name}</span>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
