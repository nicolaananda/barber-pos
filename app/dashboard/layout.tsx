'use client';

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'staff') {
            router.replace('/pos');
        }
    }, [session, status, router]);

    if (status === 'loading') return null; // Or a spinner

    if (session?.user?.role === 'staff') return null; // Prevent flash

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
            {/* Desktop Sidebar */}
            <div className="hidden md:block w-64 flex-shrink-0 border-r border-border bg-card">
                <AppSidebar />
            </div>

            {/* Mobile Header & Content */}
            <div className="flex-1 flex flex-col">
                <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between">
                    <span className="font-bold text-lg text-foreground">Staycool POS</span>
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 bg-card border-r-border text-foreground w-64">
                            <AppSidebar />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
