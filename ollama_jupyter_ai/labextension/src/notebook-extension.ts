import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';
import { OllamaService } from './services/OllamaService';

/**
 * Notebook-specific extension for Ollama AI features
 */
const notebookExtension: JupyterFrontEndPlugin<void> = {
  id: 'ollama-jupyter-ai:notebook-extension',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    notebooks: INotebookTracker
  ) => {
    console.log('Ollama Jupyter AI Notebook Extension activated');
    
    // Initialize the Ollama service
    const ollamaService = new OllamaService();
    
    // Log when notebooks change
    notebooks.currentChanged.connect(() => {
      const current = notebooks.currentWidget;
      if (current) {
        console.log('Current notebook changed:', current.title.label);
      }
    });
  }
};

export default notebookExtension;
