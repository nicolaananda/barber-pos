import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/useAuth';

export function BookingNotifier() {
    const { token, user } = useAuth();
    const previousPendingCount = useRef<number | null>(null);

    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Play a two-tone "ding-dong" for better audibility
            const playTone = (freq: number, startTime: number, duration: number) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0.8, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            playTone(880, ctx.currentTime, 0.3);        // A5
            playTone(1108, ctx.currentTime + 0.15, 0.4); // C#6
        } catch (error) {
            console.error("Audio play failed", error);
        }
    };

    const sendBrowserNotification = (customerName: string, timeSlot: string) => {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('Booking Baru!', {
                body: `${customerName} - ${timeSlot}`,
                icon: '/logo.jpg',
                tag: 'new-booking', // Prevents duplicate notifications
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    };

    useEffect(() => {
        // Only run for owner role
        if (!token || user?.role !== 'owner') return;

        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkBookings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookings?status=pending`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;

                const bookings = await res.json();
                const currentPendingCount = bookings.length;

                // First load: just store the count
                if (previousPendingCount.current === null) {
                    previousPendingCount.current = currentPendingCount;
                    return;
                }

                // If new pending bookings found
                if (currentPendingCount > previousPendingCount.current) {
                    const newCount = currentPendingCount - previousPendingCount.current;
                    const latestBooking = bookings[0]; // Most recent

                    playNotificationSound();

                    toast.success(`${newCount} Booking Baru!`, {
                        description: latestBooking
                            ? `${latestBooking.customerName} - ${latestBooking.timeSlot}`
                            : 'Cek halaman Bookings untuk detail.',
                        duration: 8000,
                        action: {
                            label: "Lihat",
                            onClick: () => window.location.href = "/dashboard/bookings"
                        }
                    });

                    // Send browser notification
                    if (latestBooking) {
                        sendBrowserNotification(latestBooking.customerName, latestBooking.timeSlot);
                    }
                }

                previousPendingCount.current = currentPendingCount;
            } catch (error) {
                console.error("Failed to check bookings:", error);
            }
        };

        // Check every 15 seconds (more responsive than 30s)
        const interval = setInterval(checkBookings, 15000);
        checkBookings();

        return () => clearInterval(interval);
    }, [token, user?.role]);

    return null; // Invisible component
}
