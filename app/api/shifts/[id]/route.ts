import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CashShift from '@/models/CashShift';
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
        const { closingCash, closedBy, totalSystemRevenue, totalExpenses } = body;

        await dbConnect();

        const shift = await CashShift.findById(id);
        if (!shift) {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }

        if (shift.status === 'closed') {
            return NextResponse.json({ error: 'Shift is already closed' }, { status: 400 });
        }

        const expectedCash = shift.openingCash + totalSystemRevenue - totalExpenses;
        const discrepancy = closingCash - expectedCash;

        shift.closingCash = closingCash;
        shift.closedBy = closedBy;
        shift.totalSystemRevenue = totalSystemRevenue;
        shift.totalExpenses = totalExpenses;
        shift.expectedCash = expectedCash;
        shift.discrepancy = discrepancy;
        shift.status = 'closed';

        await shift.save();

        return NextResponse.json(shift);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const shift = await CashShift.findById(id).populate('openedBy closedBy', 'name');
        if (!shift) {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }
        return NextResponse.json(shift);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
