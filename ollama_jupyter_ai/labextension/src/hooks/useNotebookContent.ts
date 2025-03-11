import { useState, useEffect } from 'react';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { NotebookService } from '../services/NotebookService';

export const useNotebookContent = (notebooks: INotebookTracker) => {
  const [notebookService] = useState(() => new NotebookService());
  const [hasNotebook, setHasNotebook] = useState<boolean>(false);

  useEffect(() => {
    // Set initial notebook if available
    if (notebooks.currentWidget) {
      notebookService.setNotebook(notebooks.currentWidget);
      setHasNotebook(true);
    } else {
      setHasNotebook(false);
    }

    // Listen for notebook changes
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

    // Cleanup function
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