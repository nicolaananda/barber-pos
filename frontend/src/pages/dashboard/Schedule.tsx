import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Barber {
    id: number;
    name: string;
    username: string;
    defaultOffDay?: number | null;
}

interface OffDay {
    id: number;
    userId: number;
    date: string;
    reason: string;
    user: {
        name: string;
    };
}

export default function SchedulePage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [offDays, setOffDays] = useState<OffDay[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedBarber, setSelectedBarber] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
    const [reason, setReason] = useState('');

    // Recurring Off-Day State
    const [recurringBarber, setRecurringBarber] = useState<string>('');
    const [recurringDay, setRecurringDay] = useState<string>('');

    const DAYS = [
        { value: '0', label: 'Sunday' },
        { value: '1', label: 'Monday' },
        { value: '2', label: 'Tuesday' },
        { value: '3', label: 'Wednesday' },
        { value: '4', label: 'Thursday' },
        { value: '5', label: 'Friday' },
        { value: '6', label: 'Saturday' },
    ];

    useEffect(() => {
        fetchBarbers();
        fetchOffDays();
    }, []);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                setBarbers(data);
            }
        } catch (error) {
            console.error('Error fetching barbers:', error);
        }
    };

    const fetchOffDays = async () => {
        try {
            const today = new Date();
            const future = new Date();
            future.setMonth(future.getMonth() + 3);

            // Format as YYYY-MM-DD manually to avoid timezone shifts
            const startStr = format(today, 'yyyy-MM-dd');
            const endStr = format(future, 'yyyy-MM-dd');

            console.log('Fetching offdays:', startStr, endStr);

            const res = await fetch(`${API_BASE_URL}/offdays?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                console.log('Offdays data:', data);
                setOffDays(data);
            }
        } catch (error) {
            console.error('Error fetching off days:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOffDay = async () => {
        if (!selectedBarber || !selectedDate) {
            alert('Please select a barber and a date');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/offdays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedBarber,
                    date: selectedDate, // selectedDate is already "YYYY-MM-DD" from input
                    reason: reason || 'Manual Off Day'
                })
            });

            if (res.ok) {
                alert('Off day added successfully');
                fetchOffDays();
                setReason('');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to add off day');
            }
        } catch (error) {
            console.error('Error adding off day:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/offdays/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchOffDays();
            }
        } catch (error) {
            console.error('Error deleting off day:', error);
        }
    };

    const handleSetRecurringOffDay = async () => {
        if (!recurringBarber || !recurringDay) {
            alert('Please select a barber and a day');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/${recurringBarber}/default-offday`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    defaultOffDay: parseInt(recurringDay)
                })
            });

            if (res.ok) {
                alert('Recurring off-day set successfully');
                fetchBarbers();
                setRecurringDay('');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to set recurring off-day');
            }
        } catch (error) {
            console.error('Error setting recurring off-day:', error);
        }
    };

    const handleClearRecurringOffDay = async (barberId: number) => {
        if (!confirm('Clear recurring off-day for this barber?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/${barberId}/default-offday`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    defaultOffDay: null
                })
            });

            if (res.ok) {
                fetchBarbers();
            }
        } catch (error) {
            console.error('Error clearing recurring off-day:', error);
        }
    };

    const getDayName = (dayNum: number | null | undefined) => {
        if (dayNum === null || dayNum === undefined) return 'None';
        const day = DAYS.find(d => d.value === dayNum.toString());
        return day ? day.label : 'Unknown';
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Schedule Management</h1>
                <p className="text-muted-foreground">Manage off days for staff.</p>
            </div>

            {/* Recurring Weekly Off-Days Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Recurring Weekly Off-Days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Set Recurring Off-Day Form */}
                    <div className="space-y-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Barber</label>
                            <Select value={recurringBarber} onValueChange={setRecurringBarber}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {barbers.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Day</label>
                            <Select value={recurringDay} onValueChange={setRecurringDay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day of week..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.map((day) => (
                                        <SelectItem key={day.value} value={day.value}>
                                            {day.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleSetRecurringOffDay} className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                            Set Recurring Off-Day
                        </Button>
                    </div>

                    {/* Current Recurring Off-Days */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-zinc-900">Current Settings</h4>
                        {barbers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No barbers found.</p>
                        ) : (
                            <div className="space-y-2">
                                {barbers.map((barber) => (
                                    <div key={barber.id} className="flex justify-between items-center p-3 border rounded-lg bg-zinc-50">
                                        <div>
                                            <p className="font-bold text-zinc-900">{barber.name}</p>
                                            <p className="text-sm text-zinc-500">
                                                Weekly off-day: <span className="font-medium">{getDayName(barber.defaultOffDay)}</span>
                                            </p>
                                        </div>
                                        {barber.defaultOffDay !== null && barber.defaultOffDay !== undefined && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleClearRecurringOffDay(barber.id)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Add Off Day Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Off Day</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Barber</label>
                            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {barbers.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Date</label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason (Optional)</label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Vacation, Sick Leave"
                            />
                        </div>

                        <Button onClick={handleAddOffDay} className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                            Set as Off Day
                        </Button>
                    </CardContent>
                </Card>

                {/* Upcoming Off Days List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Off Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : offDays.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No upcoming off days set.</p>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {offDays.map((od) => (
                                    <div key={od.id} className="flex justify-between items-center p-4 border rounded-lg bg-zinc-50">
                                        <div>
                                            <p className="font-bold text-zinc-900">{od.user.name}</p>
                                            <p className="text-sm text-zinc-500">{format(new Date(od.date), 'EEEE, d MMMM yyyy')}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(od.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
