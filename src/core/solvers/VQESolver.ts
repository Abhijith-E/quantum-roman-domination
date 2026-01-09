import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem } from '../graph/RDF';
import type { Solver, SolverResult } from '../solvers/Solver';
import { QuantumCircuit } from '../quantum/QuantumCircuit';

export class VQESolver implements Solver {
    name = "Quantum VQE";
    layers = 2; // Depth of circuit
    maxIterations = 200;

    // SPSA parameters
    a = 0.1;
    c = 0.1;
    A = 20; // Stability constant
    alpha = 0.602;
    gamma = 0.101;

    async solve(graph: Graph): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph);

        if (graph.vertices.size > 10) {
            throw new Error("VQE currently limited to 10 vertices (20 qubits) for browser simulation performance.");
        }

        const circuit = QuantumCircuit.createRDFAnsatz(graph, this.layers);
        let params = new Array(circuit.numParams).fill(0).map(() => Math.random() * 2 * Math.PI);

        let bestEnergy = Infinity;
        let bestParams = [...params];

        const decode = (index: number): Map<number, RDFValue> | null => {
            const assignment = new Map<number, RDFValue>();
            const vertices = Array.from(graph.vertices.keys()).sort((a, b) => a - b);

            let valid = true;
            vertices.forEach((v, i) => {
                const b0 = (index >> (i * 2)) & 1;
                const b1 = (index >> (i * 2 + 1)) & 1;

                const valCode = (b1 << 1) | b0;

                if (valCode === 0) assignment.set(v, 0);
                else if (valCode === 1) assignment.set(v, 1);
                else if (valCode === 2) assignment.set(v, 2);
                else {
                    valid = false;
                    assignment.set(v, 0);
                }
            });

            return valid ? assignment : null;
        };

        const evaluate = (parameters: number[]): number => {
            const qs = circuit.run(parameters);
            const probs = qs.getProbabilities();

            let expectedEnergy = 0;
            for (let i = 0; i < probs.length; i++) {
                if (probs[i] < 1e-6) continue;

                const assignment = decode(i);
                let cost = 0;
                if (!assignment) {
                    cost = 100; // Invalid encoding penalty
                } else {
                    cost = problem.calculateTotalCost(assignment, 15);
                }
                expectedEnergy += probs[i] * cost;
            }
            return expectedEnergy;
        };

        for (let k = 0; k < this.maxIterations; k++) {
            const ak = this.a / Math.pow(k + 1 + this.A, this.alpha);
            const ck = this.c / Math.pow(k + 1, this.gamma);

            const delta = params.map(() => Math.random() < 0.5 ? 1 : -1);

            const paramsPlus = params.map((p, i) => p + ck * delta[i]);
            const paramsMinus = params.map((p, i) => p - ck * delta[i]);

            const yPlus = evaluate(paramsPlus);
            const yMinus = evaluate(paramsMinus);

            const g = (yPlus - yMinus) / (2 * ck);

            params = params.map((p, i) => p - ak * g * delta[i]);

            if (graph.vertices.size <= 5 || k % 10 === 0) {
                const currentE = evaluate(params);
                if (currentE < bestEnergy) {
                    bestEnergy = currentE;
                    bestParams = [...params];
                }
            }
        }

        // Final check
        const currentE = evaluate(bestParams);
        if (currentE < bestEnergy) bestEnergy = currentE;

        // Final Sampling
        const finalState = circuit.run(bestParams);
        const finalProbs = finalState.getProbabilities();

        let maxProb = -1;
        let bestFinalAssignment = new Map<number, RDFValue>();
        for (const v of graph.vertices.keys()) bestFinalAssignment.set(v, 0);

        for (let i = 0; i < finalProbs.length; i++) {
            if (finalProbs[i] > maxProb) {
                const assignment = decode(i);
                if (assignment) {
                    maxProb = finalProbs[i];
                    bestFinalAssignment = assignment;
                }
            }
        }

        const endTime = performance.now();
        return {
            assignment: bestFinalAssignment,
            weight: problem.calculateWeight(bestFinalAssignment),
            isValid: problem.isValid(bestFinalAssignment),
            executionTimeMs: endTime - startTime,
            iterations: this.maxIterations
        };
    }
}
