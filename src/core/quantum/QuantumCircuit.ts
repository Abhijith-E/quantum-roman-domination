import { QuantumState } from './QuantumState';
import { Graph } from '../graph/Graph';

export type GateType = 'H' | 'RY' | 'RZ' | 'CNOT';

export interface GateStart {
    type: GateType;
    target: number;
    control?: number;
    paramId?: number; // Index of parameter in theta array
}

export class QuantumCircuit {
    numQubits: number;
    gates: GateStart[];
    numParams: number;

    constructor(numQubits: number) {
        this.numQubits = numQubits;
        this.gates = [];
        this.numParams = 0;
    }

    addH(target: number) {
        this.gates.push({ type: 'H', target });
    }

    addRY(target: number) {
        this.gates.push({ type: 'RY', target, paramId: this.numParams++ });
    }

    addRZ(target: number) {
        this.gates.push({ type: 'RZ', target, paramId: this.numParams++ });
    }

    addCNOT(control: number, target: number) {
        this.gates.push({ type: 'CNOT', control, target });
    }

    // Build the specific ansatz for RDF
    // 2 qubits per vertex: q_{i,0}, q_{i,1}
    static createRDFAnsatz(graph: Graph, layers: number): QuantumCircuit {
        const vertices = Array.from(graph.vertices.keys()).sort((a, b) => a - b);
        const mapVtoQubits = new Map<number, [number, number]>();

        vertices.forEach((v, i) => {
            mapVtoQubits.set(v, [i * 2, i * 2 + 1]);
        });

        const numQubits = vertices.length * 2;
        const circuit = new QuantumCircuit(numQubits);

        // Layer 1: Superposition
        for (let i = 0; i < numQubits; i++) {
            circuit.addH(i);
        }

        // Layers: Rotations + Entanglements
        for (let l = 0; l < layers; l++) {
            // Rotations
            for (let i = 0; i < numQubits; i++) {
                circuit.addRY(i);
                circuit.addRZ(i);
            }

            // Entanglement
            graph.edges.forEach(edge => {
                const [u0, u1] = mapVtoQubits.get(edge.source)!;
                const [v0, v1] = mapVtoQubits.get(edge.target)!;

                circuit.addCNOT(u0, v0);
                circuit.addCNOT(u1, v1);
            });

            vertices.forEach(v => {
                const [q0, q1] = mapVtoQubits.get(v)!;
                circuit.addCNOT(q0, q1);
            });
        }

        // Final Rotation Layer
        for (let i = 0; i < numQubits; i++) {
            circuit.addRY(i);
        }

        return circuit;
    }

    run(params: number[]): QuantumState {
        if (params.length !== this.numParams) {
            console.warn(`Param mismatch. Expected ${this.numParams}, got ${params.length}`);
        }

        const qs = new QuantumState(this.numQubits);

        this.gates.forEach(gate => {
            switch (gate.type) {
                case 'H':
                    qs.applyH(gate.target);
                    break;
                case 'RY':
                    qs.applyRY(params[gate.paramId!] || 0, gate.target);
                    break;
                case 'RZ':
                    qs.applyRZ(params[gate.paramId!] || 0, gate.target);
                    break;
                case 'CNOT':
                    qs.applyCNOT(gate.control!, gate.target);
                    break;
            }
        });

        return qs;
    }
}
