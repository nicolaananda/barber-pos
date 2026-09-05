import { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
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
    LineChart,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Monitor,
    ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VersionFooter } from '@/components/VersionFooter';


interface AppSidebarProps {
    defaultCollapsed?: boolean;
    className?: string; // Allow external className prop
}

export function AppSidebar({ defaultCollapsed = true, className }: AppSidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const isHoverExpanded = useRef(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (isCollapsed) {
            isHoverExpanded.current = true;
            setIsCollapsed(false);
        }
    }, [isCollapsed]);

    const handleMouseLeave = useCallback(() => {
        if (isHoverExpanded.current) {
            hoverTimeoutRef.current = setTimeout(() => {
                setIsCollapsed(true);
                isHoverExpanded.current = false;
            }, 500);
        }
    }, []);

    const handleToggle = useCallback(() => {
        isHoverExpanded.current = false;
        setIsCollapsed(prev => !prev);
    }, []);

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
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        ...(user?.role === 'owner' ? [
            { name: 'Barbers', href: '/dashboard/barbers', icon: UserCog },
            { name: 'Schedule', href: '/dashboard/schedule', icon: CalendarClock },
            { name: 'Audit Log', href: '/dashboard/audit', icon: ClipboardList }
        ] : []),
    ];

    return (
        <aside
            className={cn(
                "relative transition-all duration-300 ease-in-out m-4 h-[calc(100vh-2rem)]",
                isCollapsed ? "w-20" : "w-64",
                className
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Liquid Glass Background Effect (CSS) */}
            <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden border border-white/40 shadow-sm">
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xl"></div>

                {/* Subtle gradient for "liquid" feel */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 opacity-50"></div>

                {/* Noise texture for premium feel */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
            </div>

            {/* Toggle Button - Moved outside to separate clipping context */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-zinc-300 bg-white shadow-md hover:bg-zinc-100 z-50 p-0 text-zinc-600 hover:text-zinc-900"
                onClick={handleToggle}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col h-full rounded-2xl overflow-hidden">

                <div className={cn("p-6 border-b border-white/20 space-y-4", isCollapsed && "px-2 py-6")}>
                    <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                        <img
                            src="/logo.jpg"
                            alt="Logo"
                            className="w-10 h-10 rounded-full object-cover border border-white/50 grayscale shadow-sm"
                        />
                        {!isCollapsed && (
                            <div className="overflow-hidden whitespace-nowrap">
                                <h1 className="font-bold tracking-widest uppercase text-zinc-900 transition-opacity duration-300">Staycool</h1>
                                <p className="text-xs text-zinc-500 tracking-wider transition-opacity duration-300">Management</p>
                            </div>
                        )}
                    </div>
                    <Link to="/pos" title="Launch POS">
                        <Button
                            className={cn(
                                "w-full font-bold shadow-md bg-zinc-900/90 text-white hover:bg-zinc-900 transition-all active:scale-[0.98] backdrop-blur-sm",
                                isCollapsed ? "px-0" : ""
                            )}
                        >
                            {isCollapsed ? <Monitor className="w-5 h-5" /> : "Launch POS Station"}
                        </Button>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200/50">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link key={item.name} to={item.href} title={isCollapsed ? item.name : undefined}>
                                <div className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-white/80 text-zinc-900 font-bold shadow-sm backdrop-blur-md border border-white/50"
                                        : "text-zinc-600 hover:bg-white/40 hover:text-zinc-900 hover:shadow-sm",
                                    isCollapsed ? "justify-center px-2" : ""
                                )}>
                                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-zinc-900" : "text-zinc-500")} />
                                    {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-all duration-300">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className={cn("p-4 border-t border-white/20", isCollapsed && "px-2")}>
                    <div className={cn("flex items-center gap-3 mb-4 px-2", isCollapsed && "justify-center px-0")}>
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-zinc-900 font-bold border border-white/50 flex-shrink-0 backdrop-blur-sm shadow-sm text-sm">
                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden whitespace-nowrap">
                                <p className="text-sm font-bold truncate text-zinc-900">{user?.name || 'User'}</p>
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">{user?.role || 'Staff'}</p>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 text-zinc-600 hover:text-red-600 hover:bg-red-50/50 mb-3",
                            isCollapsed && "justify-center px-0"
                        )}
                        onClick={logout}
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        {!isCollapsed && "Logout"}
                    </Button>
                    {!isCollapsed && <VersionFooter compact className="text-center pt-3 border-t border-white/20 text-zinc-500" />}
                </div>
            </div>
        </aside>
    );
}
