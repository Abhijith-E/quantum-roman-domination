import { Graph } from '../graph/Graph';
import type { RDFValue } from '../graph/Graph';
import { SRDFVariant } from '../graph/RDF';

export interface SolverResult {
    assignment: Map<number, RDFValue>;
    weight: number;
    isValid: boolean;
    executionTimeMs: number;
    iterations?: number;
}

export interface Solver {
    solve(graph: Graph, variant?: SRDFVariant): Promise<SolverResult>;
    name: string;
}
