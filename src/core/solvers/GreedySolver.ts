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
        while (changed) {
            changed = false;
            const undefended = problem.getViolations(assignment);

            if (undefended.length === 0) break;

            // Pick an undefended vertex
            // Heuristic: Pick one with max positive neighbors to maximize "bang for buck"?
            // Or pick one with ANY positive neighbor?
            const v = undefended[0]; // Simple selection

            // Try to find a neighbor to set to 2
            const neighbors = graph.getNeighbors(v);

            // Prefer setting a neighbor that is already 1 or 2? No, 2 is already defending.
            // Prefer setting a neighbor that covers MOST undefended vertices.

            let bestCandidate = -1;
            let maxCover = -1;

            // Candidates: v itself (set to 1 or 2) OR favorable neighbors (set to 2)
            // Option A: Set f(v) = 1 (Weight +1, defends v)
            // Option B: Set f(v) = 2 (Weight +2, defends v + positive neighbors)
            // Option C: Set f(u) = 2 (Weight +2, defends u + positive neighbors including v)

            // Let's try to set a neighbor u to 2 if feasible
            for (const u of neighbors) {
                // Check edge sign if variant requires positive
                const edge = graph.getEdge(v, u);
                const isPositive = edge?.sign === 1;

                // If variant A or C, usually need positive edge to defend.
                // If variant B, positive edge defends but negative blocks.

                // Simplified: Just look for a positive neighbor to upgrade
                if (isPositive) {
                    // Evaluate impact
                    if ((assignment.get(u) ?? 0) < 2) {
                        // hypothetically set to 2
                        assignment.set(u, 2);
                        const newViolations = problem.getViolations(assignment).length;
                        assignment.set(u, 0); // revert

                        const profit = undefended.length - newViolations;
                        if (profit > maxCover) {
                            maxCover = profit;
                            bestCandidate = u;
                        }
                    }
                }
            }

            // Also consider setting v itself to 1 or 2
            // Setting v=1 costs 1, covers v
            // Setting v=2 costs 2, covers v + neighbors

            // ... Logic can get complex. 
            // Fallback: If no good neighbor, set v=1 (self-defense)
            if (bestCandidate !== -1 && maxCover > 0) {
                assignment.set(bestCandidate, 2);
                changed = true;
            } else {
                // Try setting v=2?
                assignment.set(v, 2);
                // If that doesn't work (e.g. massive negative attacks?), try v=1?
                if (!problem.isValid(assignment)) {
                    // check if v is still violation
                    if (problem.getViolations(assignment).includes(v)) {
                        // 2 didn't fix it? (maybe blocking constraint)
                        // Try 1?
                        assignment.set(v, 1);
                    }
                }
                changed = true;
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
