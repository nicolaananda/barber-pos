import { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/useAuth';

interface AuditEntry {
    timestamp: string;
    action: string;
    userId: number | null;
    userName: string | null;
    details: Record<string, unknown>;
}

export default function AuditPage() {
    const { token } = useAuth();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/audit`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch audit log');
                return res.json();
            })
            .then(setEntries)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                    <ClipboardList className="h-6 w-6" /> Audit Log
                </h1>
                <p className="text-sm text-zinc-500 mt-1">Riwayat aktivitas penting owner dan staff.</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Aktivitas Terbaru</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : entries.length === 0 ? (
                        <p className="text-sm text-zinc-500">Belum ada aktivitas tercatat.</p>
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry, index) => (
                                <div key={`${entry.timestamp}-${index}`} className="border-b border-zinc-100 pb-3 last:border-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{entry.action}</Badge>
                                        <span className="text-xs text-zinc-500">{entry.userName || (entry.userId ? `User #${entry.userId}` : 'System')}</span>
                                        <time className="text-xs text-zinc-400 ml-auto" dateTime={entry.timestamp}>
                                            {new Date(entry.timestamp).toLocaleString('id-ID')}
                                        </time>
                                    </div>
                                    {Object.keys(entry.details || {}).length > 0 && (
                                        <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-zinc-600">{JSON.stringify(entry.details, null, 2)}</pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
