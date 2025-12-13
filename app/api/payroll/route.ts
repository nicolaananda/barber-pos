
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        // Calculate start and end date for the filter
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59); // End of month

        // Fetch all barbers (active users who are not just admins if needed, but for now fetch all to see stats)
        const barbers = await prisma.user.findMany({
            where: { role: { not: 'admin' } }, // Optional: filter out admins if they don't do cuts
        });

        const payrollStats = await Promise.all(barbers.map(async (barber) => {
            // Aggregate transactions for this barber in this period
            const aggregate = await prisma.transaction.aggregate({
                where: {
                    barberId: barber.id,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    totalAmount: true,
                },
                _count: {
                    id: true,
                },
            });

            const totalRevenue = aggregate._sum.totalAmount || 0;
            const totalTransactions = aggregate._count.id || 0;

            let estimatedCommission = 0;
            if (barber.commissionType === 'percentage') {
                estimatedCommission = totalRevenue * (barber.commissionValue / 100);
            } else {
                estimatedCommission = totalTransactions * barber.commissionValue;
            }

            return {
                barberId: barber.id,
                barberName: barber.name,
                totalTransactions,
                totalRevenue,
                commissionType: barber.commissionType,
                commissionRate: barber.commissionValue,
                estimatedCommission,
                period: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
            };
        }));

        return NextResponse.json(payrollStats);

    } catch (error) {
        console.error("Payroll API Error:", error);
        return NextResponse.json({ error: 'Failed to calculate payroll' }, { status: 500 });
    }
}
