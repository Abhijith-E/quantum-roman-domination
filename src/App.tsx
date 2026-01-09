import { useState, useMemo } from 'react';
import { Graph } from './core/graph/Graph';
import type { RDFValue } from './core/graph/Graph';
import { RDFProblem, SRDFVariant } from './core/graph/RDF';
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas';
import { SolverPanel } from './components/Controls/SolverPanel';
import { ProblemTypeSelector } from './components/Controls/ProblemTypeSelector';

function App() {
  const [graph] = useState(() => new Graph());
  const [, setVersion] = useState(0); // To trigger re-renders on graph mutations
  const [assignment, setAssignment] = useState<Map<number, RDFValue>>(new Map());
  const [mode, setMode] = useState<'edit' | 'assign'>('edit');

  const [isSigned, setIsSigned] = useState(false);
  const [variant, setVariant] = useState<SRDFVariant>(SRDFVariant.C_Weighted);

  const problem = useMemo(() => {
    // If not signed, use PositiveOnly to mimic standard RDF where all edges are 'friendly'
    // (Assuming user hasn't created negative edges, but even if they did, standard RDF usually ignores sign? 
    //  Actually standard RDF on signed graph is undefined. We treat all edges as positive.)
    return new RDFProblem(graph, isSigned ? variant : SRDFVariant.A_PositiveOnly);
  }, [graph, isSigned, variant]);

  const handleGraphChange = () => {
    setVersion(v => v + 1);
  };

  const handleClear = () => {
    graph.clear();
    setAssignment(new Map());
    setVersion(v => v + 1);
  };

  const handleLoadTemplate = (type: 'P5' | 'C6' | 'Grid3x3') => {
    graph.clear();
    let newGraph: Graph;
    if (type === 'P5') newGraph = Graph.createPath(5);
    else if (type === 'C6') {
      newGraph = new Graph();
      // C6 logic
      const r = 150;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
        if (i > 0) newGraph.addEdge(i - 1, i);
      }
      newGraph.addEdge(5, 0);
    }
    else {
      // Grid 3x3
      newGraph = new Graph();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const id = r * 3 + c;
          newGraph.addVertex(id, `v${id}`, 200 + c * 100, 200 + r * 100);
          if (c > 0) newGraph.addEdge(id - 1, id);
          if (r > 0) newGraph.addEdge(id - 3, id);
        }
      }
    }

    // Copy to our state graph (mutating the existing instance or replacing it?)
    // Since our graph state is a const reference, we must mutate or use a new one.
    // Better to just replace the properties of the existing one or update the state if we didn't use `[graph] = useState(() => new Graph())`.
    // Actually, since I used a memoized instance, I should probably copy the data over.

    graph.vertices = newGraph.vertices;
    graph.edges = newGraph.edges;
    graph.adjacency = newGraph.adjacency;

    setAssignment(new Map());
    setVersion(v => v + 1);
  };

  const isValid = problem.isValid(assignment);
  const weight = problem.calculateWeight(assignment);
  const violations = problem.getViolations(assignment).length;
  // We can add attack checks here if we want to show them purely for info
  // Even if !isSigned, user might want to see? No, only valid for Signed.
  // We don't have getAttackConflicts exposed yet in the interface used here? 
  // It is there in RDFProblem class.
  // Note: getAttackConflicts returns Edge[].
  const attacks = isSigned ? problem.getAttackConflicts(assignment).length : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Quantum-Inspired RDF Solver</h1>
        <p className="text-slate-600">Roman Dominating Function Problem Visualization</p>
      </header>

      <div className="flex gap-6 items-start">
        {/* Main Canvas Area */}
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('edit')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${mode === 'edit' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Edit Graph
              </button>
              <button
                onClick={() => setMode('assign')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${mode === 'assign' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Assign Values
              </button>
            </div>
            <div className="text-sm text-slate-500">
              {mode === 'edit'
                ? 'Click: Add Node | Drag: Move | Shift+Drag: Connect | Click Edge: Toggle Sign | Right-Click: Delete'
                : 'Click node to cycle value (0->1->2)'}
            </div>
          </div>

          <GraphCanvas
            graph={graph}
            assignment={assignment}
            onGraphChange={handleGraphChange}
            onAssignmentChange={setAssignment}
            mode={mode}
          />
          {/* Validation Details Panel (New) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2">Validation Status</h3>
            <div className="flex gap-4 text-sm">
              <div className={`flex items-center gap-1 ${violations === 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Undefended Vertices:</span>
                <span className="font-bold">{violations}</span>
              </div>
              {isSigned && (
                <div className={`flex items-center gap-1 ${attacks === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  <span>Attack Conflicts:</span>
                  <span className="font-bold">{attacks}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-6">

          <ProblemTypeSelector
            isSigned={isSigned} setSigned={setIsSigned}
            variant={variant} setVariant={setVariant}
          />

          {/* Stats Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Problem Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Vertices</span>
                <span className="font-mono font-bold">{graph.vertices.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Edges</span>
                <span className="font-mono font-bold">{graph.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Weight</span>
                <span className="font-mono font-bold text-lg text-blue-600">{weight}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Valid RDF?</span>
                <span className={`font-bold px-2 py-0.5 rounded text-sm ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isValid ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="mb-6">
            <SolverPanel
              graph={graph}
              variant={isSigned ? variant : undefined}
              onSolutionFound={(newAssignment) => {
                setAssignment(newAssignment);
              }}
            />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Actions</h2>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleLoadTemplate('P5')} className="px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded">Path P5</button>
                <button onClick={() => handleLoadTemplate('C6')} className="px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded">Cycle C6</button>
                <button onClick={() => handleLoadTemplate('Grid3x3')} className="px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded">Grid 3x3</button>
              </div>

              <div className="h-4"></div>
              <button onClick={handleClear} className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors">
                Clear Graph
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
