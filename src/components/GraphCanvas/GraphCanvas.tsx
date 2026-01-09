import { useRef, useEffect, useState, useCallback } from 'react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';

interface GraphCanvasProps {
    graph: Graph;
    assignment: Map<number, RDFValue>;
    onGraphChange: () => void;
    onAssignmentChange: (newAssignment: Map<number, RDFValue>) => void;
    mode: 'edit' | 'assign'; // 'edit' = add/move nodes/edges, 'assign' = change colors
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
    graph,
    assignment,
    onGraphChange,
    onAssignmentChange,
    mode
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggedVertexId, setDraggedVertexId] = useState<number | null>(null);
    const [hoveredVertexId, setHoveredVertexId] = useState<number | null>(null);

    // For edge creation
    const [edgeStartVertexId, setEdgeStartVertexId] = useState<number | null>(null);

    // Constants
    const NODE_RADIUS = 20;
    const SELECTION_COLOR = '#3b82f6'; // blue-500
    const EDGE_COLOR = '#94a3b8'; // slate-400

    // Color mapping for RDF values
    const getVertexColor = (val: RDFValue) => {
        switch (val) {
            case 2: return '#22c55e'; // green-500 (Defending)
            case 1: return '#eab308'; // yellow-500 (Defended)
            case 0: return '#ffffff'; // white (Undefended/Needs defense)
            default: return '#ffffff';
        }
    };

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw edges
        ctx.lineWidth = 2;
        ctx.strokeStyle = EDGE_COLOR;
        graph.edges.forEach(edge => {
            const v1 = graph.getVertex(edge.source);
            const v2 = graph.getVertex(edge.target);
            if (v1 && v2) {
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
            }
        });

        // Draw active edge creation line
        if (edgeStartVertexId !== null) {
            const v1 = graph.getVertex(edgeStartVertexId);
            if (v1 && hoveredVertexId === null) {
                // We'd need mouse pos here to draw to cursor, but simpler to just draw to hovered vertex if any
            }
        }

        // Draw vertices
        graph.vertices.forEach(vertex => {
            const val = assignment.get(vertex.id) ?? 0;

            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, NODE_RADIUS, 0, 2 * Math.PI);

            // Fill
            ctx.fillStyle = getVertexColor(val);
            ctx.fill();

            // Border
            ctx.lineWidth = 2;
            ctx.strokeStyle = (hoveredVertexId === vertex.id || edgeStartVertexId === vertex.id)
                ? SELECTION_COLOR
                : '#000000';
            ctx.stroke();

            // Label
            ctx.fillStyle = '#000000';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(vertex.label, vertex.x, vertex.y);

            // Value badge (small)
            ctx.beginPath();
            ctx.arc(vertex.x + 15, vertex.y - 15, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.fillText(val.toString(), vertex.x + 15, vertex.y - 15);
        });

    }, [graph, assignment, hoveredVertexId, edgeStartVertexId]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    // Handle Interactions
    const getVertexAtPos = (x: number, y: number) => {
        for (const vertex of graph.vertices.values()) {
            const dx = vertex.x - x;
            const dy = vertex.y - y;
            if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
                return vertex.id;
            }
        }
        return null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const vId = getVertexAtPos(x, y);

        if (vId !== null) {
            if (mode === 'assign') {
                // Cycle value: 0 -> 1 -> 2 -> 0
                const currentVal = assignment.get(vId) ?? 0;
                const newVal = ((currentVal + 1) % 3) as RDFValue;
                const newAssignment = new Map(assignment);
                newAssignment.set(vId, newVal);
                onAssignmentChange(newAssignment);
            } else if (e.shiftKey) {
                // Start creating edge
                setEdgeStartVertexId(vId);
            } else {
                // Start dragging
                setDraggedVertexId(vId);
            }
        } else {
            // Click on empty space: Add vertex
            if (mode === 'edit') {
                const newId = graph.vertices.size > 0 ? Math.max(...graph.vertices.keys()) + 1 : 0;
                graph.addVertex(newId, `v${newId}`, x, y);
                onGraphChange();
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const vId = getVertexAtPos(x, y);
        setHoveredVertexId(vId); // For highlighting

        if (draggedVertexId !== null) {
            const v = graph.getVertex(draggedVertexId);
            if (v) {
                v.x = x;
                v.y = y;
                onGraphChange(); // Trigger redraw
            }
        }
    };

    const handleMouseUp = () => {
        if (edgeStartVertexId !== null && hoveredVertexId !== null && edgeStartVertexId !== hoveredVertexId) {
            // Create edge
            graph.addEdge(edgeStartVertexId, hoveredVertexId);
            onGraphChange();
        }

        setDraggedVertexId(null);
        setEdgeStartVertexId(null);
    };

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-slate-200 rounded-lg shadow-sm bg-white cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                setDraggedVertexId(null);
                setEdgeStartVertexId(null);
                setHoveredVertexId(null);
            }}
        />
    );
};
