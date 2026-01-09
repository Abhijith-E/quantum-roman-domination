import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class SimulatedAnnealingSolver implements Solver {
    name = "Simulated Annealing";
    iterations = 10000;
    initialTemp = 100;
    coolingRate = 0.995;

    async solve(graph: Graph): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph);

        let currentAssignment = new Map<number, RDFValue>();
        for (const v of graph.vertices.keys()) {
            currentAssignment.set(v, Math.floor(Math.random() * 3) as RDFValue);
        }

        let currentEnergy = problem.calculateTotalCost(currentAssignment);

        let bestAssignment = new Map(currentAssignment);
        let bestEnergy = currentEnergy;

        let temp = this.initialTemp;
        const keys = Array.from(graph.vertices.keys());

        for (let i = 0; i < this.iterations; i++) {
            if (keys.length === 0) break;
            const randomV = keys[Math.floor(Math.random() * keys.length)];

            const oldVal = currentAssignment.get(randomV) ?? 0;
            let newVal: RDFValue = oldVal;
            while (newVal === oldVal) {
                newVal = Math.floor(Math.random() * 3) as RDFValue;
            }

            const nextAssignment = new Map(currentAssignment);
            nextAssignment.set(randomV, newVal);

            const nextEnergy = problem.calculateTotalCost(nextAssignment);
            const delta = nextEnergy - currentEnergy;

            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                currentAssignment = nextAssignment;
                currentEnergy = nextEnergy;

                if (currentEnergy < bestEnergy) {
                    bestEnergy = currentEnergy;
                    bestAssignment = new Map(currentAssignment);
                }
            }

            temp *= this.coolingRate;
        }

        const endTime = performance.now();
        return {
            assignment: bestAssignment,
            weight: problem.calculateWeight(bestAssignment),
            isValid: problem.isValid(bestAssignment),
            executionTimeMs: endTime - startTime,
            iterations: this.iterations
        };
    }
}
