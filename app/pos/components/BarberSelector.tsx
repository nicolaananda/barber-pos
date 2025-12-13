'use client';

import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface Barber {
    id: number;
    name: string;
}

export default function BarberSelector() {
    const { selectedBarber, setBarber } = usePosStore();
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/users')
            .then((res) => res.json())
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

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Select Barber
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {barbers.map((barber) => (
                    <Card
                        key={barber.id}
                        className={cn(
                            'cursor-pointer transition-all duration-300 border-2',
                            'hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10',
                            // eslint-disable-next-line eqeqeq
                            selectedBarber?.id == (barber.id as unknown as string)
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-primary/20'
                                : 'bg-card border-border hover:border-primary/50'
                        )}
                        onClick={() => setBarber({ id: barber.id.toString(), name: barber.name })}
                    >
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                            <div className={cn(
                                "p-3 rounded-full transition-colors",
                                // eslint-disable-next-line eqeqeq
                                selectedBarber?.id == (barber.id as unknown as string) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                <User className="h-8 w-8" />
                            </div>
                            <span className={cn(
                                "font-bold text-center tracking-wide",
                                // eslint-disable-next-line eqeqeq
                                selectedBarber?.id == (barber.id as unknown as string) ? "text-primary" : "text-foreground"
                            )}>{barber.name}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
