
/**
 * Bron-Kerbosch algorithm with pivoting
 * Finds maximal cliques in an undirected graph
 */
export class BronKerbosch {
    /**
     * Finds the largest clique in the graph defined by the adjacency list
     * @param vertices List of vertex IDs
     * @param adjacency Map of vertex ID -> List of neighbor IDs
     * @returns The largest clique found (list of vertex IDs)
     */
    static findMaxClique(vertices: number[], adjacency: Map<number, number[]>): number[] {
        let maxClique: number[] = [];

        // R: Current clique being built
        // P: Candidate vertices that can extend the clique
        // X: Excluded vertices (already processed)

        const bronKerbosch = (R: number[], P: number[], X: number[]) => {
            if (P.length === 0 && X.length === 0) {
                // R is a maximal clique
                if (R.length > maxClique.length) {
                    maxClique = [...R];
                }
                return;
            }

            // Optimization: If current clique R + potential candidates P cannot beat maxClique, prune
            if (R.length + P.length <= maxClique.length) {
                return;
            }

            // Pivot selection: Choose pivot u from P U X
            // To minimize recursive calls, we pick u that maximizes |P \ N(u)|
            const pivotCandidates = [...P, ...X];

            // Just pick the first as pivot or pick by max degree in P?
            // Simple pivot: pick first available. Better: pick max degree.
            // Let's implement max degree in P logic if possible, or just first for simplicity.
            // For N<=20, simple pivoting is usually fast enough.

            const u = pivotCandidates[0];
            const neighborsOfU = adjacency.get(u) || [];

            // Candidates to iterate: P \ N(u)
            const candidates = P.filter(v => !neighborsOfU.includes(v));

            for (const v of candidates) {
                const neighborsOfV = adjacency.get(v) || [];

                bronKerbosch(
                    [...R, v],
                    P.filter(n => neighborsOfV.includes(n)),
                    X.filter(n => neighborsOfV.includes(n))
                );

                // Move v from P to X
                P = P.filter(x => x !== v);
                X.push(v);
            }
        };

        bronKerbosch([], [...vertices], []);
        return maxClique;
    }
}
