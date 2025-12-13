import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { closingCash, closedBy, totalSystemRevenue } = body; // totalExpenses, expectedCash, discrepancy unused in Prisma schema

        const shiftId = parseInt(id);

        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId }
        });

        if (!shift) {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }

        if (shift.status === 'closed') {
            return NextResponse.json({ error: 'Shift is already closed' }, { status: 400 });
        }

        // We only update what exists in the schema
        const updatedShift = await prisma.cashShift.update({
            where: { id: shiftId },
            data: {
                actualEndCash: closingCash,
                closedById: closedBy ? parseInt(closedBy) : undefined, // Assuming closedBy is passed as ID
                totalRevenue: totalSystemRevenue,
                status: 'closed',
                endTime: new Date()
            }
        });

        return NextResponse.json(updatedShift);
    } catch (error) {
        console.error("Shift Close Error:", error);
        return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const shift = await prisma.cashShift.findUnique({
            where: { id: parseInt(id) },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } }
            }
        });

        if (!shift) {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }
        return NextResponse.json(shift);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
