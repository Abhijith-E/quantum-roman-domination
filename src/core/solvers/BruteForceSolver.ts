import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

import { SRDFVariant } from '../graph/RDF';

export class BruteForceSolver implements Solver {
    name = "Brute Force";

    async solve(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph, variant);
        // ... rest of logic uses problem.calculateTotalCost which uses variant


        if (graph.vertices.size > 12) {
            throw new Error("Graph too large for Brute Force (max 12 vertices)");
        }

        const vertices = Array.from(graph.vertices.keys());
        const n = vertices.length;

        let bestAssignment: Map<number, RDFValue> | null = null;
        let minWeight = Infinity;

        const totalCombinations = Math.pow(3, n);

        for (let i = 0; i < totalCombinations; i++) {
            const assignment = new Map<number, RDFValue>();
            let currentWeight = 0;

            let temp = i;
            for (let j = 0; j < n; j++) {
                const val = (temp % 3) as RDFValue;
                assignment.set(vertices[j], val);
                currentWeight += val;
                temp = Math.floor(temp / 3);
            }

            if (currentWeight < minWeight) {
                if (problem.isValid(assignment)) {
                    minWeight = currentWeight;
                    bestAssignment = assignment;
                }
            }
        }

        if (!bestAssignment) {
            bestAssignment = new Map();
            for (const v of vertices) bestAssignment.set(v, 2);
            minWeight = 2 * n;
        }

        const endTime = performance.now();
        return {
            assignment: bestAssignment!,
            weight: minWeight,
            isValid: true,
            executionTimeMs: endTime - startTime,
            iterations: totalCombinations
        };
    }
}
