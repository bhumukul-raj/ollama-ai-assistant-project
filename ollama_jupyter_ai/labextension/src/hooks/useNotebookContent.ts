/**
 * @file useNotebookContent.ts
 * @description This file contains the useNotebookContent custom React hook that manages the connection
 * between the AI Assistant and the active Jupyter notebook. It tracks the active notebook,
 * subscribes to changes, and provides an interface to interact with the notebook content.
 */
import { useState, useEffect } from 'react';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { NotebookService } from '../services/NotebookService';

/**
 * Custom hook that manages notebook content and connections.
 * 
 * This hook maintains awareness of the currently active notebook in JupyterLab
 * and provides the NotebookService to interact with it. It handles notebook selection
 * changes and cleanup of event listeners.
 * 
 * @param {INotebookTracker} notebooks - The JupyterLab notebook tracker instance that monitors notebook state
 * @returns {Object} An object containing:
 *   - hasActiveNotebook: boolean indicating if there's an active notebook
 *   - notebookService: service instance to interact with the notebook
 */
export const useNotebookContent = (notebooks: INotebookTracker) => {
  // Initialize NotebookService instance (stays persistent across renders)
  const [notebookService] = useState(() => new NotebookService());
  // Track whether there is an active notebook
  const [hasNotebook, setHasNotebook] = useState<boolean>(false);

  useEffect(() => {
    // Set initial notebook if available
    if (notebooks.currentWidget) {
      notebookService.setNotebook(notebooks.currentWidget);
      setHasNotebook(true);
    } else {
      setHasNotebook(false);
    }

    /**
     * Handler for notebook change events.
     * Updates the NotebookService with the newly selected notebook.
     * 
     * @param {INotebookTracker} _ - The notebook tracker (unused)
     * @param {NotebookPanel | null} panel - The newly selected notebook panel, or null if none
     */
    const notebookChanged = (_: INotebookTracker, panel: NotebookPanel | null) => {
      if (panel) {
        notebookService.setNotebook(panel);
        setHasNotebook(true);
      } else {
        setHasNotebook(false);
      }
    };

    // Subscribe to notebook changes
    const changedSignal = notebooks.currentChanged.connect(notebookChanged);

    // Cleanup function to disconnect signal when component unmounts
    return () => {
      if (changedSignal) {
        try {
          const signal = changedSignal as any;
          if (typeof signal.disconnect === 'function') {
            signal.disconnect();
          }
        } catch (err) {
          console.error('Error disconnecting from currentChanged signal:', err);
        }
      }
    };
  }, [notebooks, notebookService]);

  return {
    hasActiveNotebook: hasNotebook,
    notebookService
  };
}; 