import { useState } from 'react';
import versionData from '@/version.json';

interface VersionFooterProps {
    className?: string;
    compact?: boolean;
}

export function VersionFooter({ className = '', compact = false }: VersionFooterProps) {
    const [showDetails, setShowDetails] = useState(false);

    if (compact) {
        return (
            <div className={`text-xs text-zinc-400 ${className}`}>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="hover:text-zinc-600 transition-colors font-mono"
                    title="Click for build details"
                >
                    {versionData.full}
                </button>
                {showDetails && (
                    <div className="mt-2 p-2 bg-zinc-50 rounded text-[10px] space-y-1">
                        <div>Branch: {versionData.branch}</div>
                        <div>Built: {new Date(versionData.timestamp).toLocaleString('id-ID')}</div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`text-center ${className}`}>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors font-mono"
                title="Click for build details"
            >
                {versionData.full}
            </button>
            {showDetails && (
                <div className="mt-2 inline-block p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500 space-y-1">
                    <div><span className="font-semibold">Branch:</span> {versionData.branch}</div>
                    <div><span className="font-semibold">Commit:</span> {versionData.hash}</div>
                    <div><span className="font-semibold">Built:</span> {new Date(versionData.timestamp).toLocaleString('id-ID')}</div>
                </div>
            )}
        </div>
    );
}
