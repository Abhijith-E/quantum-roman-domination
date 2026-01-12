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

from qiskit_ibm_runtime import QiskitRuntimeService

API_TOKEN = "I1XaORYcZUpkULXZax95Kf4bsn3I8cmoiSgGm1OGVbZ9"

INSTANCE_ID = "crn:v1:bluemix:public:quantum-computing:us-east:a/9ad7ad6883074d70955495411e34d6b0:7d9b0e44-3305-4d78-a472-8089d3fea600::"

def setup_account():
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
