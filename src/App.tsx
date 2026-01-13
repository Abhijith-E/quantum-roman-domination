import { useState, useMemo } from 'react';
import { Graph } from './core/graph/Graph';
import type { RDFValue } from './core/graph/Graph';
import { RDFProblem, SRDFVariant } from './core/graph/RDF';
import { ComplexGraphGenerator } from './core/graph/ComplexGraphGenerator';

// Layout Imports
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

// Views
import { DashboardView } from './components/Views/DashboardView';
import { HistoryView } from './components/Views/HistoryView';
import { SettingsView } from './components/Views/SettingsView';

// Hooks
import { useHistory } from './hooks/useHistory';

function App() {
  const [graph] = useState(() => new Graph());
  const [, setVersion] = useState(0);
  const [assignment, setAssignment] = useState<Map<number, RDFValue>>(new Map());
  const [mode, setMode] = useState<'edit' | 'assign'>('edit');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSigned, setIsSigned] = useState(false);
  const [variant, setVariant] = useState<SRDFVariant>(SRDFVariant.C_Weighted);

  // Hooks
  const { history, saveToHistory, clearHistory } = useHistory();

  // Problem Logic
  const problem = useMemo(() => {
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

  const handleLoadTemplate = (type: 'P5' | 'C6' | 'Grid3x3' | 'K14' | 'K20' | 'K50' | 'K100' | 'Geo60') => {
    graph.clear();
    let newGraph: Graph;
    if (type === 'P5') newGraph = Graph.createPath(5);
    else if (type === 'C6') {
      newGraph = new Graph();
      const r = 150;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
        if (i > 0) newGraph.addEdge(i - 1, i);
      }
      newGraph.addEdge(5, 0);
    }
    else if (type === 'K14') {
      newGraph = new Graph();
      const r = 200;
      // Add vertices in circle
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
      }
      // Connect all pairs (Complete Graph)
      for (let i = 0; i < 14; i++) {
        for (let j = i + 1; j < 14; j++) {
          newGraph.addEdge(i, j);
        }
      }
    }
    else if (type === 'K20') {
      newGraph = new Graph();
      const r = 220;
      // Add vertices in circle
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
      }
      // Connect all pairs (Complete Graph)
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          newGraph.addEdge(i, j);
        }
      }
    }
    else if (type === 'K50') {
      newGraph = new Graph();
      const r = 250;
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
      }
      for (let i = 0; i < 50; i++) {
        for (let j = i + 1; j < 50; j++) {
          newGraph.addEdge(i, j);
        }
      }
    }
    else if (type === 'K100') {
      newGraph = new Graph();
      const r = 280;
      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * 2 * Math.PI;
        newGraph.addVertex(i, `v${i}`, 400 + r * Math.cos(angle), 300 + r * Math.sin(angle));
      }
      for (let i = 0; i < 100; i++) {
        for (let j = i + 1; j < 100; j++) {
          newGraph.addEdge(i, j);
        }
      }
    }
    else if (type === 'Geo60') {
      const { graph: g, description, rdfTriples } = ComplexGraphGenerator.generateGeopolitics();
      newGraph = g;
      // Ideally we would show the description/RDF to the user.
      // For now, logging to console as "Output"
      console.log("=== SCENARIO DESCRIPTION ===");
      console.log(description);
      console.log("=== RDF TRIPLES ===");
      console.log(rdfTriples.join('\n'));
      // We could also store this in a state if we added a UI modal.
    }
    else {
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
    graph.vertices = newGraph.vertices;
    graph.edges = newGraph.edges;
    graph.adjacency = newGraph.adjacency;
    setAssignment(new Map());
    setVersion(v => v + 1);
  };

  const isValid = problem.isValid(assignment);
  const weight = problem.calculateWeight(assignment);
  const violations = problem.getViolations(assignment).length;
  const attacks = isSigned ? problem.getAttackConflicts(assignment).length : 0;

  // Intercept solution found to save to history
  const handleSolutionFound = (newAssignment: Map<number, RDFValue>, finalWeight: number) => {
    setAssignment(newAssignment);
    // Auto-save to history
    saveToHistory(
      graph,
      newAssignment,
      isSigned ? variant : 'Classic',
      finalWeight,
      problem.isValid(newAssignment)
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* 1. Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Area */}
      <main className="flex-1 flex flex-col h-full ml-64 relative z-0">
        <Header title={activeTab === 'dashboard' ? 'Solver Dashboard' : (activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} />

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">

          {/* VIEW ROUTER */}
          {activeTab === 'dashboard' && (
            <DashboardView
              graph={graph}
              assignment={assignment}
              setAssignment={setAssignment}
              mode={mode}
              setMode={setMode}
              isSigned={isSigned}
              setIsSigned={setIsSigned}
              variant={variant}
              setVariant={setVariant}
              onGraphChange={handleGraphChange}
              onClear={handleClear}
              onLoadTemplate={handleLoadTemplate}
              onSolutionFound={handleSolutionFound}
              problem={problem}
              weight={weight}
              violations={violations}
              attacks={attacks}
              isValid={isValid}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView history={history} onClear={clearHistory} />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
