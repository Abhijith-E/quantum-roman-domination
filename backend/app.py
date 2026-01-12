import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from qsolver import run_vqe_on_ibm

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Quantum Bridge Active"})

@app.route('/run-ibm', methods=['POST'])
def run_ibm():
    try:
        data = request.json
        api_token = data.get('apiToken')
        graph_data = data.get('graph')
        variant = data.get('variant', 'C_Weighted')
        
        if not api_token:
            return jsonify({"error": "API Token required"}), 400

        # Run the Qiskit Logic
        result = run_vqe_on_ibm(api_token, graph_data, variant)
        
        return jsonify(result)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
