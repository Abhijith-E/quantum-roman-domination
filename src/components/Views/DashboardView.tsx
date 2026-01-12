import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';
import { SRDFVariant, RDFProblem } from '../../core/graph/RDF';
import { GraphCanvas } from '../GraphCanvas/GraphCanvas';
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
    onLoadTemplate: (t: 'P5' | 'C6' | 'Grid3x3') => void;
    // Callback for when solver finds solution (to trigger parent side effects like history save)
    onSolutionFound: (assignment: Map<number, RDFValue>, weight: number, time: number) => void;
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

    return (
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto animate-fade-in-up">

            {/* LEFT COLUMN: Graph Editor */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                {/* Toolbar */}
                <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('edit')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'edit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Plus size={16} /> Edit Structure
                        </button>
                        <button
                            onClick={() => setMode('assign')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'assign' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Edit3 size={16} /> Assign Values
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pr-2">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-2">Templates:</span>
                        {['P5', 'C6', 'Grid3x3'].map(t => (
                            <button key={t} onClick={() => onLoadTemplate(t as any)} className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                {t}
                            </button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-2"></div>
                        <button onClick={onClear} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Clear All">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Canvas Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur text-xs px-2 py-1 rounded border border-slate-200 shadow-sm pointer-events-none">
                        {mode === 'edit'
                            ? 'Click: Add Node | Drag: Move | Shift+Drag: Connect | Click Edge: Toggle Sign | Right-Click: Delete'
                            : 'Click node to cycle value (0 → 1 → 2)'}
                    </div>
                    <GraphCanvas
                        graph={graph}
                        assignment={assignment}
                        onGraphChange={onGraphChange}
                        onAssignmentChange={setAssignment}
                        mode={mode}
                    />
                </div>

                {/* Quick Status Bar */}
                <div className="grid grid-cols-4 gap-4">
                    <StatusCard label="Vertices" value={graph.vertices.size} />
                    <StatusCard label="Edges" value={graph.edges.length} />
                    <StatusCard label="Current Weight" value={weight} highlight />
                    <StatusCard label="Validation" value={isValid ? "VALID" : "INVALID"} status={isValid ? 'success' : 'error'} />
                </div>
            </div>

            {/* RIGHT COLUMN: Controls & Analysis */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

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
                    onSolutionFound={onSolutionFound}
                />

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
