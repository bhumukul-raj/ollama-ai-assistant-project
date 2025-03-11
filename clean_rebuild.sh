#!/bin/bash

# Exit on error, but continue if specific commands fail
set -e

echo "===== Cleaning extension files ====="
# Remove any existing build files
rm -rf ollama_jupyter_ai/static/ || echo "No static directory to remove"
rm -rf ollama_jupyter_ai/labextension/lib/ || echo "No lib directory to remove"
rm -rf ollama_jupyter_ai/labextension/tsconfig.tsbuildinfo || echo "No tsbuildinfo to remove"
rm -rf node_modules/ || echo "No node_modules to remove"
rm -rf dist/ || echo "No dist directory to remove"
rm -rf build/ || echo "No build directory to remove"
rm -rf ollama_jupyter_ai.egg-info/ || echo "No egg-info to remove"

# Check if JupyterLab is installed before cleaning
if command -v jupyter lab &> /dev/null; then
    # Try to clean JupyterLab, but don't fail if it doesn't work
    jupyter lab clean --all || echo "JupyterLab clean failed, but continuing..."
else
    echo "JupyterLab not installed yet, skipping clean step"
fi

echo "===== Removing JupyterLab data directories ====="
# Remove JupyterLab configuration directories if they exist
rm -rf ~/.jupyter/lab 2>/dev/null || echo "No ~/.jupyter/lab directory to remove"
# Try to remove cached JupyterLab data, but don't fail if it doesn't work
find ~/.cache -name "*jupyterlab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Cache removal partially failed or no cache found, but continuing..."
find ~/.local/share/jupyter -name "*lab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Local share removal partially failed or no directories found, but continuing..."
# Remove JupyterLab extension directories if they exist
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/lab 2>/dev/null || echo "No lab dir in venv to remove"
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/labextensions 2>/dev/null || echo "No labextensions in venv to remove"

echo "===== Installing dependencies ====="
# Install build dependencies - use || true to continue even if there's an error
pip install jupyter_packaging jupyterlab build twine -U || echo "Dependency installation had issues, but continuing..."
# Install node dependencies
yarn install || echo "Yarn install had issues, but continuing..."

echo "===== Building extension ====="
# Build the extension
yarn build:prod || { echo "Extension build failed"; exit 1; }

echo "===== Checking files in static directory ====="
if [ -d "ollama_jupyter_ai/static/" ]; then
    ls -la ollama_jupyter_ai/static/
    if [ -d "ollama_jupyter_ai/static/static" ]; then
        ls -la ollama_jupyter_ai/static/static/
    fi
else
    echo "Static directory not created, build may have failed"
    exit 1
fi

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

# Run JupyterLab build to incorporate the extension
jupyter lab build || { echo "JupyterLab build failed"; exit 1; }

echo "===== Verifying extension is installed ====="
jupyter labextension list | grep -i "ollama-jupyter-ai" || echo "Warning: Extension not found in jupyter labextension list"

echo "Done! Your extension has been cleaned and rebuilt."
echo "If it's still not appearing in JupyterLab, check the browser console for errors (F12)."