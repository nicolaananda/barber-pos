import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Clear existing data
        await prisma.transaction.deleteMany({});
        await prisma.expense.deleteMany({});
        await prisma.cashShift.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.service.deleteMany({});
        await prisma.customer.deleteMany({});

        const hashedPassword = await bcrypt.hash('123456', 10);

        // Create Users
        const owner = await prisma.user.create({
            data: {
                name: 'Staycool Owner',
                username: 'owner',
                password: hashedPassword,
                role: 'owner',
                commissionType: 'percentage',
                commissionValue: 0,
            }
        });

        const staff1 = await prisma.user.create({
            data: {
                name: 'Barber Andi',
                username: 'andi',
                password: hashedPassword,
                role: 'staff',
                commissionType: 'percentage',
                commissionValue: 40,
            }
        });

        const staff2 = await prisma.user.create({
            data: {
                name: 'Barber Budi',
                username: 'budi',
                password: hashedPassword,
                role: 'staff',
                commissionType: 'flat',
                commissionValue: 15000,
            }
        });

        // Create Services
        await prisma.service.createMany({
            data: [
                { name: 'Regular Cut', price: 40000 },
                { name: 'Shaving', price: 20000 },
                { name: 'Coloring', price: 100000 },
            ]
        });

        return NextResponse.json({
            message: 'Database seeded successfully (PostgreSQL)',
            users: { owner: owner.username, staff1: staff1.username, staff2: staff2.username },
        });
    } catch (error) {
        console.error('Seed Error:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({ error: 'Failed to seed database', details: (error as any).message }, { status: 500 });
    }
}

