#!/bin/bash

# Ensure we're using a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

#python -m pip install --upgrade build

echo "===== Building Python package ====="
# Build the Python package with the wheel
python -m build || { echo "Python package build failed"; exit 1; }

echo "===== Installing the wheel package ====="
# Find the latest wheel file and install it
WHEEL_FILE=$(ls -t dist/*.whl 2>/dev/null | head -1)
if [ -n "$WHEEL_FILE" ]; then
    echo "Installing wheel: $WHEEL_FILE"
    pip uninstall -y ollama-jupyter-ai || echo "Package was not previously installed"
    pip install "$WHEEL_FILE" || { echo "Wheel installation failed"; exit 1; }
else
    echo "No wheel file found in dist directory!"
    exit 1
fi

# Verify installation
echo "Installed extensions:"
jupyter labextension list

# start jupyter lab
# Check if any service is running on port 5555 and kill it
if lsof -Pi :5555 -sTCP:LISTEN -t >/dev/null; then
    echo "Killing service running on port 5555"
    kill $(lsof -t -i:5555)
fi

# Start Jupyter Lab on port 5555
jupyter lab --no-browser --port=5555 --ServerApp.port_retries=0