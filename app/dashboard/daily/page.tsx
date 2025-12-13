'use client';

import DailyRecap from '@/components/dashboard/DailyRecap';

export default function DailyReportPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Report</h1>
                <p className="text-muted-foreground mt-1">Detailed breakdown of today's performance.</p>
            </div>

            <DailyRecap />
        </div>
    );
}
