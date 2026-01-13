import { useRef, useEffect, useState, useCallback } from 'react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';

interface GraphCanvasProps {
    graph: Graph;
    assignment: Map<number, RDFValue>;
    onGraphChange: () => void;
    onAssignmentChange: (newAssignment: Map<number, RDFValue>) => void;
    mode: 'edit' | 'assign'; // 'edit' = add/move nodes/edges, 'assign' = change colors
    highlightedVertices?: number[]; // IDs of vertices to highlight (e.g. for Clique visualization)
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
    graph,
    assignment,
    onGraphChange,
    onAssignmentChange,
    mode,
    highlightedVertices = []
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggedVertexId, setDraggedVertexId] = useState<number | null>(null);
    const [hoveredVertexId, setHoveredVertexId] = useState<number | null>(null);

    // For edge creation
    const [edgeStartVertexId, setEdgeStartVertexId] = useState<number | null>(null);

    // Constants
    const NODE_RADIUS = 20;
    const SELECTION_COLOR = '#3b82f6'; // blue-500


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
        graph.edges.forEach(edge => {
            const v1 = graph.getVertex(edge.source);
            const v2 = graph.getVertex(edge.target);
            if (v1 && v2) {
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);

                if (edge.sign === -1) {
                    // Negative edge: Red dashed
                    ctx.strokeStyle = '#ef4444'; // red-500
                    ctx.setLineDash([5, 5]);
                } else {
                    // Positive edge: Standard Gray/Green solid
                    // Using distinct color to imply positive relationship? 
                    // Let's use a nice subtle green or keep gray but solid.
                    // User prompt suggested: SOLID GREEN
                    ctx.strokeStyle = '#22c55e'; // green-500
                    ctx.setLineDash([]);
                }

                ctx.stroke();
                ctx.setLineDash([]); // Reset
            }
        });

        // Draw active edge creation line
        if (edgeStartVertexId !== null) {
            const v1 = graph.getVertex(edgeStartVertexId);
            if (v1 && hoveredVertexId === null) {
                // Nothing drawn if not hovering a target? 
                // We could draw to mouse pos if we tracked it statefully.
                // For now leaving as is.
            }
        }

        // Draw vertices
        graph.vertices.forEach(vertex => {
            const val = assignment.get(vertex.id) ?? 0;

            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, NODE_RADIUS, 0, 2 * Math.PI);

            // Highlight Halo
            if (highlightedVertices.includes(vertex.id)) {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, NODE_RADIUS + 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(234, 179, 8, 0.5)'; // yellow-500, 50% opacity
                ctx.fill();
            }

            // Fill
            ctx.fillStyle = getVertexColor(val);
            ctx.fill();

            // Border
            ctx.lineWidth = 2;
            const isHighlighted = highlightedVertices.includes(vertex.id);
            ctx.strokeStyle = (hoveredVertexId === vertex.id || edgeStartVertexId === vertex.id || isHighlighted)
                ? (isHighlighted ? '#ca8a04' : SELECTION_COLOR) // darker yellow if highlighted
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

    }, [graph, assignment, hoveredVertexId, edgeStartVertexId, highlightedVertices]);

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

    const getEdgeAtPos = (x: number, y: number) => {
        // Simple distance to line segment check
        const threshold = 5;
        for (const edge of graph.edges) {
            const v1 = graph.getVertex(edge.source);
            const v2 = graph.getVertex(edge.target);
            if (!v1 || !v2) continue;

            // Distance from point (x,y) to segment (v1,v2)
            const A = x - v1.x;
            const B = y - v1.y;
            const C = v2.x - v1.x;
            const D = v2.y - v1.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) // in case of 0 length line
                param = dot / lenSq;

            let xx, yy;

            if (param < 0) {
                xx = v1.x;
                yy = v1.y;
            } else if (param > 1) {
                xx = v2.x;
                yy = v2.y;
            } else {
                xx = v1.x + param * C;
                yy = v1.y + param * D;
            }

            const dx = x - xx;
            const dy = y - yy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < threshold) {
                return edge;
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
                const currentVal = assignment.get(vId) ?? 0;
                const newVal = ((currentVal + 1) % 3) as RDFValue;
                const newAssignment = new Map(assignment);
                newAssignment.set(vId, newVal);
                onAssignmentChange(newAssignment);
            } else if (e.shiftKey) {
                setEdgeStartVertexId(vId);
            } else {
                setDraggedVertexId(vId);
            }
        } else {
            // Check edge click
            const edge = getEdgeAtPos(x, y);
            if (edge && mode === 'edit') {
                graph.toggleEdgeSign(edge.source, edge.target);
                onGraphChange();
            } else if (mode === 'edit') {
                // Add vertex
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
        setHoveredVertexId(vId);

        if (draggedVertexId !== null) {
            const v = graph.getVertex(draggedVertexId);
            if (v) {
                v.x = x;
                v.y = y;
                onGraphChange();
            }
        }
    };

    const handleMouseUp = () => {
        if (edgeStartVertexId !== null && hoveredVertexId !== null && edgeStartVertexId !== hoveredVertexId) {
            graph.addEdge(edgeStartVertexId, hoveredVertexId);
            onGraphChange();
        }

        setDraggedVertexId(null);
        setEdgeStartVertexId(null);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const vId = getVertexAtPos(x, y);
        if (vId !== null) {
            // Delete vertex
            graph.removeVertex(vId);
            // Cleanup assignment
            const newAssignment = new Map(assignment);
            newAssignment.delete(vId);
            onAssignmentChange(newAssignment);

            onGraphChange();
            return;
        }

        const edge = getEdgeAtPos(x, y);
        if (edge) {
            // Delete edge
            graph.removeEdge(edge.source, edge.target);
            onGraphChange();
        }
    };

    // Dynamic Sizing
    let maxX = 800;
    let maxY = 600;
    graph.vertices.forEach(v => {
        if (v.x > maxX - 50) maxX = v.x + 100;
        if (v.y > maxY - 50) maxY = v.y + 100;
    });

    return (
        <canvas
            ref={canvasRef}
            width={maxX}
            height={maxY}
            className="rounded-lg bg-white cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onMouseLeave={() => {
                setDraggedVertexId(null);
                setEdgeStartVertexId(null);
                setHoveredVertexId(null);
            }}
        />
    );
};
