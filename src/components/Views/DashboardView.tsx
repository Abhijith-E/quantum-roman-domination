import { useRef } from 'react';
import { RamseyChecker } from '../../core/graph/Ramsey';
import type { RamseyResult } from '../../core/graph/Ramsey';
import { useState } from 'react';
import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';
import { SRDFVariant, RDFProblem } from '../../core/graph/RDF';
import { GraphCanvas } from '../GraphCanvas/GraphCanvas';
import type { GraphCanvasRef } from '../GraphCanvas/GraphCanvas';
import { SolverPanel } from '../Controls/SolverPanel';
import { ProblemTypeSelector } from '../Controls/ProblemTypeSelector';

interface DashboardViewProps {
    graph: Graph;
    assignment: Map<number, RDFValue>;
    setAssignment: (a: Map<number, RDFValue>) => void;
    mode: 'edit' | 'assign';
    setMode: (m: 'edit' | 'assign') => void;
    isSigned: boolean;
    setIsSigned: (s: boolean) => void;
    variant: SRDFVariant;
    setVariant: (v: SRDFVariant) => void;
    onGraphChange: () => void;
    onClear: () => void;
    onLoadTemplate: (t: 'P5' | 'C6' | 'K14' | 'K20' | 'K50' | 'K100' | 'Geo60' | 'Diamond11' | 'jamesreshma20') => void;
    // Callback for when solver finds solution (to trigger parent side effects like history save)
    onSolutionFound: (assignment: Map<number, RDFValue>, weight: number, time: number, algo: string, screenshot: string | null) => void;
    problem: RDFProblem;
    // Analysis results passed down to avoid re-calc
    weight: number;
    violations: number;
    attacks: number;
    isValid: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    graph, assignment, setAssignment, mode, setMode,
    isSigned, setIsSigned, variant, setVariant,
    onGraphChange, onClear, onLoadTemplate, onSolutionFound,
    weight, violations, attacks, isValid
}) => {

    // Canvas Ref for Screenshots
    const canvasRef = useRef<GraphCanvasRef>(null);

    // Ramsey State
    const [analysisMode, setAnalysisMode] = useState<'roman' | 'ramsey'>('roman');
    const [ramseyM, setRamseyM] = useState(3);
    const [ramseyN, setRamseyN] = useState(3);
    const [ramseyResult, setRamseyResult] = useState<RamseyResult | null>(null);

    const handleRamseyCheck = () => {
        const result = RamseyChecker.check(graph, ramseyM, ramseyN);
        setRamseyResult(result);
    };

    const handleClearAll = () => {
        onClear();
        setRamseyResult(null);
    }

    const handleSolverSolution = (assignment: Map<number, RDFValue>, weight: number, time: number, algo: string) => {
        const screenshot = canvasRef.current?.getScreenshot(assignment) ?? null;
        onSolutionFound(assignment, weight, time, algo, screenshot);
    };

    return (
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto animate-fade-in-up">

            {/* LEFT COLUMN: Graph Editor */}
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex gap-2">
                        {/* Mode Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
                            <button
                                onClick={() => setAnalysisMode('roman')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${analysisMode === 'roman' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                Roman Dom.
                            </button>
                            <button
                                onClick={() => setAnalysisMode('ramsey')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${analysisMode === 'ramsey' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}
                            >
                                Ramsey #
                            </button>
                        </div>

                        <button
                            onClick={() => setMode('edit')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'edit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Plus size={16} /> Edit Structure
                        </button>
                        {analysisMode === 'roman' && (
                            <button
                                onClick={() => setMode('assign')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'assign' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Edit3 size={16} /> Assign Values
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-2">Templates:</span>
                        {['P5', 'C6', 'K14', 'K20', 'K50', 'K100', 'Geo60', 'Diamond11', 'jamesreshma20'].map(t => (
                            <button key={t} onClick={() => onLoadTemplate(t as any)} className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                {t}
                            </button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-2"></div>
                        <button onClick={handleClearAll} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Clear All">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Canvas Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
                    <GraphCanvas
                        ref={canvasRef}
                        graph={graph}
                        assignment={assignment}
                        onGraphChange={() => { onGraphChange(); setRamseyResult(null); }}
                        onAssignmentChange={setAssignment}
                        mode={mode}
                        highlightedVertices={analysisMode === 'ramsey' && ramseyResult?.clique ? ramseyResult.clique : []}
                    />
                </div>

                {/* Quick Status Bar */}
                <div className="grid grid-cols-4 gap-4">
                    <StatusCard label="Vertices" value={graph.vertices.size} />
                    <StatusCard label="Edges" value={graph.edges.length} />
                    {analysisMode === 'roman' ? (
                        <>
                            <StatusCard label="Current Weight" value={weight} highlight />
                            <StatusCard label="Validation" value={isValid ? "VALID" : "INVALID"} status={isValid ? 'success' : 'error'} />
                        </>
                    ) : (
                        <StatusCard label="Ramsey Status" value={ramseyResult ? (ramseyResult.found ? "CLIQUE FOUND" : "None Found") : "Ready"} status={ramseyResult?.found ? 'success' : undefined} />
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Controls & Analysis */}
            <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">

                {analysisMode === 'roman' ? (
                    <>
                        {/* 1. Configuration */}
                        <ProblemTypeSelector
                            isSigned={isSigned} setSigned={setIsSigned}
                            variant={variant} setVariant={setVariant}
                        />

                        {/* 2. Validation Constraints Details */}
                        {(violations > 0 || (isSigned && attacks > 0)) && (
                            <div
                                className="bg-red-50 border border-red-100 rounded-xl p-4 animate-fade-in-up"
                            >
                                <h4 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                                    ⚠️ Constraints Violated
                                </h4>
                                <ul className="space-y-1 text-sm text-red-700">
                                    {violations > 0 && <li>• {violations} vertices are not properly defended.</li>}
                                    {isSigned && attacks > 0 && <li>• {attacks} negative edge conflicts detected.</li>}
                                </ul>
                            </div>
                        )}

                        {/* 3. Algorithms Runner */}
                        <SolverPanel
                            graph={graph}
                            variant={isSigned ? variant : undefined}
                            onSolutionFound={handleSolverSolution}
                        />
                    </>
                ) : (
                    // RAMSEY MODE CONTROLS
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up">
                        <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-purple-700">Ramsey Analysis</h2>
                        <p className="text-xs text-slate-500 mb-4">
                            Check if the graph contains a Clique of size <b>m</b> in Positive Edges OR a Clique of size <b>n</b> in Negative Edges.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Target Positive (m)</label>
                                <input
                                    type="number"
                                    min="2"
                                    value={ramseyM}
                                    onChange={(e) => setRamseyM(parseInt(e.target.value))}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Target Negative (n)</label>
                                <input
                                    type="number"
                                    min="2"
                                    value={ramseyN}
                                    onChange={(e) => setRamseyN(parseInt(e.target.value))}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={handleRamseyCheck}
                                className="flex-1 py-2 px-4 rounded-md font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                            >
                                Check Current
                            </button>
                            <button
                                onClick={() => {
                                    const N = graph.vertices.size;
                                    // Run Heuristic
                                    const result = RamseyChecker.findCounterExample(N, ramseyM, ramseyN);

                                    // Apply Edges to Graph
                                    graph.edges = [];
                                    graph.adjacency = new Map();
                                    graph.vertices.forEach(v => graph.adjacency.set(v.id, []));

                                    result.edges.forEach(e => {
                                        graph.addEdge(e.u, e.v, e.sign);
                                    });

                                    onGraphChange(); // Trigger redraw
                                    setRamseyResult(null); // Clear previous check result

                                    // Auto-check the new graph
                                    setTimeout(handleRamseyCheck, 100);
                                }}
                                className="flex-1 py-2 px-4 rounded-md font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 transition-colors"
                                title="Attempt to color edges to AVOID cliques (Prove Lower Bound)"
                            >
                                Auto-Color
                            </button>
                        </div>

                        {ramseyResult && (
                            <div className={`p-4 rounded-lg text-sm border ${ramseyResult.found ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                {ramseyResult.found ? (
                                    <>
                                        <div className="font-bold flex items-center gap-2">
                                            ⚠️ Clique Found!
                                        </div>
                                        <div className="mt-1">
                                            Found a <b>{ramseyResult.condition === 'positive' ? 'Positive' : 'Negative'}</b> Clique of size <b>{ramseyResult.size}</b>.
                                        </div>
                                        <div className="text-xs mt-2 opacity-75">
                                            This coloring DOES NOT avoid K_{ramseyM}/K_{ramseyN}.
                                            <br />(Upper Bound Constraint Met)
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="font-bold text-blue-700">✅ Valid Coloring Found!</div>
                                        <div className="mt-1 text-xs text-blue-600">
                                            No positive K_{ramseyM} and no negative K_{ramseyN} exist.
                                            <br />
                                            <b>Result:</b> R({ramseyM},{ramseyN}) &gt; {graph.vertices.size}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};


const StatusCard = ({ label, value, highlight, status }: { label: string, value: string | number, highlight?: boolean, status?: 'success' | 'error' }) => {
    let valueColor = 'text-slate-900';
    if (highlight) valueColor = 'text-blue-600';
    if (status === 'success') valueColor = 'text-green-600';
    if (status === 'error') valueColor = 'text-red-600';

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
    )
}
