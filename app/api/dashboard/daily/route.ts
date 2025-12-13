
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Fix import if needed

export async function GET() {
    try {
        const session = await getServerSession(authOptions); // Pass authOptions
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                barber: true,
            },
        });

        // Calculate Totals
        const totalRevenue = transactions.reduce((sum: number, t) => sum + t.totalAmount, 0);
        const transactionCount = transactions.length;

        const cashTotal = transactions
            .filter(t => t.paymentMethod === 'cash')
            .reduce((sum: number, t) => sum + t.totalAmount, 0);

        const qrisTotal = transactions
            .filter(t => t.paymentMethod === 'qris')
            .reduce((sum: number, t) => sum + t.totalAmount, 0);

        // Find Top Barber
        const barberStats: { [key: string]: { revenue: number, count: number, name: string } } = {};

        transactions.forEach((t) => {
            const bId = t.barberId;
            if (!barberStats[bId]) {
                barberStats[bId] = { revenue: 0, count: 0, name: t.barber.name };
            }
            barberStats[bId].revenue += t.totalAmount;
            barberStats[bId].count += 1;
        });

        let topBarber = null;
        let maxRev = -1;

        Object.values(barberStats).forEach(stat => {
            if (stat.revenue > maxRev) {
                maxRev = stat.revenue;
                topBarber = stat;
            }
        });

        return NextResponse.json({
            totalRevenue,
            transactionCount,
            cashTotal,
            qrisTotal,
            topBarber,
            recentTransactions: transactions.map(t => ({
                id: t.id,
                invoiceCode: t.invoiceCode,
                time: t.date,
                barberName: t.barber.name,
                totalAmount: t.totalAmount,
                paymentMethod: t.paymentMethod,
                items: t.items
            }))
        });

    } catch (error) {
        console.error("Daily Recap Error:", error);
        return NextResponse.json({ error: 'Failed to fetch daily recap' }, { status: 500 });
    }
}
