import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { format } from 'date-fns';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { items, totalAmount, paymentMethod, customerName, customerPhone } = body;

        // Ensure barberId is Int
        const barberId = parseInt(body.barberId);
        if (isNaN(barberId)) {
            return NextResponse.json({ error: 'Invalid Barber ID' }, { status: 400 });
        }

        // Generate Invoice Code INV-YYMMDD-XXX
        const today = new Date();
        const todayStr = format(today, 'yyMMdd');

        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const countToday = await prisma.transaction.count({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const sequence = (countToday + 1).toString().padStart(3, '0');
        const invoiceCode = `INV-${todayStr}-${sequence}`;

        // Find active shift (optional)
        const activeShift = await prisma.cashShift.findFirst({
            where: { status: 'open' }
        });

        const transaction = await prisma.transaction.create({
            data: {
                invoiceCode,
                date: new Date(),
                customerName,
                customerPhone,
                barberId,
                items, // Json type
                totalAmount,
                paymentMethod,
                // shiftId removed from schema
            },
        });

        // Update Shift Revenue if active
        if (activeShift) {
            await prisma.cashShift.update({
                where: { id: activeShift.id },
                data: {
                    totalRevenue: { increment: totalAmount }
                }
            });
        }

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error('Transaction Error:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({ error: 'Failed to create transaction', details: (error as any).message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        // const shiftId = searchParams.get('shiftId'); // ShiftID no longer in Transaction
        const date = searchParams.get('date');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        // if (shiftId) where.shiftId = ... // Not supported unless we add relation back

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                barber: {
                    select: { name: true }
                }
            }
        });

        // Flatten barber name to match previous frontend expectation if needed,
        // or frontend updates to check .barber.name
        // Frontend likely checks `barberId.name` (populated). Prisma returns `barber: { name }`.
        // We might need to transform.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = transactions.map((t: any) => ({
            ...t,
            barberId: { name: t.barber.name } // Mocking the populated structure
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
