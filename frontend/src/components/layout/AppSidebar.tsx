import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Scissors,
    Users,
    Receipt,
    Wallet,
    LogOut,
    CalendarClock,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Daily Report', href: '/dashboard/daily', icon: CalendarClock },
        { name: 'Services', href: '/dashboard/services', icon: Scissors },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Expenses', href: '/dashboard/expenses', icon: Wallet },
        { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
    ];

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-64">
            <div className="p-6 border-b border-border space-y-4">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.jpg"
                        alt="Logo"
                        className="w-10 h-10 rounded-full object-cover border border-primary/50"
                    />
                    <div>
                        <h1 className="font-bold tracking-widest uppercase">Staycool</h1>
                        <p className="text-xs text-muted-foreground tracking-wider">Management</p>
                    </div>
                </div>
                <Link to="/pos">
                    <Button className="w-full font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-amber-600 transition-all active:scale-[0.98]">
                        Launch POS Station
                    </Button>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link key={item.name} to={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary font-bold shadow-sm border border-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}>
                                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                                <span>{item.name}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border bg-card/50">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{user?.role || 'Staff'}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={logout}
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
