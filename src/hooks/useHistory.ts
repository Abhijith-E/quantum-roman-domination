import { useState, useEffect } from 'react';
import type { Graph, RDFValue } from '../core/graph/Graph';
import type { SRDFVariant } from '../core/graph/RDF';

export interface HistoryItem {
    id: string;
    timestamp: number;
    variant: string;
    weight: number;
    isValid: boolean;
    verticesCount: number;
    edgesCount: number;
    graphData: {
        vertices: { id: number, x: number, y: number }[];
        edges: { source: number, target: number, sign: number }[];
    };
    assignment: Record<number, RDFValue>;
}

export const useHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('rdf_history_v1');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const saveToHistory = (
        graph: Graph,
        assignment: Map<number, RDFValue>,
        variant: SRDFVariant | 'Classic',
        weight: number,
        isValid: boolean
    ) => {
        const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            variant: variant.toString(),
            weight,
            isValid,
            verticesCount: graph.vertices.size,
            edgesCount: graph.edges.length,
            graphData: {
                vertices: Array.from(graph.vertices.values()).map(v => ({ id: v.id, x: v.x, y: v.y })),
                edges: graph.edges.map(e => ({ source: e.source, target: e.target, sign: e.sign }))
            },
            assignment: Object.fromEntries(assignment)
        };

        const newHistory = [newItem, ...history];
        setHistory(newHistory);
        localStorage.setItem('rdf_history_v1', JSON.stringify(newHistory));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('rdf_history_v1');
    };

    return { history, saveToHistory, clearHistory };
};
