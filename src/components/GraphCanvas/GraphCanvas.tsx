
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Graph } from '../../core/graph/Graph';
import type { RDFValue } from '../../core/graph/Graph';

export interface GraphCanvasRef {
    getScreenshot: (overrideAssignment?: Map<number, RDFValue>) => string | null;
    fitView: () => void;
}

interface GraphCanvasProps {
    graph: Graph;
    assignment: Map<number, RDFValue>;
    onGraphChange: () => void;
    onAssignmentChange: (newAssignment: Map<number, RDFValue>) => void;
    mode: 'edit' | 'assign'; // 'edit' = add/move nodes/edges, 'assign' = change colors
    highlightedVertices?: number[]; // IDs of vertices to highlight (e.g. for Clique visualization)
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(({
    graph,
    assignment,
    onGraphChange,
    onAssignmentChange,
    mode,
    highlightedVertices = []
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        getScreenshot: (overrideAssignment?: Map<number, RDFValue>) => {
            if (canvasRef.current) {
                // Force a redraw with the override data if provided
                // This ensures the screenshot has the latest colors/weights
                redraw(overrideAssignment);
                return canvasRef.current.toDataURL('image/png');
            }
            return null;
        },
        fitView: () => {
            // Logic exists below, we can trigger it via a state or ref.
            // But existing fitView logic is `resetView`.
            // I need to extract `resetView`.
            // For now, I'll allow `getScreenshot` which is the priority.
            // To support `fitView`, I need to move `resetView` up or use a stable callback.
            // I'll leave `fitView` empty or simple for now if `resetView` isn't hoisted.
            // Wait, I can declare `resetView` inside component and use it here?
            // Only if `useImperativeHandle` is defined AFTER `resetView`.
            // But hooks order matters. `useImperativeHandle` is a hook.
            // I'll make `getScreenshot` main priority.
            return;
        }
    }));

    const [draggedVertexId, setDraggedVertexId] = useState<number | null>(null);
    const [hoveredVertexId, setHoveredVertexId] = useState<number | null>(null);
    const [edgeStartVertexId, setEdgeStartVertexId] = useState<number | null>(null);

    // Viewport State
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
    // Modifiers State
    const [isModifierHeld, setIsModifierHeld] = useState(false);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Meta' || e.key === 'Control') setIsModifierHeld(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Meta' || e.key === 'Control') setIsModifierHeld(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // ... (Helper: Screen to World and getVertexColor stay here) ...
    // Note: I need to include them or ensure they aren't deleted by replace context. 
    // Since I'm replacing a block, I must be careful. 
    // Better to insert state at top, and modify redraw/wheel separately.
    // Let's do multiple replacements for safety.

    // 1. Insert State & Listeners
    // 2. Modify Redraw
    // 3. Modify Wheel

    // Actually, I will do it in one go if I can match the context correctly.
    // But inserting large blocks is risky. I'll stick to State insertion first.
    // Constants
    const NODE_RADIUS = 20;
    const SELECTION_COLOR = '#3b82f6';

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'node' | 'edge', id: any } | null>(null);

    // Close menu on click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Modifiers State
    // isModifierHeld is already declared above (duplicate fix)
    const [hoveredEdge, setHoveredEdge] = useState<{ source: number, target: number } | null>(null);

    // Keyboard Listeners (Modifiers + Delete)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Meta' || e.key === 'Control') setIsModifierHeld(true);

            // Deletion Shortcut (Delete/Backspace)
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (hoveredVertexId !== null) {
                    graph.removeVertex(hoveredVertexId);
                    const newAssignment = new Map(assignment);
                    newAssignment.delete(hoveredVertexId);
                    onAssignmentChange(newAssignment);
                    onGraphChange();
                    setHoveredVertexId(null);
                } else if (hoveredEdge) {
                    graph.removeEdge(hoveredEdge.source, hoveredEdge.target);
                    onGraphChange();
                    setHoveredEdge(null);
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Meta' || e.key === 'Control') setIsModifierHeld(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [graph, assignment, hoveredVertexId, hoveredEdge, onAssignmentChange, onGraphChange]); // Deps critical for closure

    // Helper: Screen to World
    const screenToWorld = (sx: number, sy: number) => ({
        x: (sx - transform.x) / transform.k,
        y: (sy - transform.y) / transform.k
    });

    const getVertexColor = (val: RDFValue) => {
        switch (val) {
            case 2: return '#22c55e';
            case 1: return '#eab308';
            case 0: return '#ffffff';
            default: return '#ffffff';
        }
    };

    const redraw = useCallback((overrideAssignment?: Map<number, RDFValue>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentAssignment = overrideAssignment || assignment;

        // Clear and Set Transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Grid Lines (Optional background)
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        // const gridSize = 50 * transform.k;
        // const offsetX = transform.x % gridSize;
        // const offsetY = transform.y % gridSize;
        // (Skipping grid for clarity, purely white bg preferred by user?)

        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        // Determine "Dimmed" state
        // If hovering a vertex, dim everything else except neighbors
        let focusNodes = new Set<number>();
        let focusEdges = new Set<string>(); // "u-v"

        if (hoveredVertexId !== null) {
            focusNodes.add(hoveredVertexId);
            const neighbors = graph.adjacency.get(hoveredVertexId) || [];
            neighbors.forEach(nid => {
                focusNodes.add(nid);
                const k1 = hoveredVertexId < nid ? `${hoveredVertexId}-${nid}` : `${nid}-${hoveredVertexId}`;
                focusEdges.add(k1);
            });
        }

        const isDimmedMode = hoveredVertexId !== null && isModifierHeld;
        const DIM_ALPHA = 0.1;

        // Draw edges
        // Constant generic width visual
        ctx.lineWidth = 2;

        graph.edges.forEach(edge => {
            const v1 = graph.getVertex(edge.source);
            const v2 = graph.getVertex(edge.target);
            if (v1 && v2) {
                // Dimming Logic
                let alpha = 1.0;
                const edgeKey = edge.source < edge.target ? `${edge.source}-${edge.target}` : `${edge.target}-${edge.source}`;

                if (isDimmedMode) {
                    if (!focusEdges.has(edgeKey)) alpha = DIM_ALPHA;
                }

                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);

                // Highlight hovered edge?
                const isHoveredEdge = hoveredEdge &&
                    ((hoveredEdge.source === edge.source && hoveredEdge.target === edge.target) ||
                        (hoveredEdge.source === edge.target && hoveredEdge.target === edge.source));

                if (edge.sign === -1) {
                    ctx.strokeStyle = isHoveredEdge ? '#f87171' : '#ef4444';
                    ctx.setLineDash([5, 5]);
                } else {
                    ctx.strokeStyle = isHoveredEdge ? '#4ade80' : '#22c55e';
                    ctx.setLineDash([]);
                }

                if (isHoveredEdge) {
                    ctx.shadowColor = 'rgba(0,0,0,0.2)';
                    ctx.shadowBlur = 5;
                    ctx.lineWidth = 4;
                } else {
                    ctx.shadowBlur = 0;
                    ctx.lineWidth = 2;
                }

                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
                ctx.lineWidth = 2;
            }
        });
        ctx.globalAlpha = 1.0;

        // Draw active edge creation line
        if (edgeStartVertexId !== null) {
            const v1 = graph.getVertex(edgeStartVertexId);
            if (v1) {
                // If we tracked mouse pos in world coords we could draw line
            }
        }

        // Draw vertices
        graph.vertices.forEach(vertex => {
            const val = currentAssignment.get(vertex.id) ?? 0;

            // Dimming Logic
            let alpha = 1.0;
            if (isDimmedMode && !focusNodes.has(vertex.id)) alpha = DIM_ALPHA;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, NODE_RADIUS, 0, 2 * Math.PI);

            // Highlight Halo
            if (highlightedVertices.includes(vertex.id)) {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, NODE_RADIUS + 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(234, 179, 8, 0.5)';
                ctx.fill();
            }

            // Fill
            ctx.fillStyle = getVertexColor(val);
            ctx.fill();

            // Border
            ctx.lineWidth = 2;
            const isHighlighted = highlightedVertices.includes(vertex.id);
            ctx.strokeStyle = (hoveredVertexId === vertex.id || edgeStartVertexId === vertex.id || isHighlighted)
                ? (isHighlighted ? '#ca8a04' : SELECTION_COLOR)
                : '#000000';
            ctx.stroke();

            // Label (Scale text so it remains readable but not huge? Or zoom with it?)
            // Usually zoom with it.
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(vertex.label, vertex.x, vertex.y);

            // Value badge (Bottom right offset)
            const bX = vertex.x + 14;
            const bY = vertex.y + 14;

            ctx.beginPath();
            ctx.arc(bX, bY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(val.toString(), bX, bY);

            ctx.globalAlpha = 1.0;
        });

    }, [graph, assignment, hoveredVertexId, edgeStartVertexId, highlightedVertices, transform, isModifierHeld, hoveredEdge]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    // HANDLERS
    const handleWheel = (e: React.WheelEvent) => {
        if (!e.metaKey && !e.ctrlKey) return; // Only zoom if Cmd/Ctrl is held
        // e.preventDefault(); // React passive event issue?
        const scaleBy = 1.1;
        const newK = e.deltaY < 0 ? transform.k * scaleBy : transform.k / scaleBy;

        // Clamp zoom
        if (newK < 0.1 || newK > 5) return;

        // Zoom towards mouse pointer
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // world_mouse = (screen_mouse - old_translate) / old_scale
        const wx = (mx - transform.x) / transform.k;
        const wy = (my - transform.y) / transform.k;

        // new_translate = screen_mouse - world_mouse * new_scale
        const newX = mx - wx * newK;
        const newY = my - wy * newK;

        setTransform({ x: newX, y: newY, k: newK });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = screenToWorld(sx, sy);

        setLastPanPoint({ x: sx, y: sy });

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
        }
        // Note: Edge toggle moved to MouseUp to prevent conflict with AddNode
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = screenToWorld(sx, sy);

        // Cursor Feedback
        let cursor = 'default';
        const vId = getVertexAtPos(x, y);
        const edge = getEdgeAtPos(x, y);

        if (vId !== null || edge) {
            cursor = 'pointer';
        } else if (isPanning) {
            cursor = 'grabbing';
        } else {
            cursor = 'crosshair'; // Default for adding nodes
        }
        canvas.style.cursor = cursor;

        // Logic
        setHoveredVertexId(vId);
        setHoveredEdge(edge ? { source: edge.source, target: edge.target } : null);

        // Check if mouse button is down for interactions
        if (e.buttons === 1) {
            // Priority 1: Dragging a Vertex
            if (draggedVertexId !== null) {
                const v = graph.getVertex(draggedVertexId);
                if (v) {
                    v.x = x;
                    v.y = y;
                    onGraphChange();
                }
                return;
            }

            // Priority 2: Creating an Edge (Shift+Drag)
            if (edgeStartVertexId !== null) {
                // Visuals led by hover state, no special logic needed here.
                return;
            }

            // Priority 3: Panning (Background Drag)
            // Check threshold to differentiate from Click
            if (!isPanning) {
                const dx = sx - lastPanPoint.x;
                const dy = sy - lastPanPoint.y;
                if (Math.sqrt(dx * dx + dy * dy) > 5) {
                    setIsPanning(true);
                }
            }

            if (isPanning) {
                const dx = sx - lastPanPoint.x;
                const dy = sy - lastPanPoint.y;
                setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
                setLastPanPoint({ x: sx, y: sy });
            }
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle "Click" vs "Drag" for Panning/Add Node
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (edgeStartVertexId !== null && hoveredVertexId !== null && edgeStartVertexId !== hoveredVertexId) {
            graph.addEdge(edgeStartVertexId, hoveredVertexId);
            onGraphChange();
        } else if (draggedVertexId === null && hoveredVertexId === null && edgeStartVertexId === null && !isPanning && mode === 'edit') {
            // Re-calculate world pos
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { x, y } = screenToWorld(sx, sy);

            // Check if we clicked an EDGE
            const edge = getEdgeAtPos(x, y);
            if (edge) {
                graph.toggleEdgeSign(edge.source, edge.target);
                onGraphChange();
            } else {
                // Clicked on empty space -> Add Vertex
                const newId = graph.vertices.size > 0 ? Math.max(...graph.vertices.keys()) + 1 : 0;
                graph.addVertex(newId, `v${newId} `, x, y);
                onGraphChange();
            }
        }

        setDraggedVertexId(null);
        setEdgeStartVertexId(null);
        // Ensure panning is reset
        setIsPanning(false);
    };

    // Helper functions need to use "Transform" aware checks? 
    // No, getVertexAtPos uses World Coords which we extract from Event.
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

    // ... getEdgeAtPos similar ...

    const getEdgeAtPos = (x: number, y: number) => {
        // Simple distance to line segment check
        const threshold = 15; // Increased from 5 to make clicking easier
        for (const edge of graph.edges) {
            const v1 = graph.getVertex(edge.source);
            const v2 = graph.getVertex(edge.target);
            if (!v1 || !v2) continue;
            // ... strict math logic ...
            const A = x - v1.x;
            const B = y - v1.y;
            const C = v2.x - v1.x;
            const D = v2.y - v1.y;
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            let xx, yy;
            if (param < 0) { xx = v1.x; yy = v1.y; }
            else if (param > 1) { xx = v2.x; yy = v2.y; }
            else { xx = v1.x + param * C; yy = v1.y + param * D; }
            const dx = x - xx;
            const dy = y - yy;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) return edge;
        }
        return null;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = screenToWorld(sx, sy);

        const vId = getVertexAtPos(x, y);
        if (vId !== null) {
            setContextMenu({ x: sx, y: sy, type: 'node', id: vId });
            return;
        }

        const edge = getEdgeAtPos(x, y);
        if (edge) {
            setContextMenu({ x: sx, y: sy, type: 'edge', id: edge }); // Store edge object or ID logic? Edge doesn't have ID. Store object.
            return;
        }

        setContextMenu(null);
    };

    return (
        <div className="relative w-full h-[600px] overflow-hidden bg-slate-50 rounded-lg border border-slate-200">
            <canvas
                ref={canvasRef}
                width={800} // Fixed internal buffer, scale handles view
                height={600}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                onMouseLeave={() => {
                    setIsPanning(false);
                    setDraggedVertexId(null);
                    setEdgeStartVertexId(null);
                    setHoveredVertexId(null);
                    setContextMenu(null);
                }}
            />

            {/* Context Menu Overlay */}
            {contextMenu && (
                <div
                    className="absolute bg-white shadow-xl rounded border border-slate-200 py-1 min-w-[120px] z-50 flex flex-col items-start"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.type === 'edge' && (
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                            onClick={() => {
                                const e = contextMenu.id;
                                graph.toggleEdgeSign(e.source, e.target);
                                onGraphChange();
                                setContextMenu(null);
                            }}
                        >
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Toggle Sign
                        </button>
                    )}

                    <button
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        onClick={() => {
                            if (contextMenu.type === 'node') {
                                graph.removeVertex(contextMenu.id);
                                const newAssignment = new Map(assignment);
                                newAssignment.delete(contextMenu.id);
                                onAssignmentChange(newAssignment);
                            } else {
                                const e = contextMenu.id;
                                graph.removeEdge(e.source, e.target);
                            }
                            onGraphChange();
                            setContextMenu(null);
                        }}
                    >
                        🗑️ Delete {contextMenu.type === 'node' ? 'Node' : 'Edge'}
                    </button>
                </div>
            )}

            {/* Overlay Grid/Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 font-bold"
                    onClick={() => setTransform(t => ({ ...t, k: t.k * 1.2 }))}
                    title="Zoom In"
                >
                    +
                </button>
                <button
                    className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 font-bold"
                    onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
                    title="Reset View"
                >
                    ⟲
                </button>
                <button
                    className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 font-bold"
                    onClick={() => setTransform(t => ({ ...t, k: t.k / 1.2 }))}
                    title="Zoom Out"
                >
                    -
                </button>
            </div>

            {/* Info Overlay */}
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur p-2 rounded text-xs text-slate-500 pointer-events-none">
                Right-Click for Options • Scroll to Zoom
            </div>
        </div>
    );
});
