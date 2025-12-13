import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { openingCash, openedBy } = body;

        // We need userId for openedBy relation. 
        // Assuming 'openedBy' from body is just name or we use session.
        // Better to use session.user.id if available, but let's stick to simple logic for now or infer ID.
        // Actually CashShift model requires openedById (Int).
        // session.user.id is string in NextAuth but Prisma ID is Int.
        // We need to parse it.

        const userId = parseInt(session.user.id);
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
        }

        // Check if there is already an open shift
        const existingOpenShift = await prisma.cashShift.findFirst({
            where: { status: 'open' }
        });

        if (existingOpenShift) {
            return NextResponse.json({ error: 'A shift is already open' }, { status: 400 });
        }

        const shift = await prisma.cashShift.create({
            data: {
                openedById: userId,
                startCash: parseFloat(openingCash),
                status: 'open',
                startTime: new Date(),
            }
        });

        return NextResponse.json(shift, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to open shift' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (status) where.status = status;

        const shifts = await prisma.cashShift.findMany({
            where,
            orderBy: { startTime: 'desc' },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } }
            }
        });

        return NextResponse.json(shifts);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }
}
