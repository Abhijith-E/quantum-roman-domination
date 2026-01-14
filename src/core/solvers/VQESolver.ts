import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem, SRDFVariant } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';
import { QuantumCircuit } from '../quantum/QuantumCircuit';

export class VQESolver implements Solver {
    name = "Quantum VQE";
    layers = 1; // Optimized for demonstration speed
    maxIterations = 100; // Reduced from 200 for faster feedback

    a = 0.1;
    c = 0.1;
    A = 20;
    alpha = 0.602;
    gamma = 0.101;

    async solve(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph, variant); // Use variant

        if (graph.vertices.size > 10) {
            throw new Error("VQE currently limited to 10 vertices (20 qubits).");
        }

        // Circuit construction currently hardcoded for basic entanglement. 
        // Ideally update QuantumCircuit.createRDFAnsatz to be SRDF-aware (anti-correlation for negative).
        // For now, we use the standard ansatz but optimize against the SRDF cost function.
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
                else { valid = false; assignment.set(v, 0); }
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
                    cost = 100;
                } else {
                    // Here we use the variant-aware cost function!
                    cost = problem.calculateTotalCost(assignment, 15);
                }
                expectedEnergy += probs[i] * cost;
            }
            return expectedEnergy;
        };

        // SPSA Loop
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

            if (k % 10 === 0) {
                const currentE = evaluate(params);
                if (currentE < bestEnergy) {
                    bestEnergy = currentE;
                    bestParams = [...params];
                }
            }
        }

        // Final
        const finalState = circuit.run(bestParams);
        const finalProbs = finalState.getProbabilities();

        let bestFinalAssignment = new Map<number, RDFValue>();
        let minWeight = Infinity;
        let bestProb = -1;

        // Default to all 0s (safeguard)
        for (const v of graph.vertices.keys()) bestFinalAssignment.set(v, 0);

        // Robust Post-Processing: Find Best VALID State
        // Instead of just taking max probability, we look for the lowest weight valid solution 
        // that appeared with reasonable probability (e.g. > 0.001 or top K).

        let foundValid = false;

        for (let i = 0; i < finalProbs.length; i++) {
            if (finalProbs[i] < 1e-5) continue; // Ignore noise

            const assignment = decode(i);
            if (assignment) {
                const isValid = problem.isValid(assignment);
                const weight = problem.calculateWeight(assignment);

                // Logic:
                // 1. Prioritize Validity.
                // 2. If both valid, prioritize Lower Weight.
                // 3. If weights equal, prioritize Higher Probability.

                if (isValid) {
                    if (!foundValid) {
                        // First valid found
                        foundValid = true;
                        minWeight = weight;
                        bestProb = finalProbs[i];
                        bestFinalAssignment = assignment;
                    } else {
                        // Compare with existing valid
                        if (weight < minWeight) {
                            minWeight = weight;
                            bestProb = finalProbs[i];
                            bestFinalAssignment = assignment;
                        } else if (weight === minWeight && finalProbs[i] > bestProb) {
                            bestProb = finalProbs[i];
                            bestFinalAssignment = assignment;
                        }
                    }
                } else if (!foundValid) {
                    // If we haven't found ANY valid yet, keep track of "most likely invalid" 
                    // or just "best effort" (max prob)
                    if (finalProbs[i] > bestProb) {
                        bestProb = finalProbs[i];
                        bestFinalAssignment = assignment;
                        // Don't update minWeight since it's invalid
                    }
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
