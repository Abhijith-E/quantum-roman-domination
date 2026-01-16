export interface Vertex {
    id: number;
    label: string;
    x: number;
    y: number;
    metadata?: Record<string, any>; // For rich attributes (Type, Role, Priority)
}

export interface Edge {
    source: number; // vertex id
    target: number; // vertex id
    sign: 1 | -1;   // +1 = positive (friend), -1 = negative (enemy)
    metadata?: Record<string, any>; // For rich attributes (Relation, Weight)
}

export type RDFValue = 0 | 1 | 2;

export class Graph {
    vertices: Map<number, Vertex>;
    edges: Edge[];
    adjacency: Map<number, number[]>;

    constructor() {
        this.vertices = new Map();
        this.edges = [];
        this.adjacency = new Map();
    }

    addVertex(id: number, label: string, x: number = 0, y: number = 0, metadata?: Record<string, any>): void {
        if (this.vertices.has(id)) return;
        this.vertices.set(id, { id, label, x, y, metadata });
        this.adjacency.set(id, []);
    }

    addEdge(source: number, target: number, sign: 1 | -1 = 1, _metadata?: Record<string, any>): void {
        if (!this.vertices.has(source) || !this.vertices.has(target)) return;
        if (source === target) return; // No loops

        // Check if edge already exists
        const exists = this.edges.find(e =>
            (e.source === source && e.target === target) ||
            (e.source === target && e.target === source)
        );
        if (exists) {
            // Update existing sign if added again? Or just return?
            // Let's update sign if explicitly called again
            exists.sign = sign;
            return;
        }

        this.edges.push({ source, target, sign });
        this.adjacency.get(source)?.push(target);
        this.adjacency.get(target)?.push(source);
    }

    getEdge(u: number, v: number): Edge | undefined {
        return this.edges.find(e =>
            (e.source === u && e.target === v) ||
            (e.source === v && e.target === u)
        );
    }

    toggleEdgeSign(u: number, v: number): void {
        const edge = this.getEdge(u, v);
        if (edge) {
            edge.sign = (edge.sign === 1 ? -1 : 1);
        }
    }

    removeVertex(id: number): void {
        this.vertices.delete(id);
        this.adjacency.delete(id);

        // Remove connected edges
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id);

        // Remove from neighbor lists
        this.adjacency.forEach((neighbors, vId) => {
            this.adjacency.set(vId, neighbors.filter(n => n !== id));
        });
    }

    removeEdge(u: number, v: number): void {
        this.edges = this.edges.filter(e =>
            !((e.source === u && e.target === v) || (e.source === v && e.target === u))
        );

        // Update adjacency
        const uNeighbors = this.adjacency.get(u);
        if (uNeighbors) {
            this.adjacency.set(u, uNeighbors.filter(n => n !== v));
        }

        const vNeighbors = this.adjacency.get(v);
        if (vNeighbors) {
            this.adjacency.set(v, vNeighbors.filter(n => n !== u));
        }
    }

    getNeighbors(id: number): number[] {
        return this.adjacency.get(id) || [];
    }

    getVertex(id: number): Vertex | undefined {
        return this.vertices.get(id);
    }



    clear(): void {
        this.vertices.clear();
        this.edges = [];
        this.adjacency.clear();
    }

    // Predefined shapes
    static createPath(n: number): Graph {
        const g = new Graph();
        for (let i = 0; i < n; i++) {
            g.addVertex(i, `v${i}`, 100 + i * 100, 300);
            if (i > 0) g.addEdge(i - 1, i);
        }
        return g;
    }
}
