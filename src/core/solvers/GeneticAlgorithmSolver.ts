import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem, SRDFVariant } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class GeneticAlgorithmSolver implements Solver {
    name = "Genetic Algorithm";
    popSize = 50;
    generations = 100;
    mutationRate = 0.1;

    async solve(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph, variant);

        let population: Map<number, RDFValue>[] = [];
        const vertices = Array.from(graph.vertices.keys());

        // Init population
        for (let i = 0; i < this.popSize; i++) {
            const sol = new Map<number, RDFValue>();
            for (const v of vertices) sol.set(v, Math.floor(Math.random() * 3) as RDFValue);
            population.push(sol);
        }

        for (let g = 0; g < this.generations; g++) {
            // Sort by fitness (cost)
            population.sort((a, b) => problem.calculateTotalCost(a, 20) - problem.calculateTotalCost(b, 20));

            // Elitism: keep top 20%
            const nextPop = population.slice(0, Math.floor(this.popSize * 0.2));

            while (nextPop.length < this.popSize) {
                // Select parents
                const p1 = population[Math.floor(Math.random() * (this.popSize / 2))];
                const p2 = population[Math.floor(Math.random() * (this.popSize / 2))];

                // Crossover
                const child = new Map<number, RDFValue>();
                const crossoverPoint = Math.floor(Math.random() * vertices.length);

                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i];
                    if (i < crossoverPoint) child.set(v, p1.get(v)!);
                    else child.set(v, p2.get(v)!);
                }

                // Mutation
                if (Math.random() < this.mutationRate) {
                    const idx = Math.floor(Math.random() * vertices.length);
                    const v = vertices[idx];
                    child.set(v, Math.floor(Math.random() * 3) as RDFValue);
                }

                nextPop.push(child);
            }
            population = nextPop;
        }

        // Return best
        population.sort((a, b) => problem.calculateTotalCost(a, 20) - problem.calculateTotalCost(b, 20));
        const best = population[0];

        const endTime = performance.now();
        return {
            assignment: best,
            weight: problem.calculateWeight(best),
            isValid: problem.isValid(best),
            executionTimeMs: endTime - startTime,
            iterations: this.generations
        };
    }
}
