import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { RDFProblem, SRDFVariant } from '../graph/RDF';
import type { Solver, SolverResult } from './Solver';

export class GreedySolver implements Solver {
    name = "Greedy Heuristic";

    async solve(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted): Promise<SolverResult> {
        const startTime = performance.now();
        const problem = new RDFProblem(graph, variant);
        const assignment = new Map<number, RDFValue>();

        // Initialize all to 0
        for (const vId of graph.vertices.keys()) {
            assignment.set(vId, 0);
        }

        // Greedy Step 1: Cover undefended vertices
        // Sort vertices by degree (descending) or some heuristic? 
        // For SRDF, we might want to prioritize vertices that are hard to defend (few positive neighbors).

        // Simple heuristic: Iterate and defend
        let changed = true;
        let iterations = 0;
        const MAX_ITERATIONS = 1000; // Safety brake

        while (changed && iterations < MAX_ITERATIONS) {
            changed = false;
            iterations++;
            const undefended = problem.getViolations(assignment);

            if (undefended.length === 0) break;

            // Iterate through all violations to find one we can fix
            for (const v of undefended) {
                // Try to find a neighbor to set to 2
                const neighbors = graph.getNeighbors(v);
                let bestCandidate = -1;
                let maxCover = -1;

                // 1. Look for helpful neighbor
                for (const u of neighbors) {
                    const edge = graph.getEdge(v, u);
                    const isPositive = edge?.sign === 1;

                    if (isPositive) {
                        if ((assignment.get(u) ?? 0) < 2) {
                            // Test upgrade
                            assignment.set(u, 2);
                            // const newViolations = problem.getViolations(assignment).length;
                            assignment.set(u, 0); // Revert (assuming it was 0? Safer to store prev val)
                            // Actually, greedy usually assumes we flip 0->2. 
                            // If u was 1, we should revert to 1.
                            // Let's rely on standard greedy flow: usually starts at 0.
                            // But safer:
                            const prevU = assignment.get(u) ?? 0;
                            assignment.set(u, 2);
                            const currentViolations = problem.getViolations(assignment).length;
                            assignment.set(u, prevU);

                            const profit = undefended.length - currentViolations;
                            if (profit > maxCover) {
                                maxCover = profit;
                                bestCandidate = u;
                            }
                        }
                    }
                }

                // 2. Apply best neighbor move if found
                if (bestCandidate !== -1 && maxCover > 0) {
                    assignment.set(bestCandidate, 2);
                    changed = true;
                    break; // Restart loop to refreshing violations
                }

                // 3. Fallback: Try upgrading v itself
                const currentV = assignment.get(v) ?? 0;
                if (currentV < 2) {
                    assignment.set(v, 2);
                    changed = true;
                    break;
                }

                // If v is already 2 and violation persists (e.g. negative neighbors dominate?), 
                // we move to next v in 'undefended'. We don't verify 'changed' here.
            }
        }

        // Optimization Phase: Try to reduce values while maintaining validity
        // 2 -> 1, 1 -> 0, 2 -> 0
        // Iterate multiple times
        for (let i = 0; i < 2; i++) {
            for (const v of graph.vertices.keys()) {
                const current = assignment.get(v) ?? 0;
                if (current > 0) {
                    // Try reducing
                    const reduced = (current - 1) as RDFValue;
                    assignment.set(v, reduced);

                    // Check cost/validity
                    // If invalid, revert
                    if (!problem.isValid(assignment)) {
                        assignment.set(v, current);
                    } else {
                        // Valid reduction! But does it increase attack penalties?
                        // calculateTotalCost includes penalties.
                        const costAfter = problem.calculateTotalCost(assignment);
                        assignment.set(v, current);
                        const costBefore = problem.calculateTotalCost(assignment);

                        if (costAfter < costBefore) {
                            assignment.set(v, reduced);
                        }
                    }
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
}
