import React, { useState } from 'react';
import type { HistoryItem } from '../../hooks/useHistory';
import { Trash2, Calendar, CheckCircle, XCircle, X, ChevronRight, Hash, Clock, Cpu, AlertTriangle } from 'lucide-react';

interface HistoryViewProps {
    history: HistoryItem[];
    onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onClear }) => {
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

    // Defensive check: handle null/undefined history
    const safeHistory = history || [];

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Calculation History</h2>
                    <p className="text-slate-500">Review past optimal solutions and graph structures.</p>
                </div>
                {safeHistory.length > 0 && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                    >
                        <Trash2 size={16} /> Clear History
                    </button>
                )}
            </div>

            {safeHistory.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400">No history records found.</p>
                    <p className="text-sm text-slate-300 mt-2">Run an algorithm to save results here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {safeHistory.map(item => {
                        // Skip rendering if item is completely broken
                        if (!item || !item.id) return null;
                        return (
                            <HistoryCard
                                key={item.id}
                                item={item}
                                onClick={() => setSelectedItem(item)}
                            />
                        );
                    })}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedItem && (
                <HistoryDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

const HistoryCard = ({ item, onClick }: { item: HistoryItem, onClick: () => void }) => {
    const date = item.timestamp ? new Date(item.timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Unknown date';

    const algoName = item.algo || 'Unknown Algorithm';
    const weightValue = item.weight !== undefined ? item.weight : '?';

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer overflow-hidden flex flex-col"
        >
            {/* 1. Diagram Preview */}
            <div className="h-40 bg-slate-50 relative border-b border-slate-100 overflow-hidden">
                {item.graphData ? (
                    <MiniGraphPreview data={item.graphData} assignment={item.assignment} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <AlertTriangle size={24} />
                    </div>
                )}

                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all bg-white px-3 py-1.5 rounded-full shadow-lg text-blue-600 text-xs font-bold flex items-center gap-1">
                        View Details <ChevronRight size={14} />
                    </div>
                </div>

                <div className="absolute top-3 right-3">
                    {item.isValid ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                            <CheckCircle size={10} /> Valid
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                            <XCircle size={10} /> {item.isValid === false ? 'Invalid' : 'Unknown'}
                        </span>
                    )}
                </div>
            </div>

            {/* 2. Details */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{algoName}</h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                            <Calendar size={10} /> {date}
                        </p>
                    </div>
                    <div className="ml-2 bg-blue-50 px-2 py-1 rounded text-blue-700 text-xs font-bold border border-blue-100 whitespace-nowrap">
                        W: {weightValue}
                    </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{(item as any).verticesCount || 0} Nodes</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{(item as any).edgesCount || 0} Edges</span>
                    {item.timeTaken !== undefined && (
                        <span className="ml-auto text-slate-400">{item.timeTaken.toFixed(0)}ms</span>
                    )}
                </div>
            </div>
        </div>
    )
}

const HistoryDetailModal = ({ item, onClose }: { item: HistoryItem, onClose: () => void }) => {
    const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{item.algo || 'Calculation Detail'}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <Calendar size={14} /> Recorded on {date}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Visualization */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative group min-h-[300px] flex items-center justify-center">
                            {item.screenshot ? (
                                <img src={item.screenshot} alt="Run Screenshot" className="w-full h-auto object-contain" />
                            ) : (
                                <div className="w-full aspect-video flex items-center justify-center text-slate-400 flex-col gap-2">
                                    {item.graphData ? <MiniGraphPreview data={item.graphData} assignment={item.assignment} /> : <AlertTriangle size={48} />}
                                    <span className="text-xs uppercase tracking-widest mt-4">No Screenshot Available</span>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex gap-2">
                                {item.isValid ? (
                                    <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                        <CheckCircle size={14} /> RDF VALID
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                        <XCircle size={14} /> RDF {item.isValid === false ? 'INVALID' : 'UNKNOWN'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-xl">
                                <Hash size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-blue-600 uppercase font-bold tracking-widest">Calculated Minimum Weight</p>
                                <p className="text-2xl font-black text-blue-900">{item.weight ?? 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        <section>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Graph Attributes</h5>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                    <span className="text-slate-500">Vertices</span>
                                    <span className="font-bold text-slate-800">{(item as any).verticesCount || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                    <span className="text-slate-500">Edges</span>
                                    <span className="font-bold text-slate-800">{(item as any).edgesCount || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                    <span className="text-slate-500">Variant</span>
                                    <span className="font-bold text-slate-800">{item.variant || 'N/A'}</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Execution Stats</h5>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                    <Clock className="text-orange-500" size={16} />
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Time Taken</p>
                                        <p className="font-bold text-slate-800">{item.timeTaken ? item.timeTaken.toFixed(2) : '--'} ms</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                    <Cpu className="text-purple-500" size={16} />
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Solver Engine</p>
                                        <p className="font-bold text-slate-800">{item.algo || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="pt-6 border-t border-slate-100 mt-auto">
                            <p className="text-[10px] text-slate-300 font-mono break-all line-clamp-2">UUID: {item.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Lightweight SVG Renderer for Preview
const MiniGraphPreview = ({ data, assignment }: { data: HistoryItem['graphData'], assignment: Record<string, any> }) => {
    // Safety check for data
    if (!data || !data.vertices || !Array.isArray(data.vertices)) {
        return <div className="w-full h-full flex items-center justify-center text-slate-200"><Cpu size={40} /></div>;
    }

    const safeAssignment = assignment || {};

    // Calculate bounds to normalize view
    const xs = data.vertices.map(v => v.x);
    const ys = data.vertices.map(v => v.y);

    // Handle empty vertices
    if (xs.length === 0) return null;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = Math.max(maxX - minX + 100, 200);
    const height = Math.max(maxY - minY + 100, 200);

    const getVertexColor = (val: number) => {
        switch (val) {
            case 2: return '#22c55e'; // Green
            case 1: return '#eab308'; // Yellow
            case 0: return '#ffffff'; // White
            default: return '#ffffff';
        }
    };

    return (
        <svg viewBox={`${minX - 50} ${minY - 50} ${width} ${height}`} className="w-full h-full opacity-90 transition-opacity">
            {/* Edges */}
            {Array.isArray(data.edges) && data.edges.map((e, l) => {
                const u = data.vertices.find(v => v.id === e.source);
                const v = data.vertices.find(v => v.id === e.target);
                if (!u || !v) return null;
                return (
                    <line
                        key={l}
                        x1={u.x} y1={u.y} x2={v.x} y2={v.y}
                        stroke={e.sign === -1 ? '#f87171' : '#cbd5e1'}
                        strokeWidth="5"
                        strokeDasharray={e.sign === -1 ? "10,5" : "none"}
                        opacity="0.6"
                    />
                )
            })}
            {/* Vertices */}
            {data.vertices.map(v => {
                const val = safeAssignment[v.id] || 0;
                const fill = getVertexColor(val);

                return (
                    <g key={v.id}>
                        <circle
                            cx={v.x} cy={v.y} r="20"
                            fill={fill}
                            stroke={val > 0 ? '#1e293b' : '#cbd5e1'}
                            strokeWidth="3"
                        />
                        {/* Value Label */}
                        <text
                            x={v.x} y={v.y} dy="5"
                            textAnchor="middle"
                            fill="#000"
                            fontSize="14"
                            fontWeight="900"
                        >
                            {val}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}
