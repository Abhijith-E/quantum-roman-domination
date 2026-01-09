import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class GreedySolver implements Solver {
    name = "Greedy Heuristic";

    async solve(graph: Graph): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph);

        // Initialize all to 0
        const assignment = new Map<number, RDFValue>();
        for (const v of graph.vertices.values()) {
            assignment.set(v.id, 0);
        }

        let undefendedExist = true;
        while (undefendedExist) {
            // Find set of vertices that are currently undefended
            const undefendedVertices: number[] = [];
            for (const v of graph.vertices.values()) {
                if (assignment.get(v.id) === 0 && !this.isDefended(graph, v.id, assignment)) {
                    undefendedVertices.push(v.id);
                }
            }

            if (undefendedVertices.length === 0) {
                undefendedExist = false;
                break;
            }

            let bestCandidate = -1;
            let maxCovered = -1;

            for (const v of graph.vertices.values()) {
                if (assignment.get(v.id) === 2) continue; // Already 2

                const coveredInfo = this.simulateSet2(graph, v.id, assignment);
                if (coveredInfo > maxCovered) {
                    maxCovered = coveredInfo;
                    bestCandidate = v.id;
                }
            }

            if (bestCandidate !== -1) {
                assignment.set(bestCandidate, 2);
            } else {
                assignment.set(undefendedVertices[0], 2);
            }
        }

        // Optimization: Redundant 2s -> 0
        for (const v of graph.vertices.values()) {
            if (assignment.get(v.id) === 2) {
                assignment.set(v.id, 0);
                if (!problem.isValid(assignment)) {
                    assignment.set(v.id, 2); // Revert
                }
            }
        }

        // Optimization: 2s -> 1
        for (const v of graph.vertices.values()) {
            if (assignment.get(v.id) === 2) {
                assignment.set(v.id, 1);
                if (!problem.isValid(assignment)) {
                    assignment.set(v.id, 2); // Revert
                }
            }
        }

        const endTime = performance.now();
        return {
            assignment,
            weight: problem.calculateWeight(assignment),
            isValid: problem.isValid(assignment),
            executionTimeMs: endTime - startTime
        };
    }

    private isDefended(graph: Graph, vId: number, assignment: Map<number, RDFValue>): boolean {
        const val = assignment.get(vId) ?? 0;
        if (val !== 0) return true;

        const neighbors = graph.getNeighbors(vId);
        return neighbors.some(n => (assignment.get(n) ?? 0) === 2);
    }

    private simulateSet2(graph: Graph, candidateId: number, currentAssignment: Map<number, RDFValue>): number {
        let newDefendedCount = 0;

        // Check candidate itself
        if (!this.isDefended(graph, candidateId, currentAssignment)) {
            newDefendedCount++;
        }

        // Check neighbors
        for (const nId of graph.getNeighbors(candidateId)) {
            if (!this.isDefended(graph, nId, currentAssignment)) {
                newDefendedCount++;
            }
        }
        return newDefendedCount;
    }
}
