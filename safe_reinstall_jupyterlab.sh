#!/bin/bash

# Don't exit on error - safer for interactive environment
set +e

echo "===== Uninstalling JupyterLab ====="
pip uninstall -y jupyterlab jupyter_packaging || echo "Uninstall failed, but continuing..."

echo "===== Removing JupyterLab data directories ====="
# Remove JupyterLab configuration directories
rm -rf ~/.jupyter/lab || echo "Failed to remove ~/.jupyter/lab, but continuing..."
# Remove cached JupyterLab data
find ~/.cache -name "*jupyterlab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Cache removal partially failed, but continuing..."
find ~/.local/share/jupyter -name "*lab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Local share removal partially failed, but continuing..."
# Remove JupyterLab extension directories
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/lab || echo "Failed to remove lab dir from venv, but continuing..."
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/labextensions || echo "Failed to remove labextensions from venv, but continuing..."

echo "===== Reinstalling JupyterLab ====="
pip install jupyterlab jupyter_packaging

echo "===== Verifying JupyterLab installation... ====="
jupyter --version || echo "Failed to get Jupyter version, but continuing..."
jupyter lab --version || echo "Failed to get JupyterLab version, but continuing..."

echo "===== Complete! ====="
echo "JupyterLab has been reinstalled." 