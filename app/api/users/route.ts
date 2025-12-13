import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        // Return all active users (owners and staff)
        const users = await prisma.user.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' },
        });

        // Manually exclude password if needed (though we can use select)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeUsers = users.map((u: any) => {
            const { password, ...rest } = u;
            return rest;
        });

        return NextResponse.json(safeUsers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
