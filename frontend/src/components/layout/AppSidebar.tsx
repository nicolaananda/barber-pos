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
    Calendar,
    DollarSign,
    UserCog,
    LineChart
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
        { name: 'Profit & Loss', href: '/dashboard/profit-loss', icon: LineChart },
        { name: 'Expenses', href: '/dashboard/expenses', icon: Wallet },
        { name: 'Payroll', href: '/dashboard/payroll', icon: DollarSign },
        { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
        ...(user?.role === 'owner' ? [
            { name: 'Barbers', href: '/dashboard/barbers', icon: UserCog },
            { name: 'Schedule', href: '/dashboard/schedule', icon: CalendarClock }
        ] : []),
    ];

    return (
        <div className="flex flex-col h-full bg-white border-r border-zinc-200 w-64">
            <div className="p-6 border-b border-zinc-100 space-y-4">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.jpg"
                        alt="Logo"
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200 grayscale"
                    />
                    <div>
                        <h1 className="font-bold tracking-widest uppercase text-zinc-900">Staycool</h1>
                        <p className="text-xs text-zinc-500 tracking-wider">Management</p>
                    </div>
                </div>
                <Link to="/pos">
                    <Button className="w-full font-bold shadow-md bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-[0.98]">
                        Launch POS Station
                    </Button>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link key={item.name} to={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-zinc-100 text-zinc-900 font-bold shadow-sm"
                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                            )}>
                                <item.icon className={cn("w-5 h-5", isActive ? "text-zinc-900" : "text-zinc-400")} />
                                <span>{item.name}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-zinc-100 bg-white">
                <div className="flex items-center gap-3 mb-4 px-2">
                    {user?.username === 'bagus' ? (
                        <img
                            src="/bagus.webp"
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                        />
                    ) : user?.username === 'diva' ? (
                        <img
                            src="/profil_diva.webp"
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold border border-zinc-200">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-zinc-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">{user?.role || 'Staff'}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-zinc-500 hover:text-red-600 hover:bg-red-50"
                    onClick={logout}
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
