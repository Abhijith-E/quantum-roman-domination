# --- MONKEY PATCH TO BYPASS SSL ERRORS ON MAC ---
# MUST BE THE FIRST LINES IN THE FILE
import ssl
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning) 

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context
# ------------------------------------------------

import os
from dotenv import load_dotenv 
from qiskit_ibm_runtime import QiskitRuntimeService

# Load environment variables from .env file
load_dotenv()

# Read secrets safely
API_TOKEN = os.getenv("IBM_QUANTUM_API_TOKEN")
INSTANCE_ID = os.getenv("IBM_QUANTUM_INSTANCE_ID")

def setup_account():
    if not API_TOKEN or not INSTANCE_ID:
        raise ValueError("❌ API token or Instance ID not found. Check your .env file.")

    print("Saving IBM Quantum account...")

    QiskitRuntimeService.save_account(
        channel="ibm_quantum_platform",
        token=API_TOKEN,
        instance=INSTANCE_ID,
        overwrite=True,
        set_as_default=True
    )

    print("Verifying connection...")

    service = QiskitRuntimeService(
        channel="ibm_quantum_platform",
        instance=INSTANCE_ID
    )

    print("✅ Connected successfully!")
    print("Available backends:")

    for b in service.backends():
        print("-", b.name)

if __name__ == "__main__":
    setup_account()
