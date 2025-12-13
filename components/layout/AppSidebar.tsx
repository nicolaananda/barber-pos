'use client';

import {
    LayoutDashboard,
    Scissors,
    CreditCard,
    Banknote,
    Receipt,
    LogOut,
    CalendarDays,
    Menu
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from 'next-auth/react';

const sidebarItems = [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'POS System', icon: Scissors, href: '/pos' },
    // Shift Management removed
    { name: 'Transactions', icon: Receipt, href: '/dashboard/transactions' },
    { name: 'Expenses', icon: CreditCard, href: '/dashboard/expenses' },
    { name: 'Payroll', icon: Banknote, href: '/dashboard/payroll' },
    { name: 'Daily Report', icon: CalendarDays, href: '/dashboard/daily' },
];

export function AppSidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className={cn("pb-12 min-h-screen border-r border-border bg-card text-card-foreground", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-bold tracking-widest uppercase text-foreground flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                        <span className="text-primary">Staycool</span> <span className="text-muted-foreground font-light text-sm">POS</span>
                    </h2>
                    <div className="space-y-1 mt-6">
                        {sidebarItems.map((item) => (
                            <Button
                                key={item.href}
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-base font-medium",
                                    pathname === item.href
                                        ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                                asChild
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2 border-t border-border mt-auto">
                    <div className="px-4 py-4 flex items-center gap-3 bg-secondary/30 rounded-lg mx-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{session?.user?.name || 'User'}</span>
                            <span className="text-xs text-primary uppercase tracking-wider">{session?.user?.role || 'Staff'}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-1"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Log Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
