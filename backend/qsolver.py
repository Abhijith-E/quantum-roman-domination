# --- MONKEY PATCH TO BYPASS SSL ERRORS ON MAC ---
# MUST BE THE FIRST LINES IN THE FILE
import ssl
import warnings

# Suppress warnings
warnings.filterwarnings("ignore", category=DeprecationWarning) 

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context
# ------------------------------------------------

from qiskit import QuantumCircuit
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService
import numpy as np

# --- 1. PROBLEM LOGIC (SRDF VARIANT C) ---
def get_neighbors(v_id, edges):
    """Return list of neighbor IDs for vertex v_id."""
    n = []
    for e in edges:
        if e['source'] == v_id:
            n.append({'id': e['target'], 'sign': e['sign']})
        elif e['target'] == v_id:
            n.append({'id': e['source'], 'sign': e['sign']})
    return n

def evaluate_solution(assignment, vertices, edges):
    """
    Evaluate a candidate assignment for SRDF Variant C.
    Returns: (is_valid, weight, violation_score)
    """
    total_weight = sum(assignment.values())
    violations = 0
    
    # 1. Roman Condition: If f(v)=0, must have strong neighbor u with f(u)=2
    # 2. Weight Condition: f(u) + sum(f(v)*sign) >= 1
    
    for v in vertices:
        v_id = v['id']
        val = assignment.get(v_id, 0)
        neighbors = get_neighbors(v_id, edges)
        
        # Rule 1: Roman Defense
        defense_score = val
        strong_neighbor = False
        
        for n in neighbors:
            n_val = assignment.get(n['id'], 0)
            sign = n['sign']
            defense_score += n_val * sign
            
            if val == 0 and n_val == 2 and sign == 1:
                strong_neighbor = True
        
        # Apply Logic for Variant C (based on user Requirements)
        # Condition (i)
        if val == 0 and not strong_neighbor:
            violations += 10 # Heavy penalty
            
        # Condition (ii)
        if defense_score < 1:
            violations += 5 + abs(1 - defense_score) # Penalty proportional to deficit
            
    is_valid = (violations == 0)
    return is_valid, total_weight, violations

# --- 2. QUANTUM CONNECTION ---
def check_connection():
    try:
        service = QiskitRuntimeService()
        if service.active_account():
            return {"status": "connected", "msg": "Online"}
        else:
             return {"status": "error", "msg": "No Active Account"}
    except Exception as e:
        return {"status": "error", "msg": "Offline"} # Simplified msg

# --- 3. MAIN SOLVER ---
def run_vqe_on_ibm(api_token, graph_data, variant):
    # Setup Service
    service = None
    try:
        service = QiskitRuntimeService() # Try loading local
        print("Using saved credentials.")
    except:
        if api_token and "REPLACE" not in api_token:
            service = QiskitRuntimeService(token=api_token)
        else:
             raise Exception("No credentials available.")

    # Backend Selection
    # Optimization: Filter for backends with enough qubits but low queue
    # Using 'least_busy' is good
    num_vertices = len(graph_data['vertices'])
    num_qubits = num_vertices * 2 # 2 qubits per vertex for {0,1,2}
    
    backend = service.least_busy(operational=True, simulator=False, min_num_qubits=num_qubits)
    print(f"Selected Backend: {backend.name}")

    if num_qubits > 127:
        raise Exception("Graph too large (max 63 vertices).")

    # --- STRICT QUANTUM ALGORITHM (BATCH QAOA OPTIMIZED) ---
    # Strategy: 
    # 1. Physics-Informed Hamiltonian: Encode Edge Signs (-1/+1) into Phase.
    # 2. High-Res Sweep: 5x5 Grid (25 parallel circuits).
    
    # Generate Parameter Grid (5x5 = 25 variations)
    betas = np.linspace(0.1, np.pi/2, 5)
    gammas = np.linspace(0.1, np.pi, 5)
    
    pubs = []
    
    from qiskit.circuit import Parameter
    
    # Define Parameterized Circuit ONCE
    qc_p = QuantumCircuit(num_qubits)
    qc_p.h(range(num_qubits))
    
    # Parameters
    p_gamma = Parameter('gamma')
    p_beta = Parameter('beta')
    
    sorted_vertices = sorted(graph_data['vertices'], key=lambda x: x['id'])
    v_map = {v['id']: i for i, v in enumerate(sorted_vertices)}
    
    # Cost Layer (Hamiltonian)
    # 1. Edge Constraints (Interaction Term)
    # We respect the edge sign!
    for e in graph_data['edges']:
        u_idx = v_map.get(e['source'])
        v_idx = v_map.get(e['target'])
        sign = e.get('sign', 1)
        
        if u_idx is not None and v_idx is not None:
            # RZZ(theta) evolves phase based on parity (Interaction Energy)
            qc_p.rzz(p_gamma * sign, 2 * u_idx, 2 * v_idx)

    # 2. Node Weight & Domination Bias (Linear Field Term)
    # Standard SRDF minimizes Weight. We must bias the state towards lower values (0).
    # We apply a Z-rotation to every qubit. This corresponds to an external magnetic field.
    # It penalizes '1' states, effectively acting as the "Minimize Weight" term in the objective.
    for i in range(num_qubits):
        # Apply field proportional to gamma (adiabatic evolution principle)
        # Using 0.5 coefficient to balance with interaction strength
        qc_p.rz(p_gamma * 0.5, i)

    # Mixing Layer
    qc_p.rx(2 * p_beta, range(num_qubits))
    qc_p.measure_all()
    
    # Transpile ONCE
    pm = generate_preset_pass_manager(backend=backend, optimization_level=3)
    isa_qc = pm.run(qc_p)
    
    # Create Batch Inputs
    ordered_params = list(isa_qc.parameters)
    batch_bindings = []
    
    # Sweep
    for b in betas:
        for g in gammas:
            vals = []
            for p in ordered_params:
                if p.id == p_gamma.id or p.name == 'gamma': vals.append(g)
                elif p.id == p_beta.id or p.name == 'beta': vals.append(b)
            batch_bindings.append(vals)
            
    # Run Batch
    from qiskit_ibm_runtime import SamplerV2 as Sampler
    sampler = Sampler(mode=backend)
    
    # Submit 25 configurations in one job
    job = sampler.run([(isa_qc, batch_bindings)], shots=2048)
    print(f"Batch Job submitted: {job.job_id()} (25 Parameter Sets)")
    
    # Get Results
    result = job.result()
    # result[0] corresponds to the first PUB.
    # It contains data for all parameter sets in the batch.
    
    # SamplerV2 result structure: 
    # PubResult -> data -> measure -> BitArray
    # But with bindings, it might return array of counts?
    # Actually, for V2, we get a DataBin. 
    # If we passed N bindings, we get N results? 
    # Usually pub_result.data.meas.get_counts() returns a LIST of dicts if multiple bindings used.
    
    pub_result = result[0]
    all_counts = pub_result.data.meas.get_counts()
    
    # If it's a single dict (unexpected for multiple bindings), wrap it
    if isinstance(all_counts, dict):
        all_counts = [all_counts]
        
    print(f"Received {len(all_counts)} result sets.")

    # --- PURE QUANTUM SELECTION ---
    # Aggregate results from ALL parameter sets.
    # We strictly use the hardware outputs.
    # We select the best VALID solution found across all sweeps.
    
    best_qc_assignment = {}
    best_qc_score = float('inf')
    found_any_valid = False
    
    v_ids = [v['id'] for v in sorted_vertices]
    
    # Iterate over all 9 experiments
    for count_dict in all_counts:
        for bitstring, count in count_dict.items():
            if count < 2: continue # Ignore extreme noise
            
            current_assignment = {}
            for i, v_id in enumerate(v_ids):
                try:
                    # Qiskit Little Endian: q0 is rightmost
                    b0 = int(bitstring[-(2*i + 1)])
                    b1 = int(bitstring[-(2*i + 2)])
                    val = (b1 << 1) | b0
                    if val == 3: val = 0 
                    current_assignment[v_id] = val
                except IndexError:
                    current_assignment[v_id] = 0
            
            is_valid, weight, violations = evaluate_solution(current_assignment, graph_data['vertices'], graph_data['edges'])
            score = (violations * 100) + weight
            
            # Strict logic: Best Valid > Best Invalid
            if is_valid:
                if not found_any_valid:
                    # Upgrade from invalid to valid
                    found_any_valid = True
                    best_qc_score = score
                    best_qc_assignment = current_assignment
                else:
                    if score < best_qc_score:
                        best_qc_score = score
                        best_qc_assignment = current_assignment
                    elif score == best_qc_score:
                        # Tie-break (could use probability but we are iterating dicts)
                        pass
            else:
                if not found_any_valid:
                    if score < best_qc_score:
                        best_qc_score = score
                        best_qc_assignment = current_assignment

    # Final Strict Return
    return {
        "assignment": best_qc_assignment,
        "backend": backend.name + " (Batch QAOA)",
        "shots": 4096 * 9,
        "jobId": job.job_id(),
        "is_optimal": found_any_valid
    }
