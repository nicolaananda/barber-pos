import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';

export function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block flex-shrink-0">
                <AppSidebar />
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden border-b border-border p-4 flex items-center gap-4 bg-card">
                <MobileNav />
                <h1 className="font-bold tracking-widest uppercase text-sm">Staycool</h1>
            </header>

            <main className="flex-1 overflow-y-auto relative w-full">
                {children}
            </main>
        </div>
    );
}
