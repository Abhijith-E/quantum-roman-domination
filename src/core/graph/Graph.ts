export interface Vertex {
    id: number;
    label: string;
    x: number;
    y: number;
}

export interface Edge {
    source: number; // vertex id
    target: number; // vertex id
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

    addVertex(id: number, label: string, x: number = 0, y: number = 0): void {
        if (this.vertices.has(id)) return;
        this.vertices.set(id, { id, label, x, y });
        this.adjacency.set(id, []);
    }

    addEdge(source: number, target: number): void {
        if (!this.vertices.has(source) || !this.vertices.has(target)) return;
        if (source === target) return; // No loops

        // Check if edge already exists
        const exists = this.edges.some(e =>
            (e.source === source && e.target === target) ||
            (e.source === target && e.target === source)
        );
        if (exists) return;

        this.edges.push({ source, target });
        this.adjacency.get(source)?.push(target);
        this.adjacency.get(target)?.push(source);
    }

    getNeighbors(id: number): number[] {
        return this.adjacency.get(id) || [];
    }

    getVertex(id: number): Vertex | undefined {
        return this.vertices.get(id);
    }

    removeVertex(id: number): void {
        if (!this.vertices.has(id)) return;

        // Remove edges connected to this vertex
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id);

        // Update adjacency lists
        this.adjacency.delete(id);
        this.adjacency.forEach((neighbors, vId) => {
            this.adjacency.set(vId, neighbors.filter(n => n !== id));
        });

        this.vertices.delete(id);
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
