
import { Graph } from '../graph/Graph';
import { BronKerbosch } from '../math/BronKerbosch';

export interface RamseyResult {
    found: boolean;
    condition: 'positive' | 'negative' | null;
    clique: number[]; // IDs of vertices in the clique
    size: number;
    target: number;
}

export class RamseyChecker {

    /**
     * Checks if the graph contains a Positive Clique of size m OR a Negative Clique of size n.
     * @param graph The signed graph
     * @param m Target size for Positive Clique (Red)
     * @param n Target size for Negative Clique (Blue)
     */
    static check(graph: Graph, m: number, n: number): RamseyResult {
        const vertices = Array.from(graph.vertices.keys());

        // 1. Check Positive Subgraph
        const posAdjacency = new Map<number, number[]>();
        // Init adjacency
        vertices.forEach(v => posAdjacency.set(v, []));

        // Build subgraphs
        graph.edges.forEach(e => {
            if (e.sign === 1) { // Positive
                posAdjacency.get(e.source)?.push(e.target);
                posAdjacency.get(e.target)?.push(e.source);
            }
        });

        const maxPosClique = BronKerbosch.findMaxClique(vertices, posAdjacency);
        if (maxPosClique.length >= m) {
            return {
                found: true,
                condition: 'positive',
                clique: maxPosClique,
                size: maxPosClique.length,
                target: m
            };
        }

        // 2. Check Negative Subgraph
        const negAdjacency = new Map<number, number[]>();
        vertices.forEach(v => negAdjacency.set(v, []));

        graph.edges.forEach(e => {
            if (e.sign === -1) { // Negative
                negAdjacency.get(e.source)?.push(e.target);
                negAdjacency.get(e.target)?.push(e.source);
            }
        });

        const maxNegClique = BronKerbosch.findMaxClique(vertices, negAdjacency);
        if (maxNegClique.length >= n) {
            return {
                found: true,
                condition: 'negative',
                clique: maxNegClique,
                size: maxNegClique.length,
                target: n
            };
        }

        return {
            found: false,
            condition: null,
            clique: [],
            size: 0,
            target: 0
        };
    }

    /**
     * Heuristic Solver: Tries to find a valid 2-coloring for K_N that AVOIDS Red K_m and Blue K_n.
     * Use this to demonstrate Lower Bounds (e.g. R(3,3) > 5).
     * @param N Number of vertices
     * @param m Target Red Clique Size
     * @param n Target Blue Clique Size
     * @returns Edge list with signs, and success status
     */
    static findCounterExample(N: number, m: number, n: number): { edges: { u: number, v: number, sign: 1 | -1 }[], success: boolean, violations: number } {
        // 1. Initialize Random Coloring
        const edges: { u: number, v: number, sign: 1 | -1 }[] = [];
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                edges.push({ u: i, v: j, sign: Math.random() > 0.5 ? 1 : -1 });
            }
        }

        // Helper: Calculate Cost (Number of Monochromatic Cliques)
        // Optimization: We don't need full BronKerbosch for counting.
        // But for N <= 20, checking subsets is too slow. C(20, 3) = 1140 (OK). C(20, 5) = 15504 (OK).
        // C(N, k) grows fast.
        // Let's use a simpler stochastic local search.

        let bestEdges = JSON.parse(JSON.stringify(edges));
        let bestViolations = Infinity;

        // Iterations
        const maxIters = 5000;

        // Fast Clique Counter for specific size k
        const countCliques = (activeEdges: { u: number, v: number, sign: 1 | -1 }[], k: number, sign: 1 | -1): number => {
            // Build adj
            const adj = new Map<number, Set<number>>();
            for (let i = 0; i < N; i++) adj.set(i, new Set());
            for (const e of activeEdges) {
                if (e.sign === sign) {
                    adj.get(e.u)?.add(e.v);
                    adj.get(e.v)?.add(e.u);
                }
            }

            let count = 0;

            // Recursive simplified search for fixed size k
            const search = (current: number[], candidates: number[]) => {
                if (current.length === k) {
                    count++;
                    return;
                }
                if (current.length + candidates.length < k) return;
                if (count > 0 && k > 5) return; // Optimization: If we just need existence, return early? No, we need count for gradient.

                const u = candidates[0]; // Pivot-ish (simplest)
                if (u === undefined) return;

                // Branch 1: Include u
                const nextCandidates = candidates.slice(1).filter(v => adj.get(u)?.has(v));
                search([...current, u], nextCandidates);

                // Branch 2: Exclude u
                search(current, candidates.slice(1));
            };

            const allV = Array.from({ length: N }, (_, i) => i);
            search([], allV);
            return count;
        };

        // Main Loop
        for (let iter = 0; iter < maxIters; iter++) {
            // 1. Eval current
            const redViolations = countCliques(edges, m, 1);
            const blueViolations = countCliques(edges, n, -1);
            const totalViolations = redViolations + blueViolations;

            if (totalViolations < bestViolations) {
                bestViolations = totalViolations;
                bestEdges = JSON.parse(JSON.stringify(edges));
            }

            if (bestViolations === 0) break; // Found valid coloring!

            // 2. Perturb: Flip a random edge
            const edgeIdx = Math.floor(Math.random() * edges.length);
            edges[edgeIdx].sign = (edges[edgeIdx].sign === 1 ? -1 : 1);

            // 3. Acceptance (Greedy/Hill Climbing directly)
            // If worse, flip back? 
            // Let's do simple Hill Climbing with Restart or allow side-moves?
            // To be simple: If worse, revert. (Strict Hill Climbing)
            // But strict gets stuck. Let's allow if equal.

            const newRed = countCliques(edges, m, 1);
            const newBlue = countCliques(edges, n, -1);
            const newTotal = newRed + newBlue;

            if (newTotal > totalViolations) {
                // Revert
                edges[edgeIdx].sign = (edges[edgeIdx].sign === 1 ? -1 : 1);
            }
            // else: accept (equal or better)
        }

        return {
            edges: bestEdges,
            success: bestViolations === 0,
            violations: bestViolations
        };
    }
}
