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
        // Variant C has specific global rules
        if (this.variant === SRDFVariant.C_Weighted) {
            for (const [vId] of this.graph.vertices) {
                const f_v = assignment.get(vId) ?? 0;

                // Rule (i): If f(v) = 0, must be adj to f(u)=2 with positive edge
                if (f_v === 0) {
                    if (!this.hasPositiveStrongNeighbor(vId, assignment)) {
                        return false;
                    }
                }

                // Rule (ii): f(u) + Σ f(v)σ(uv) >= 1
                if (!this.satisfiesWeightCondition(vId, assignment)) {
                    return false;
                }
            }
            return true;
        }

        // Standard logic for other variants (and Classic typically falls here if graph is unsigned/positive)
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;
            if (val === 0) {
                if (!this.isDefended(vId, assignment)) {
                    return false;
                }
            }
        }
        return true;
    }

    // Helper for Rule (i)
    hasPositiveStrongNeighbor(vId: number, assignment: Map<number, RDFValue>): boolean {
        const neighbors = this.graph.getNeighbors(vId);
        return neighbors.some(nId => {
            const edge = this.graph.getEdge(vId, nId);
            const nVal = assignment.get(nId) ?? 0;
            return nVal === 2 && edge?.sign === 1;
        });
    }

    // Helper for Rule (ii)
    satisfiesWeightCondition(vId: number, assignment: Map<number, RDFValue>): boolean {
        const f_v = assignment.get(vId) ?? 0;
        let sum = 0;
        const neighbors = this.graph.getNeighbors(vId);

        for (const nId of neighbors) {
            const edge = this.graph.getEdge(vId, nId);
            const val = assignment.get(nId) ?? 0;
            const sign = edge?.sign ?? 1;
            sum += val * sign;
        }

        return (f_v + sum) >= 1;
    }

    getDefenseScore(vId: number, assignment: Map<number, RDFValue>): number {
        // This method is primarily used by isDefended/Cost for legacy variants.
        // For Variant C, we use specific helpers.
        const neighbors = this.graph.getNeighbors(vId);

        switch (this.variant) {
            case SRDFVariant.A_PositiveOnly: {
                let count = 0;
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const nVal = assignment.get(nId) ?? 0;
                    if (edge?.sign === 1 && nVal === 2) count++;
                }
                return count;
            }
            case SRDFVariant.B_Blocking: {
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
                return posDef - negBlock;
            }
            case SRDFVariant.C_Weighted: {
                // Legacy support or fallback? 
                // Using Condition (ii) LHS as "Score" for visualization if needed.
                const f_v = assignment.get(vId) ?? 0;
                let sum = 0;
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const val = assignment.get(nId) ?? 0;
                    const sign = edge?.sign ?? 1;
                    sum += val * sign;
                }
                return f_v + sum;
            }
            case SRDFVariant.D_Distance:
            default:
                let count = 0;
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const nVal = assignment.get(nId) ?? 0;
                    if (edge?.sign === 1 && nVal === 2) count++;
                }
                return count;
        }
    }

    isDefended(vId: number, assignment: Map<number, RDFValue>): boolean {
        // For Variant C, this concept is split into two rules.
        // This generic method might be used by legacy calls.
        if (this.variant === SRDFVariant.C_Weighted) {
            const f_v = assignment.get(vId) ?? 0;
            if (f_v === 0 && !this.hasPositiveStrongNeighbor(vId, assignment)) return false;
            if (!this.satisfiesWeightCondition(vId, assignment)) return false;
            return true;
        }

        const score = this.getDefenseScore(vId, assignment);

        switch (this.variant) {
            case SRDFVariant.A_PositiveOnly:
                return score >= 1;
            case SRDFVariant.B_Blocking:
                return score >= 1;
            default:
                return score >= 1;
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
            if (this.variant === SRDFVariant.C_Weighted) {
                // Check Rule (i)
                const f_v = assignment.get(vId) ?? 0;
                if (f_v === 0 && !this.hasPositiveStrongNeighbor(vId, assignment)) {
                    violations.push(vId);
                    continue; // Already a violation
                }
                // Check Rule (ii)
                if (!this.satisfiesWeightCondition(vId, assignment)) {
                    violations.push(vId);
                }
            } else {
                // Legacy
                const val = assignment.get(vId) ?? 0;
                if (val === 0) {
                    if (!this.isDefended(vId, assignment)) {
                        violations.push(vId);
                    }
                }
            }
        }
        // Unique
        return Array.from(new Set(violations));
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
        let violations = 0; // Count of violating vertices
        let deficitPenalty = 0;

        // Weight
        for (const val of assignment.values()) {
            weight += val;
        }

        // Constraints
        if (this.variant === SRDFVariant.C_Weighted) {
            for (const [vId] of this.graph.vertices) {
                let isViolating = false;
                const f_v = assignment.get(vId) ?? 0;

                // Rule (i) Penalty
                if (f_v === 0) {
                    if (!this.hasPositiveStrongNeighbor(vId, assignment)) {
                        isViolating = true;
                        // Binary penalty for structural fail
                        violations++;
                    }
                }

                // Rule (ii) Penalty
                // f(v) + Σ f(u)σ(uv) >= 1
                // Deficit = 1 - LHS
                let sum = 0;
                const neighbors = this.graph.getNeighbors(vId);
                for (const nId of neighbors) {
                    const edge = this.graph.getEdge(vId, nId);
                    const val = assignment.get(nId) ?? 0;
                    const sign = edge?.sign ?? 1;
                    sum += val * sign;
                }
                const lhs = f_v + sum;
                if (lhs < 1) {
                    if (!isViolating) violations++; // Count vertex only once for 'count' metric
                    const deficit = 1 - lhs;
                    deficitPenalty += deficit * 5; // Weighted penalty
                }
            }
        } else {
            // Legacy / Basic logic
            for (const [vId] of this.graph.vertices) {
                const val = assignment.get(vId) ?? 0;
                if (val === 0) {
                    const score = this.getDefenseScore(vId, assignment);
                    let needed = 1;
                    if (this.variant === SRDFVariant.B_Blocking) needed = 1;

                    if (score < needed) {
                        violations++;
                        const deficit = needed - score;
                        deficitPenalty += deficit * 5;
                    }
                }
            }
        }

        // Only use attack conflicts for A/B? Or if requested?
        // User didn't verify Rule (ii) covers 'attacks'. 
        // Rule (ii) effectively penalizes attacks (neg edges reduce sum). 
        // So explicit attack penalty might be double counting or incorrect for C.
        // I will omit explicit attack penalty for C.
        let attacks = 0;
        if (this.variant !== SRDFVariant.C_Weighted) {
            const conflictEdges = this.getAttackConflicts(assignment);
            attacks = conflictEdges.length;
        }

        const attackPenaltyCost = this.attackWeight * 10;

        return weight + (violations * penalty) + deficitPenalty + (attacks * attackPenaltyCost);
    }
}
