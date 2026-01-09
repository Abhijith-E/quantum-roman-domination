import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem, SRDFVariant } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class SimulatedAnnealingSolver implements Solver {
    name = "Simulated Annealing";
    initialTemp = 100;
    coolingRate = 0.995;
    minTemp = 0.1;

    async solve(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph, variant);

        let currentAssignment = new Map<number, RDFValue>();
        // Random init
        for (const v of graph.vertices.keys()) {
            currentAssignment.set(v, Math.floor(Math.random() * 3) as RDFValue);
        }

        // Cost: Weight + 10 * Violations + Attacks
        // RDFProblem.calculateTotalCost handles this
        let currentCost = problem.calculateTotalCost(currentAssignment, 20);

        let bestAssignment = new Map(currentAssignment);
        let bestCost = currentCost;

        let temp = this.initialTemp;

        while (temp > this.minTemp) {
            // Neighbor: Change one vertex
            const neighborAssignment = new Map(currentAssignment);
            const vertices = Array.from(graph.vertices.keys());
            const v = vertices[Math.floor(Math.random() * vertices.length)];

            const oldVal = neighborAssignment.get(v) ?? 0;
            let newVal = oldVal;
            while (newVal === oldVal) {
                newVal = Math.floor(Math.random() * 3) as RDFValue;
            }
            neighborAssignment.set(v, newVal);

            const neighborCost = problem.calculateTotalCost(neighborAssignment, 20);

            const delta = neighborCost - currentCost;

            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                currentAssignment = neighborAssignment;
                currentCost = neighborCost;

                if (currentCost < bestCost) {
                    bestCost = currentCost;
                    bestAssignment = new Map(currentAssignment);
                }
            }

            temp *= this.coolingRate;

            // Optimization: if perfect solution found (valid, low weight), could stop? 
            // Hard to know what is 'optimal'.
        }

        const endTime = performance.now();
        return {
            assignment: bestAssignment,
            weight: problem.calculateWeight(bestAssignment),
            isValid: problem.isValid(bestAssignment),
            executionTimeMs: endTime - startTime
        };
    }
}
