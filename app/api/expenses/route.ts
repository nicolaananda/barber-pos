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
        const { description, amount, category } = body;

        const expense = await prisma.expense.create({
            data: {
                description,
                amount,
                category,
                date: new Date(),
                // shiftId removed
            }
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        // const shiftId = searchParams.get('shiftId'); // removed

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        // if (shiftId) where.shiftId = ...

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id } = body;

        await prisma.expense.delete({ where: { id: Number(id) } });

        return NextResponse.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, description, amount, category } = body;

        const expense = await prisma.expense.update({
            where: { id: Number(id) },
            data: {
                description,
                amount: Number(amount),
                category,
            },
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }
}
