import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class GeneticAlgorithmSolver implements Solver {
    name = "Genetic Algorithm";
    populationSize = 100;
    generations = 200;
    mutationRate = 0.05;

    async solve(graph: Graph): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph);

        const vertices = Array.from(graph.vertices.keys());

        let population: Map<number, RDFValue>[] = [];
        for (let i = 0; i < this.populationSize; i++) {
            const gene = new Map<number, RDFValue>();
            for (const v of vertices) {
                gene.set(v, Math.floor(Math.random() * 3) as RDFValue);
            }
            population.push(gene);
        }

        let bestSolution: Map<number, RDFValue> = population[0];
        let bestFitness = -Infinity;

        for (let gen = 0; gen < this.generations; gen++) {
            const fitnessScale = population.map(startMap => {
                const cost = problem.calculateTotalCost(startMap, 20);
                return {
                    gene: startMap,
                    fitness: 1 / (1 + cost),
                    cost
                };
            });

            for (const ind of fitnessScale) {
                if (ind.fitness > bestFitness) {
                    bestFitness = ind.fitness;
                    bestSolution = new Map(ind.gene);
                }
            }

            const newPopulation: Map<number, RDFValue>[] = [];
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.tournamentSelect(fitnessScale);
                const parent2 = this.tournamentSelect(fitnessScale);

                const child = this.crossover(parent1.gene, parent2.gene, vertices);

                this.mutate(child, vertices);

                newPopulation.push(child);
            }
            population = newPopulation;
        }

        const endTime = performance.now();
        return {
            assignment: bestSolution,
            weight: problem.calculateWeight(bestSolution),
            isValid: problem.isValid(bestSolution),
            executionTimeMs: endTime - startTime,
            iterations: this.generations
        };
    }

    private tournamentSelect(population: { gene: Map<number, RDFValue>, fitness: number }[]) {
        const k = 5;
        let best = population[Math.floor(Math.random() * population.length)];
        for (let i = 0; i < k - 1; i++) {
            const cand = population[Math.floor(Math.random() * population.length)];
            if (cand.fitness > best.fitness) best = cand;
        }
        return best;
    }

    private crossover(p1: Map<number, RDFValue>, p2: Map<number, RDFValue>, vertices: number[]) {
        const child = new Map<number, RDFValue>();
        for (const v of vertices) {
            child.set(v, Math.random() < 0.5 ? p1.get(v)! : p2.get(v)!);
        }
        return child;
    }

    private mutate(gene: Map<number, RDFValue>, vertices: number[]) {
        for (const v of vertices) {
            if (Math.random() < this.mutationRate) {
                gene.set(v, Math.floor(Math.random() * 3) as RDFValue);
            }
        }
    }
}
