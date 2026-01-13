
import { Graph } from "./Graph";

export class ComplexGraphGenerator {
    static generateGeopolitics(): { graph: Graph, description: string, rdfTriples: string[] } {
        const g = new Graph();
        const descriptionLines: string[] = [];
        const rdfTriples: string[] = [];

        // Scenario: Global Cyber-Alliance Network (2025 Model)
        // 3 Major Blocs: 
        // 1. "The Alliance" (Blue - Cooperative, Tech-heavy)
        // 2. "The Coalition" (Red - Aggressive, Military-heavy)
        // 3. "The Non-Aligned" (Green - Mixed, Traders)

        const BLOC_SIZE = 20;
        const totalNodes = 60;

        const blocs = [
            { name: "Alliance", prefix: "A", color: "Blue", type: "Democracy" },
            { name: "Coalition", prefix: "C", color: "Red", type: "Autocracy" },
            { name: "NonAligned", prefix: "N", color: "Green", type: "Neutral" }
        ];

        descriptionLines.push("# Global Cyber-Alliance Network (G-60)");
        descriptionLines.push("This graph represents international relations between 60 state and non-state actors.");
        descriptionLines.push("Three main power blocs compete for influence. Internal edges are mostly positive (Trust);");
        descriptionLines.push("External edges are mixed (Conflict/Trade).");

        // 1. Generate Vertices with Attributes
        blocs.forEach((bloc, blocIdx) => {
            const centerX = 200 + (blocIdx * 300);
            const centerY = 300;
            const radius = 120;

            for (let i = 0; i < BLOC_SIZE; i++) {
                const id = (blocIdx * BLOC_SIZE) + i;
                const angle = (i / BLOC_SIZE) * 2 * Math.PI;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);

                // Role Logic: 1 Leader, 3 Generals, Rest Members
                let role = "Member";
                let priority = 1;
                if (i === 0) { role = "Leader"; priority = 10; }
                else if (i < 4) { role = "General"; priority = 5; }

                const name = `${bloc.prefix}_${role === 'Leader' ? 'Prime' : i}`;

                const metadata = {
                    type: bloc.type,
                    role: role,
                    priority: priority,
                    bloc: bloc.name
                };

                g.addVertex(id, name, x, y, metadata);

                // RDF for Attributes
                rdfTriples.push(`<${name}> <hasType> <${bloc.type}>`);
                rdfTriples.push(`<${name}> <hasRole> <${role}>`);
                rdfTriples.push(`<${name}> <belongsTo> <${bloc.name}>`);
            }
        });

        // 2. Generate Edges (Internal - Strong Positive)
        // Each bloc is dense (probability 0.4)
        for (let b = 0; b < 3; b++) {
            const start = b * BLOC_SIZE;
            const end = start + BLOC_SIZE;

            for (let i = start; i < end; i++) {
                for (let j = i + 1; j < end; j++) {
                    if (Math.random() < 0.4) {
                        // Internal Edge
                        // 90% Positive (Trust), 10% Negative (Internal Rivalry)
                        const isPositive = Math.random() > 0.1;
                        const sign = isPositive ? 1 : -1;
                        const uName = g.getVertex(i)?.label;
                        const vName = g.getVertex(j)?.label;

                        const meta = {
                            weight: Math.floor(Math.random() * 5) + 5, // High weight internal
                            relation: isPositive ? 'Trusts' : 'Rivals'
                        };

                        g.addEdge(i, j, sign, meta);
                        if (uName && vName)
                            rdfTriples.push(`<${uName}> <${meta.relation}> <${vName}>`);
                    }
                }
            }
        }

        // 3. Generate Edges (Cross-Bloc - Conflict/Trade)
        // Alliance (0) vs Coalition (1): Hostile (80% Negative)
        // Alliance (0) vs NonAligned (2): Mixed (50/50)
        // Coalition (1) vs NonAligned (2): Mixed (50/50)

        const addCrossEdge = (u: number, v: number, positiveProb: number) => {
            if (Math.random() < 0.05) { // Sparse cross-connections
                const isPositive = Math.random() < positiveProb;
                const sign = isPositive ? 1 : -1;
                const uName = g.getVertex(u)?.label;
                const vName = g.getVertex(v)?.label;

                const meta = {
                    weight: Math.floor(Math.random() * 5) + 1, // Lower weight external
                    relation: isPositive ? 'TradeAgreement' : 'Sanctions/Conflict'
                };

                g.addEdge(u, v, sign, meta);
                if (uName && vName)
                    rdfTriples.push(`<${uName}> <${meta.relation}> <${vName}>`);
            }
        };

        for (let i = 0; i < BLOC_SIZE; i++) { // Alliance
            for (let j = BLOC_SIZE; j < 2 * BLOC_SIZE; j++) { // Coalition
                addCrossEdge(i, j, 0.1); // Mostly hostile
            }
            for (let k = 2 * BLOC_SIZE; k < totalNodes; k++) { // NonAligned
                addCrossEdge(i, k, 0.6); // Mostly friendly
            }
        }

        for (let j = BLOC_SIZE; j < 2 * BLOC_SIZE; j++) { // Coalition
            for (let k = 2 * BLOC_SIZE; k < totalNodes; k++) { // NonAligned
                addCrossEdge(j, k, 0.4); // Leaning hostile
            }
        }

        return { graph: g, description: descriptionLines.join('\n'), rdfTriples };
    }
}
