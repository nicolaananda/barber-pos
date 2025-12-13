'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePosStore } from '@/lib/store';
import { isThursday } from 'date-fns';
import { CalendarDays } from 'lucide-react';

export default function ShiftsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { setActiveShift } = usePosStore();
    const [activeShiftData, setActiveShiftData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');
    const [loading, setLoading] = useState(true);
    const isTodayThursday = isThursday(new Date());

    const fetchShift = async () => {
        try {
            const res = await fetch('/api/shifts?status=open');
            const shifts = await res.json();
            if (shifts && shifts.length > 0) {
                setActiveShiftData(shifts[0]);
                setActiveShift({ id: shifts[0].id, status: 'open' });
            } else {
                setActiveShiftData(null);
                setActiveShift(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShift();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenShift = async () => {
        if (!openingCash || !session?.user) return;
        try {
            const res = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    openingCash: Number(openingCash),
                    openedBy: (session.user as any).id, // eslint-disable-line @typescript-eslint/no-explicit-any
                }),
            });

            if (res.ok) {
                fetchShift();
                setOpeningCash('');
            } else {
                alert('Failed to open shift');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCloseShift = async () => {
        if (!closingCash || !session?.user || !activeShiftData) return;
        try {
            // Get System revenue first (Optional accuracy check) or logic is in backend?
            // Backend expects: closingCash, closedBy, totalSystemRevenue, totalExpenses.
            // We need to fetch current revenue first.

            // Ideally we call an endpoint to get current Shift Summary before closing.
            // But for simplicity, we pass closingCash, and let backend calculate discrepancy 
            // based on what it knows. Wait, backend logic in 'PATCH' needs 'totalSystemRevenue' passed in body?
            // My implementation of PATCH:
            // const { closingCash, closedBy, totalSystemRevenue, totalExpenses } = body;
            // It uses these to save and calc discrepancy.
            // So Frontend must fetch these first!

            // I should update backend to calculate this if not provided?
            // OR I change PATCH to only take closingCash, and backend calculates the rest.
            // Let's assume for now I will fetch the shift details again which has totalRevenue (if I updated it).
            // My transaction POST updates 'totalSystemRevenue' in the shift document.
            // So I can just read 'totalSystemRevenue' from 'activeShiftData' if it was refreshed.

            // But 'activeShiftData' might be stale.
            // Let's fetch fresh data first.

            const resFresh = await fetch(`/api/shifts/${activeShiftData.id}`);
            const freshShift = await resFresh.json();

            const res = await fetch(`/api/shifts/${activeShiftData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    closingCash: Number(closingCash),
                    closedBy: (session.user as any).id, // eslint-disable-line @typescript-eslint/no-explicit-any
                    totalSystemRevenue: freshShift.totalSystemRevenue,
                    totalExpenses: freshShift.totalExpenses,
                }),
            });

            if (res.ok) {
                setActiveShiftData(null);
                setActiveShift(null);
                setClosingCash('');
                alert('Shift Closed Successfully');
            } else {
                alert('Failed to close shift');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
            </div>

            {isTodayThursday && (
                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                    <CalendarDays className="h-4 w-4" />
                    <AlertTitle>Store Closed</AlertTitle>
                    <AlertDescription>Today is Thursday. The shop is officially closed.</AlertDescription>
                </Alert>
            )}

            {activeShiftData ? (
                <Card className="border-green-500 border-2">
                    <CardHeader>
                        <CardTitle>Currently Active Shift</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Opened By</Label>
                                <div className="font-medium">{activeShiftData.openedBy?.name}</div>
                            </div>
                            <div>
                                <Label>Opening Cash</Label>
                                <div className="font-medium">IDR {activeShiftData.openingCash.toLocaleString('id-ID')}</div>
                            </div>
                            <div>
                                <Label>Current Revenue</Label>
                                <div className="font-medium text-green-600">IDR {activeShiftData.totalSystemRevenue.toLocaleString('id-ID')}</div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-2">Close Shift</h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="closingCash">Closing Cash (Physical Count)</Label>
                                    <Input
                                        id="closingCash"
                                        type="number"
                                        value={closingCash}
                                        onChange={(e) => setClosingCash(e.target.value)}
                                        placeholder="Enter total cash in drawer"
                                    />
                                </div>
                                <Button variant="destructive" onClick={handleCloseShift}>
                                    Close Shift
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button variant="outline" className="w-full" onClick={() => router.push('/pos')}>Go to POS</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Open New Shift</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertTitle>Store is currently Closed</AlertTitle>
                            <AlertDescription>Open a shift to start transactions.</AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="openingCash">Opening Cash (Modal Awal)</Label>
                            <Input
                                id="openingCash"
                                type="number"
                                value={openingCash}
                                onChange={(e) => setOpeningCash(e.target.value)}
                                placeholder="e.g. 200000"
                            />
                        </div>

                        <Button onClick={handleOpenShift} className="w-full" disabled={!openingCash}>
                            Start Shift
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
