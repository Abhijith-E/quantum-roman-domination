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

  const handleLoadTemplate = (type: 'P5' | 'C6' | 'K14' | 'K20' | 'K50' | 'K100' | 'Geo60' | 'Diamond11' | 'jamesreshma20') => {
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
    else if (type === 'Diamond11') {
      newGraph = new Graph();
      const cx = 400;
      const cy = 300;

      // Custom "Vertical Diamond" Layout (11 Nodes)
      // Matches user description & image logic.

      // CENTRAL HUB
      newGraph.addVertex(10, "v10", cx, cy);

      // VERTICAL AXIS NODES
      newGraph.addVertex(2, "v2", cx, cy - 100);
      newGraph.addVertex(7, "v7", cx, cy + 100);
      newGraph.addVertex(9, "v9", cx, cy - 200); // Top Tip
      newGraph.addVertex(8, "v8", cx, cy + 200); // Bottom Tip

      // LEFT SIDE
      newGraph.addVertex(1, "v1", cx - 80, cy - 80);
      newGraph.addVertex(0, "v0", cx - 120, cy);
      newGraph.addVertex(6, "v6", cx - 80, cy + 80);

      // RIGHT SIDE
      newGraph.addVertex(3, "v3", cx + 80, cy - 80);
      newGraph.addVertex(4, "v4", cx + 120, cy);
      newGraph.addVertex(5, "v5", cx + 80, cy + 80);

      // 1. POSITIVE EDGES (Green)
      // v10 connected to ring (v0..v7)
      // Explicitly requested: v0->v10, v4->v10 (covered here)
      [0, 1, 2, 3, 4, 5, 6, 7].forEach(id => newGraph.addEdge(10, id, 1));

      // 2. NEGATIVE EDGES (Red)
      // Inner Ring Loop: 1-2-3-4-5-7-6-0-1
      const ring = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 7], [7, 6], [6, 0], [0, 1]];
      ring.forEach(([u, v]) => newGraph.addEdge(u, v, -1));

      // Outer Connections
      newGraph.addEdge(9, 1, -1);
      newGraph.addEdge(9, 3, -1);
      newGraph.addEdge(8, 6, -1);
      newGraph.addEdge(8, 5, -1);

      // NEW Outer Requests
      newGraph.addEdge(2, 9, -1); // "node v2 to node v9 there is a negative edge"
      newGraph.addEdge(7, 8, -1); // "node v7 to v8 there is a negative edge"

      // Cross Connections
      newGraph.addEdge(0, 4, -1); // "node v0 to v4 there is a negative edge" (Existing)
      newGraph.addEdge(0, 2, -1); // Top Left Cross
      newGraph.addEdge(4, 2, -1); // Top Right Cross

      // NEW Internal Requests
      newGraph.addEdge(7, 4, -1); // "node v7 to v4 there is a negative edge"
      newGraph.addEdge(7, 0, -1); // "node v7 to v0 there is a negative edge"
    }
    else if (type === 'jamesreshma20') {
      newGraph = new Graph();
      // CYCLE 1: Nodes v0 to v7 (8 nodes)
      const cx1 = 250, cy1 = 300, r1 = 120;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * 2 * Math.PI - Math.PI / 2;
        newGraph.addVertex(i, `v${i}`, cx1 + r1 * Math.cos(angle), cy1 + r1 * Math.sin(angle));
      }
      // Node v18 in center
      newGraph.addVertex(18, "v18", cx1, cy1);

      // Negative Edges Cycle 1
      const c1_neg = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]];
      c1_neg.forEach(([u, v]) => newGraph.addEdge(u, v, -1));

      // Chords Negative Cycle 1
      const c1_chords = [[1, 3], [3, 5], [5, 7], [7, 1], [2, 4], [4, 6], [6, 0], [0, 2]];
      c1_chords.forEach(([u, v]) => newGraph.addEdge(u, v, -1));

      // Center v18 connections
      newGraph.addEdge(18, 7, -1);
      newGraph.addEdge(18, 6, -1);
      [0, 1, 2, 3, 4, 5].forEach(v => newGraph.addEdge(18, v, 1));

      // CYCLE 2: Nodes v8 to v17 (10 nodes)
      const cx2 = 650, cy2 = 300, r2 = 120;
      for (let i = 8; i <= 17; i++) {
        const angle = ((i - 8) / 10) * 2 * Math.PI - Math.PI / 2;
        newGraph.addVertex(i, `v${i}`, cx2 + r2 * Math.cos(angle), cy2 + r2 * Math.sin(angle));
      }
      // Node v19 in center
      newGraph.addVertex(19, "v19", cx2, cy2);

      // Negative Edges Cycle 2
      for (let i = 8; i <= 17; i++) {
        const next = i === 17 ? 8 : i + 1;
        newGraph.addEdge(i, next, -1);
      }

      // Chords Negative Cycle 2
      const c2_chords = [[8, 10], [10, 12], [12, 14], [14, 16], [16, 8], [9, 11], [11, 13], [13, 15], [15, 17], [17, 9]];
      c2_chords.forEach(([u, v]) => newGraph.addEdge(u, v, -1));

      // Center v19 connections
      newGraph.addEdge(19, 11, -1);
      newGraph.addEdge(19, 16, -1);
      [17, 8, 9, 10, 12, 13, 14, 15].forEach(v => newGraph.addEdge(19, v, 1));

      // INTER-CYCLE CONNECTIONS (Positive)
      const inter = [[7, 16], [7, 19], [7, 11], [6, 16], [6, 19], [6, 11]];
      inter.forEach(([u, v]) => newGraph.addEdge(u, v, 1));
    }
    else {
      newGraph = new Graph();
      // Default to a small path if something goes wrong
      newGraph = Graph.createPath(3);
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
  const handleSolutionFound = (
    newAssignment: Map<number, RDFValue>,
    finalWeight: number,
    timeTaken: number,
    algo: string,
    screenshot: string | null
  ) => {
    setAssignment(newAssignment);
    // Auto-save to history
    saveToHistory(
      graph,
      newAssignment,
      isSigned ? variant : 'Classic',
      finalWeight,
      problem.isValid(newAssignment),
      algo,
      timeTaken,
      screenshot
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
