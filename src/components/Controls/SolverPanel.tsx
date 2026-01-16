import React, { useState } from 'react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';
import type { Solver } from '../../core/solvers/Solver';
import { GreedySolver } from '../../core/solvers/GreedySolver';
import { BruteForceSolver } from '../../core/solvers/BruteForceSolver';
import { SimulatedAnnealingSolver } from '../../core/solvers/SimulatedAnnealingSolver';
import { GeneticAlgorithmSolver } from '../../core/solvers/GeneticAlgorithmSolver';
import { VQESolver } from '../../core/solvers/VQESolver';
import { SRDFVariant } from '../../core/graph/RDF';

interface SolverPanelProps {
    graph: Graph;
    variant?: SRDFVariant;
    onSolutionFound: (assignment: Map<number, RDFValue>, weight: number, timeMs: number, algo: string) => void;
}

export const SolverPanel: React.FC<SolverPanelProps> = ({ graph, variant, onSolutionFound }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [selectedAlgo, setSelectedAlgo] = useState<string>('Greedy');
    const [lastStats, setLastStats] = useState<{ time: number, weight: number, algo: string, jobId?: string, backend?: string } | null>(null);
    // Placeholder for IBM Quantum API Token - User will replace this with their actual key
    const IBM_API_TOKEN = "REPLACE_WITH_YOUR_IBM_QUANTUM_API_TOKEN";

    const algorithms: Record<string, () => Solver> = {
        'Greedy': () => new GreedySolver(),
        'Simulated Annealing': () => new SimulatedAnnealingSolver(),
        'Genetic Algorithm': () => new GeneticAlgorithmSolver(),
        'Quantum VQE (Local Sim)': () => new VQESolver(),
        'Brute Force (max 60 nodes - WARNING: WILL CRASH)': () => new BruteForceSolver(),
    };

    const handleRun = async () => {
        setIsRunning(true);
        setLastStats(null);
        await new Promise(r => setTimeout(r, 100));

        try {
            if (selectedAlgo === 'Real IBM Quantum') {
                // Measure execution time including network/queue overhead
                const startTime = performance.now();

                // Call Python Backend
                const response = await fetch('http://127.0.0.1:5001/run-ibm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiToken: IBM_API_TOKEN,
                        graph: {
                            vertices: Array.from(graph.vertices.values()),
                            edges: graph.edges
                        },
                        variant: variant
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Backend request failed");
                }

                const data = await response.json();

                const endTime = performance.now();
                const totalTime = endTime - startTime;

                // Convert object assignment back to Map
                const newAssignment = new Map<number, RDFValue>();
                for (const [key, val] of Object.entries(data.assignment)) {
                    newAssignment.set(Number(key), Number(val) as RDFValue);
                }

                // Since backend just returns assignment, we calc weight here
                let w = 0;
                newAssignment.forEach(v => w += v);

                const algoName = `IBM Quantum (${data.backend})`;
                onSolutionFound(newAssignment, w, totalTime, algoName);
                setLastStats({
                    time: totalTime,
                    weight: w,
                    algo: algoName,
                    jobId: data.jobId,
                    backend: data.backend
                });
            } else {
                if (selectedAlgo.startsWith('Brute') && graph.vertices.size > 60) {
                    throw new Error("Graph too large for Brute Force (max 60 nodes)");
                }
                if (selectedAlgo.startsWith('Quantum VQE (Local') && graph.vertices.size > 10) {
                    throw new Error("Graph too large for Quantum Simulator (max 10 nodes)");
                }

                const solverFactory = algorithms[selectedAlgo];
                const solver = solverFactory();
                const result = await solver.solve(graph, variant);

                onSolutionFound(result.assignment, result.weight, result.executionTimeMs, selectedAlgo);
                setLastStats({
                    time: result.executionTimeMs,
                    weight: result.weight,
                    algo: selectedAlgo
                });
            }
        } catch (e: any) {
            console.error("Solver Error:", e);
            if (e instanceof TypeError && e.message.includes('fetch')) {
                alert("❌ Connection Error: Failed to reach the backend server.\n\n" +
                    "Please ensure the Python backend is running on http://127.0.0.1:5001\n" +
                    "Try running: python backend/app.py");
            } else {
                alert("Error: " + (e.message || e));
            }
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Run Algorithms</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Algorithm</label>
                    <select
                        value={selectedAlgo}
                        onChange={(e) => setSelectedAlgo(e.target.value)}
                        disabled={isRunning}
                        className="w-full rounded-md border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border"
                    >
                        {Object.keys(algorithms).map(algo => (
                            <option key={algo} value={algo}>{algo}</option>
                        ))}
                        <option value="Real IBM Quantum">Real IBM Quantum (Hardware)</option>
                    </select>
                </div>

                {selectedAlgo.startsWith('Quantum VQE (Local') && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                        Running on Local Simulator. Max 10 Nodes.
                    </div>
                )}

                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors ${isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isRunning ? 'Processing...' : 'Run Optimization'}
                </button>

                {lastStats && (
                    <div className="mt-4 p-3 bg-slate-50 rounded text-sm border border-slate-100">
                        <p className="font-semibold text-slate-700 mb-1">Last Run Result:</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <span className="text-slate-500">Algorithm:</span>
                            <span className="break-words text-xs">{lastStats.algo}</span>

                            <span className="text-slate-500">Weight:</span>
                            <span className="font-bold text-blue-600">{lastStats.weight}</span>

                            <span className="text-slate-500">Time:</span>
                            <span>{lastStats.time.toFixed(0)}ms</span>

                            {lastStats.jobId && (
                                <>
                                    <span className="text-slate-500">Job ID:</span>
                                    <span className="font-mono text-xs">{lastStats.jobId.slice(0, 8)}...</span>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
