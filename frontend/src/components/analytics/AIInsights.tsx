import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { Sparkles, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


export default function AIInsights() {
    const [insights, setInsights] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const response = await apiFetch<{ data: { insights: string } }>('/analytics/insights');
            setInsights(response.data.insights);
        } catch (error) {
            console.error('Failed to fetch AI insights:', error);
            setInsights('Unable to load insights at this time.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-zinc-200 animate-pulse">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full"></div>
                    <div className="h-6 bg-zinc-100 rounded w-1/3"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-zinc-100 rounded w-full"></div>
                    <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
                    <div className="h-4 bg-zinc-100 rounded w-4/6"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm border border-zinc-200">
            {/* Header */}
            <div className="relative z-10 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 shadow-sm">
                        <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-zinc-900">
                            AI Executive Summary
                        </h3>
                        <p className="text-sm text-zinc-500 flex items-center gap-2">
                            Generated on {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            <span className="inline-block h-1 w-1 rounded-full bg-zinc-300" />
                            <span className="text-purple-600 font-medium">Daily Analysis</span>
                        </p>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                    Powered by OpenAI
                </div>
            </div>

            {/* Content Grid */}
            <div className="relative z-10">
                <ReactMarkdown
                    components={{
                        // Remove H1/H2/H3 as they act as card titles now
                        h1: ({ node, ...props }) => { void node; return <h4 className="sr-only" {...props} />; },
                        h2: ({ node, ...props }) => { void node; return <h4 className="sr-only" {...props} />; },
                        h3: ({ node, ...props }) => { void node; return <h4 className="sr-only" {...props} />; },

                        ul: ({ node, ...props }) => { void node; return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0" {...props} />; },

                        // Each list item becomes a card
                        li: ({ node, ...props }) => {
                            void node;
                            // Extract title and content from children
                            // Assumption: The text follows "**Title**: Content" pattern from the prompt

                            return (
                                <div className="group relative flex flex-col rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all hover:bg-white hover:border-purple-100 hover:shadow-md">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-sm group-hover:border-purple-200 group-hover:bg-purple-50">
                                        <Lightbulb className="h-5 w-5 text-zinc-400 group-hover:text-purple-600 transition-colors" />
                                    </div>
                                    <div className="text-sm leading-relaxed text-zinc-600">
                                        {props.children}
                                    </div>
                                </div>
                            );
                        },

                        // Style the strong tag as the card title
                        strong: ({ node, ...props }) => (
                            <div ref={() => void node} className="mb-2 block font-bold text-zinc-900 group-hover:text-purple-700 transition-colors">
                                {props.children}
                            </div>
                        ),

                        // Style regular text
                        p: ({ node, ...props }) => { void node; return <span {...props} />; }
                    }}
                >
                    {insights}
                </ReactMarkdown>
            </div>

            {/* Footer / Decorative */}
            <div className="absolute top-0 right-0 -m-16 h-64 w-64 rounded-full bg-gradient-to-br from-purple-50 via-purple-50/50 to-transparent blur-3xl opacity-60 pointer-events-none"></div>
        </div>
    );
}
