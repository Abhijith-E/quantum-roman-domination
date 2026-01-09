import { Graph } from './Graph';
import type { RDFValue, Edge } from './Graph';

export const SRDFVariant = {
    A_PositiveOnly: 'A_PositiveOnly',
    B_Blocking: 'B_Blocking',
    C_Weighted: 'C_Weighted', // Recommended
    D_Distance: 'D_Distance'
} as const;

export type SRDFVariant = typeof SRDFVariant[keyof typeof SRDFVariant];

export class RDFProblem {
    graph: Graph;
    variant: SRDFVariant;

    // Variant C params
    threshold: number = 1;
    attackWeight: number = 1.0;

    constructor(graph: Graph, variant: SRDFVariant = SRDFVariant.C_Weighted) {
        this.graph = graph;
        this.variant = variant;
    }

    isValid(assignment: Map<number, RDFValue>): boolean {
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;

            // Only check constraints for f(v)=0
            // In SRDF, generally vertices with f(v)=0 need defense.
            if (val === 0) {
                if (!this.isDefended(vId, assignment)) {
                    return false;
                }
            }
        }
        return true;
    }

    isDefended(vId: number, assignment: Map<number, RDFValue>): boolean {
        const neighbors = this.graph.getNeighbors(vId);

        switch (this.variant) {
            case SRDFVariant.A_PositiveOnly: {
                // Rule: Must have at least one positive neighbor with f(u)=2
                return neighbors.some(nId => {
                    const edge = this.graph.getEdge(vId, nId);
                    const nVal = assignment.get(nId) ?? 0;
                    return edge?.sign === 1 && nVal === 2;
                });
            }
            case SRDFVariant.B_Blocking: {
                // Rule: |PosDefenders| > |NegBlockers|
                let posDef = 0;
                let negBlock = 0;
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const nVal = assignment.get(nId) ?? 0;
                    if (nVal === 2) {
                        if (edge?.sign === 1) posDef++;
                        if (edge?.sign === -1) negBlock++;
                    }
                }
                return posDef > negBlock;
            }
            case SRDFVariant.C_Weighted: {
                // Defense Score = f(v) + ΣPos(u) - α·ΣNeg(u). But here f(v)=0.
                // Score = Σ_{u∈N+(v)} f(u) - α·Σ_{w∈N-(v)} f(w) >= threshold ?
                // Usually definition is about neighbors with f=2 providing +1 or weighted amount?
                // Text says: Defense(v) = Σ[u∈N+(v), f(u)=2] 1 - Σ[u∈N-(v), f(u)=2] 1
                // And we check if Defense >= threshold.

                let score = 0;
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const nVal = assignment.get(nId) ?? 0;
                    // Assuming only f=2 contributes to defense logic usually, but Prompt says:
                    // defense_score = +pos_neighbors - neg_neigh (implicitly counting defenders?)
                    // Let's stick to standard RDF intuition: only 2s defend. 1s defend themselves.

                    if (nVal === 2) {
                        if (edge?.sign === 1) score += 1;
                        if (edge?.sign === -1) score -= 1; // Or weighted by attackWeight?
                    }
                }
                // Variant C text: "Each positive edge contributes +1... each negative edge -1"
                return score >= this.threshold;
            }
            case SRDFVariant.D_Distance:
                // Placeholder for complex multi-hop
                // Fallback to A for now
                return this.isDefended(vId, assignment);
        }
    }

    calculateWeight(assignment: Map<number, RDFValue>): number {
        let weight = 0;
        for (const val of assignment.values()) {
            weight += val;
        }
        return weight;
    }

    getViolations(assignment: Map<number, RDFValue>): number[] {
        const violations: number[] = [];
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;
            if (val === 0) {
                if (!this.isDefended(vId, assignment)) {
                    violations.push(vId);
                }
            }
        }
        return violations;
    }

    // Check for Attack Conflicts (negative edge with both ends having f=2)
    getAttackConflicts(assignment: Map<number, RDFValue>): Edge[] {
        const conflicts: Edge[] = [];
        for (const edge of this.graph.edges) {
            if (edge.sign === -1) {
                const v1Val = assignment.get(edge.source) ?? 0;
                const v2Val = assignment.get(edge.target) ?? 0;
                if (v1Val === 2 && v2Val === 2) {
                    conflicts.push(edge);
                }
            }
        }
        return conflicts;
    }

    calculateTotalCost(assignment: Map<number, RDFValue>, penalty: number = 10): number {
        let weight = 0;
        let violations = 0;
        let attacks = 0;

        // Weight component
        for (const val of assignment.values()) {
            weight += val;
        }

        // Violation component (Undefended vertices)
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;
            if (val === 0 && !this.isDefended(vId, assignment)) {
                violations++;
            }
        }

        // Attack component (Negative edges with 2-2 conflict)
        // Only if Attack Penalty is enabled? 
        // Prompt says: H_attack = α · Σ_{(i,j)∈E⁻} x_{i,0} · x_{j,0} (which corresponds to f=2)
        // Let's add attack penalty
        const conflictEdges = this.getAttackConflicts(assignment);
        attacks = conflictEdges.length;

        // Total
        // violation penalty is usually high (hard constraint)
        // attack penalty is soft or hard depending on variant settings
        // For now treating attacks also as penalties.
        const attackPenalty = this.attackWeight * 10; // e.g.

        return weight + (violations * penalty) + (attacks * attackPenalty);
    }
}
