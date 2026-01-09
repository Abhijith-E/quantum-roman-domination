import React, { useState } from 'react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';
import type { Solver } from '../../core/solvers/Solver';
import { GreedySolver } from '../../core/solvers/GreedySolver';
import { BruteForceSolver } from '../../core/solvers/BruteForceSolver';
import { SimulatedAnnealingSolver } from '../../core/solvers/SimulatedAnnealingSolver';
import { GeneticAlgorithmSolver } from '../../core/solvers/GeneticAlgorithmSolver';
import { VQESolver } from '../../core/solvers/VQESolver';

interface SolverPanelProps {
    graph: Graph;
    onSolutionFound: (assignment: Map<number, RDFValue>, weight: number, timeMs: number) => void;
}

export const SolverPanel: React.FC<SolverPanelProps> = ({ graph, onSolutionFound }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [selectedAlgo, setSelectedAlgo] = useState<string>('Greedy');
    const [lastStats, setLastStats] = useState<{ time: number, weight: number, algo: string } | null>(null);

    const algorithms: Record<string, () => Solver> = {
        'Greedy': () => new GreedySolver(),
        'Simulated Annealing': () => new SimulatedAnnealingSolver(),
        'Genetic Algorithm': () => new GeneticAlgorithmSolver(),
        'Quantum VQE (max 10 nodes)': () => new VQESolver(),
        'Brute Force (max 12 nodes)': () => new BruteForceSolver(),
    };

    const handleRun = async () => {
        if (selectedAlgo.startsWith('Brute') && graph.vertices.size > 12) {
            alert("Graph too large for Brute Force (max 12 nodes)");
            return;
        }
        if (selectedAlgo.startsWith('Quantum') && graph.vertices.size > 10) {
            alert("Graph too large for Quantum Simulator (max 10 nodes)");
            return;
        }

        setIsRunning(true);
        await new Promise(r => setTimeout(r, 100));

        try {
            const solverFactory = algorithms[selectedAlgo];
            const solver = solverFactory();
            const result = await solver.solve(graph);

            onSolutionFound(result.assignment, result.weight, result.executionTimeMs);
            setLastStats({
                time: result.executionTimeMs,
                weight: result.weight,
                algo: selectedAlgo
            });
        } catch (e) {
            console.error(e);
            alert("Error running algorithm: " + e);
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
                    </select>
                </div>

                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors ${isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isRunning ? 'Running...' : 'Run Optimization'}
                </button>

                {lastStats && (
                    <div className="mt-4 p-3 bg-slate-50 rounded text-sm border border-slate-100">
                        <p className="font-semibold text-slate-700 mb-1">Last Run Result:</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <span className="text-slate-500">Algorithm:</span>
                            <span>{lastStats.algo}</span>
                            <span className="text-slate-500">Weight:</span>
                            <span className="font-bold text-blue-600">{lastStats.weight}</span>
                            <span className="text-slate-500">Time:</span>
                            <span>{lastStats.time.toFixed(2)}ms</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
