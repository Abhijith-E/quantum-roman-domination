import { Graph } from './Graph';
import type { RDFValue } from './Graph';

export class RDFProblem {
    graph: Graph;

    constructor(graph: Graph) {
        this.graph = graph;
    }

    isValid(assignment: Map<number, RDFValue>): boolean {
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;

            // Condition: if f(v) = 0, must have neighbor u with f(u) = 2
            if (val === 0) {
                const neighbors = this.graph.getNeighbors(vId);
                const hasDefender = neighbors.some(nId => (assignment.get(nId) ?? 0) === 2);
                if (!hasDefender) {
                    return false;
                }
            }
        }
        return true;
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
                const neighbors = this.graph.getNeighbors(vId);
                const hasDefender = neighbors.some(nId => (assignment.get(nId) ?? 0) === 2);
                if (!hasDefender) {
                    violations.push(vId);
                }
            }
        }
        return violations;
    }

    calculateTotalCost(assignment: Map<number, RDFValue>, penalty: number = 10): number {
        let weight = 0;
        let violations = 0;

        // Weight component
        for (const val of assignment.values()) {
            weight += val;
        }

        // Violation component
        for (const [vId] of this.graph.vertices) {
            const val = assignment.get(vId) ?? 0;
            if (val === 0) {
                const neighbors = this.graph.getNeighbors(vId);
                const hasDefender = neighbors.some(nId => (assignment.get(nId) ?? 0) === 2);
                if (!hasDefender) {
                    violations++;
                }
            }
        }

        return weight + (violations * penalty);
    }
}
