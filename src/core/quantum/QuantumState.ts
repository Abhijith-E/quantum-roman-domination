// Using Float64Array for performance: [real0, imag0, real1, imag1, ...]
export class QuantumState {
    numQubits: number;
    size: number;
    state: Float64Array;

    constructor(numQubits: number) {
        if (numQubits > 20) {
            throw new Error(`QuantumState: Too many qubits (${numQubits}). Max 20 supported.`);
        }
        this.numQubits = numQubits;
        this.size = 1 << numQubits;
        this.state = new Float64Array(this.size * 2);

        // Initialize to |0...0>
        // Index 0 (real) = 1.0, Index 1 (imag) = 0.0
        this.state[0] = 1.0;
    }

    applyH(target: number) {
        // H = 1/sqrt(2) * [[1, 1], [1, -1]]
        // Apply to qubit 'target'
        const dist = 1 << target;
        const invSqrt2 = 1 / Math.sqrt(2);

        // Iterate through pairs where bit 'target' is 0 and 1
        for (let i = 0; i < this.size; i += 2 * dist) {
            for (let j = 0; j < dist; j++) {
                const idx0 = i + j;
                const idx1 = idx0 + dist;

                // Indices in Float64Array
                const r0 = idx0 * 2;
                const i0 = r0 + 1;
                const r1 = idx1 * 2;
                const i1 = r1 + 1;

                const dr0 = this.state[r0];
                const di0 = this.state[i0];
                const dr1 = this.state[r1];
                const di1 = this.state[i1];

                // New values
                // 0 -> (0 + 1) / sqrt2
                // 1 -> (0 - 1) / sqrt2
                this.state[r0] = (dr0 + dr1) * invSqrt2;
                this.state[i0] = (di0 + di1) * invSqrt2;
                this.state[r1] = (dr0 - dr1) * invSqrt2;
                this.state[i1] = (di0 - di1) * invSqrt2;
            }
        }
    }

    applyRY(theta: number, target: number) {
        // RY = [[cos(t/2), -sin(t/2)], [sin(t/2), cos(t/2)]]
        const c = Math.cos(theta / 2);
        const s = Math.sin(theta / 2);
        const dist = 1 << target;

        for (let i = 0; i < this.size; i += 2 * dist) {
            for (let j = 0; j < dist; j++) {
                const r0 = (i + j) * 2;
                const i0 = r0 + 1;
                const r1 = (i + j + dist) * 2;
                const i1 = r1 + 1;

                const dr0 = this.state[r0];
                const di0 = this.state[i0];
                const dr1 = this.state[r1];
                const di1 = this.state[i1];

                // v0' = c*v0 - s*v1
                // v1' = s*v0 + c*v1
                this.state[r0] = c * dr0 - s * dr1;
                this.state[i0] = c * di0 - s * di1;
                this.state[r1] = s * dr0 + c * dr1;
                this.state[i1] = s * di0 + c * di1;
            }
        }
    }

    applyRZ(theta: number, target: number) {
        // RZ = [[e^(-it/2), 0], [0, e^(it/2)]]
        // e^(ix) = cos(x) + i sin(x)
        const halfTheta = theta / 2;
        const c = Math.cos(halfTheta);
        const s = Math.sin(halfTheta);
        const dist = 1 << target;

        for (let i = 0; i < this.size; i += 2 * dist) {
            for (let j = 0; j < dist; j++) {
                const r0 = (i + j) * 2;
                const i0 = r0 + 1;
                const r1 = (i + j + dist) * 2;
                const i1 = r1 + 1;

                // 0 state: times (c - is)
                // (r0 + i*i0)(c - i*s) = r0*c + r0*(-is) + i*i0*c - i^2*i0*s = (r0c + i0s) + i(i0c - r0s)
                const dr0 = this.state[r0];
                const di0 = this.state[i0];
                this.state[r0] = dr0 * c + di0 * s;
                this.state[i0] = di0 * c - dr0 * s;

                // 1 state: times (c + is)
                const dr1 = this.state[r1];
                const di1 = this.state[i1];
                this.state[r1] = dr1 * c - di1 * s;
                this.state[i1] = di1 * c + dr1 * s;
            }
        }
    }

    applyCNOT(control: number, target: number) {
        if (control === target) return;

        for (let i = 0; i < this.size; i++) {
            // Check if control bit is set: (i >> control) & 1
            // Check if target bit is NOT set: !((i >> target) & 1)
            // If so, swap state[i] with state[i | (1<<target)]

            if (((i >> control) & 1) && !((i >> target) & 1)) {
                const partner = i | (1 << target);

                const idxA = i * 2;
                const idxB = partner * 2;

                // Swap complex values
                const tr = this.state[idxA];
                const ti = this.state[idxA + 1];
                this.state[idxA] = this.state[idxB];
                this.state[idxA + 1] = this.state[idxB + 1];
                this.state[idxB] = tr;
                this.state[idxB + 1] = ti;
            }
        }
    }

    getProbabilities(): Float32Array {
        const probs = new Float32Array(this.size);
        for (let i = 0; i < this.size; i++) {
            const r = this.state[i * 2];
            const im = this.state[i * 2 + 1];
            probs[i] = r * r + im * im;
        }
        return probs;
    }
}
