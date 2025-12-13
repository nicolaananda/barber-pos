import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Total Revenue (Current Month)
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const currentMonthRevenueAgg = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            _count: { id: true },
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth,
                }
            }
        });

        const currentMonthExpensesAgg = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth,
                }
            }
        });

        const currentMonthRevenue = currentMonthRevenueAgg._sum.totalAmount || 0;
        const currentMonthExpenses = currentMonthExpensesAgg._sum.amount || 0;
        const currentMonthTxCount = currentMonthRevenueAgg._count.id || 0;

        // 2. Last Month Revenue (for comparison)
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        const lastMonthRevenueAgg = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            where: {
                date: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth,
                }
            }
        });

        const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount || 0;
        const revenueGrowth = lastMonthRevenue === 0 ? 100 : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

        // 3. Active Barbers & Shift Status
        // Active barbers are those who are part of an open shift
        const openShifts = await prisma.cashShift.findMany({
            where: { status: 'open' },
            include: { openedBy: { select: { id: true } } } // Just ensure we fetch
        });

        // Use a Set to count unique user IDs in open shifts if multiple allowed, 
        // though logic typically allows 1 shift/user. But here we assume strict.
        const activeBarbersOnShift = openShifts.length;
        const activeShift = activeBarbersOnShift > 0;

        // 4. Weekly Revenue Chart Data
        const startWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        const endWeek = endOfWeek(now, { weekStartsOn: 1 });

        const weekTransactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startWeek,
                    lte: endWeek
                }
            }
        });

        const days = eachDayOfInterval({ start: startWeek, end: endWeek });
        const chartData = days.map(day => {
            const dayStr = format(day, 'EEE'); // Mon, Tue...
            const dayTotal = weekTransactions
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((tx: any) => format(new Date(tx.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((sum: number, tx: any) => sum + tx.totalAmount, 0);
            return { name: dayStr, total: dayTotal };
        });

        // 5. Recent Activity (Last 5 transactions)
        const recentTransactions = await prisma.transaction.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
                barber: {
                    select: { name: true }
                }
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentActivity = recentTransactions.map((tx: any) => ({
            id: tx.id,
            barberName: tx.barber?.name || 'Unknown',
            serviceName: (tx.items as Array<{ name: string }>).map(i => i.name).join(', '), // Parse JSON
            amount: tx.totalAmount,
            time: format(new Date(tx.date), 'HH:mm')
        }));

        return NextResponse.json({
            stats: {
                totalRevenue: currentMonthRevenue,
                totalExpenses: currentMonthExpenses,
                netProfit: currentMonthRevenue - currentMonthExpenses,
                revenueGrowth: revenueGrowth.toFixed(1),
                transactionCount: currentMonthTxCount,
                activeShift,
                activeBarbers: activeBarbersOnShift,
                // If using Prisma Date types, ensure we wrap in new Date() just in case or use as is
                lastShiftStart: activeShift ? format(new Date(openShifts[0].startTime), 'HH:mm') : '-'
            },
            chartData,
            recentActivity
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
