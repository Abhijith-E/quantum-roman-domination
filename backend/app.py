import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from qsolver import run_vqe_on_ibm, check_connection

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Quantum Bridge Active"})

@app.route('/status', methods=['GET'])
def get_status():
    result = check_connection()
    return jsonify(result)

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

import json
import base64
import csv
from datetime import datetime

@app.route('/save-log', methods=['POST'])
def save_log():
    try:
        data = request.json
        run_id = data.get('id', str(int(time.time())))
        screenshot_data = data.get('screenshot') # Base64 string
        
        # 1. Prepare Directory
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        # 2. Save Full JSON Detail
        json_path = os.path.join(log_dir, f"run_{run_id}.json")
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=4)
            
        # 3. Save Screenshot
        img_filename = ""
        if screenshot_data and ',' in screenshot_data:
            try:
                header, encoded = screenshot_data.split(',', 1)
                img_data = base64.b64decode(encoded)
                img_filename = f"run_{run_id}.png"
                img_path = os.path.join(log_dir, img_filename)
                with open(img_path, 'wb') as f:
                    f.write(img_data)
            except Exception as img_err:
                print(f"Error saving image: {img_err}")
        
        # 4. Append to Master CSV Log
        csv_path = os.path.join(log_dir, "run_history.csv")
        file_exists = os.path.isfile(csv_path)
        
        # Extract fields for summary
        timestamp = datetime.now().isoformat()
        algo = data.get('algo', 'Unknown')
        
        # Graph Stats
        graph_stats = data.get('graphData', {})
        v_count = len(graph_stats.get('vertices', [])) if 'vertices' in graph_stats else 0
        e_count = len(graph_stats.get('edges', [])) if 'edges' in graph_stats else 0
        
        weight = data.get('weight', 0)
        is_valid = data.get('isValid', False)
        time_taken = data.get('timeTaken', 0)
        
        with open(csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            # Header
            if not file_exists:
                writer.writerow(['RunID', 'Timestamp', 'Algorithm', 'Vertices', 'Edges', 'Weight', 'Valid', 'TimeMs', 'ImageFile'])
            
            # Row
            writer.writerow([run_id, timestamp, algo, v_count, e_count, weight, is_valid, time_taken, img_filename])
            
        return jsonify({"status": "saved", "id": run_id})

    except Exception as e:
        print(f"Logging Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
