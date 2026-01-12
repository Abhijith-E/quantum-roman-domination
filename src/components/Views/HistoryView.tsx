import React from 'react';
import type { HistoryItem } from '../../hooks/useHistory';
import { Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface HistoryViewProps {
    history: HistoryItem[];
    onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onClear }) => {
    return (
        <div className="max-w-5xl mx-auto p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Calculation History</h2>
                    <p className="text-slate-500">Review past optimal solutions and graph structures.</p>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                    >
                        <Trash2 size={16} /> Clear History
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400">No history records found.</p>
                    <p className="text-sm text-slate-300 mt-2">Run an algorithm to save results here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map(item => (
                        <HistoryCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
};

const HistoryCard = ({ item }: { item: HistoryItem }) => {
    const date = new Date(item.timestamp).toLocaleString();

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {/* 1. Diagram Preview */}
            <div className="h-40 bg-slate-50 relative border-b border-slate-100 overflow-hidden">
                <MiniGraphPreview data={item.graphData} assignment={item.assignment} />
                <div className="absolute top-3 right-3">
                    {item.isValid ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                            <CheckCircle size={10} /> Valid
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                            <XCircle size={10} /> Invalid
                        </span>
                    )}
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-mono text-slate-500 border border-slate-200">
                    W: {item.weight}
                </div>
            </div>

            {/* 2. Details */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-slate-800 text-sm">Run {item.id.slice(0, 4)}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={10} /> {date}
                        </p>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="bg-slate-50 p-2 rounded">
                        <span className="block text-slate-400 text-[10px] uppercase">Variant</span>
                        {item.variant}
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                        <span className="block text-slate-400 text-[10px] uppercase">Size</span>
                        {item.verticesCount}V / {item.edgesCount}E
                    </div>
                </div>
            </div>
        </div>
    )
}

// Lightweight SVG Renderer for Preview
const MiniGraphPreview = ({ data, assignment }: { data: HistoryItem['graphData'], assignment: Record<string, any> }) => {
    // Calculate bounds to normalize view
    const xs = data.vertices.map(v => v.x);
    const ys = data.vertices.map(v => v.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 800);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 600);
    const width = maxX - minX + 50;
    const height = maxY - minY + 50;

    return (
        <svg viewBox={`${minX - 25} ${minY - 25} ${width} ${height}`} className="w-full h-full opacity-80">
            {/* Edges */}
            {data.edges.map((e, i) => {
                const u = data.vertices.find(v => v.id === e.source);
                const v = data.vertices.find(v => v.id === e.target);
                if (!u || !v) return null;
                return (
                    <line
                        key={i}
                        x1={u.x} y1={u.y} x2={v.x} y2={v.y}
                        stroke={e.sign === -1 ? '#ef4444' : '#cbd5e1'}
                        strokeWidth="4"
                        strokeDasharray={e.sign === -1 ? "8,4" : "none"}
                    />
                )
            })}
            {/* Vertices */}
            {data.vertices.map(v => {
                const val = assignment[v.id] || 0;
                let fill = '#fff';
                if (val === 1) fill = '#e0f2fe'; // light blue
                if (val === 2) fill = '#1e40af'; // dark blue

                return (
                    <g key={v.id}>
                        <circle
                            cx={v.x} cy={v.y} r="15"
                            fill={fill}
                            stroke={val === 2 ? '#1e3a8a' : '#94a3b8'}
                            strokeWidth="2"
                        />
                        {/* Value Label */}
                        <text
                            x={v.x} y={v.y} dy="4"
                            textAnchor="middle"
                            fill={val === 2 ? '#fff' : '#475569'}
                            fontSize="10"
                            fontWeight="bold"
                        >
                            {val}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}
