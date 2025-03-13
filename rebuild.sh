#!/bin/bash

# Ensure we're using a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

#python -m pip install --upgrade build
echo "===== Cleaning extension files ====="
# Remove any existing build files
rm -rf ollama_jupyter_ai/static/ || echo "No static directory to remove"
#rm -rf ollama_jupyter_ai/labextension/lib/ || echo "No lib directory to remove"
rm -rf ollama_jupyter_ai/labextension/tsconfig.tsbuildinfo || echo "No tsbuildinfo to remove"
#rm -rf node_modules/ || echo "No node_modules to remove"
rm -rf dist/ || echo "No dist directory to remove"
#rm -rf build/ || echo "No build directory to remove"
rm -rf ollama_jupyter_ai.egg-info/ || echo "No egg-info to remove"


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

# Start Jupyter Lab on port 5555
jupyter lab