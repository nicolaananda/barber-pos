import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            // Return top 10 most recent
            const customers = await prisma.customer.findMany({
                orderBy: { updatedAt: 'desc' },
                take: 10,
            });
            return NextResponse.json(customers);
        }

        // Search by name or phone
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 20,
        });

        return NextResponse.json(customers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
        }

        const customer = await prisma.customer.upsert({
            where: { phone },
            update: {
                name, // Update name just in case
                totalVisits: { increment: 1 },
                lastVisit: new Date(),
            },
            create: {
                name,
                phone,
                totalVisits: 1,
                lastVisit: new Date(),
            },
        });

        return NextResponse.json(customer);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}
