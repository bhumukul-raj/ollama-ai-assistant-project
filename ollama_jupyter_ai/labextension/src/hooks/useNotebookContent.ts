import { useState, useEffect, useCallback } from 'react';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { NotebookService } from '../services/NotebookService';

interface UseNotebookContentOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNotebookContent = (
  notebooks: INotebookTracker,
  options: UseNotebookContentOptions = {}
) => {
  const [notebookService] = useState(() => new NotebookService());
  const [currentNotebook, setCurrentNotebook] = useState<NotebookPanel | null>(null);
  const [notebookContent, setNotebookContent] = useState<string>('');
  const [activeCellContent, setActiveCellContent] = useState<{
    content: string;
    cellType: string;
    index: number;
  } | null>(null);
  const [hasNotebook, setHasNotebook] = useState<boolean>(false);
  
  // Refresh notebook content
  const refreshNotebookContent = useCallback(() => {
    if (currentNotebook && hasNotebook) {
      try {
        const content = notebookService.getAllCellsContent();
        setNotebookContent(content);
      } catch (err) {
        console.error('Error getting notebook content:', err);
        setNotebookContent('');
      }
    } else {
      setNotebookContent('');
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  // Refresh active cell content
  const refreshActiveCellContent = useCallback(() => {
    if (currentNotebook && hasNotebook) {
      try {
        // First, try to get the activeCell directly
        let activeCell = currentNotebook.content.activeCell;
        
        // If no active cell, try to activate one
        if (!activeCell) {
          console.log('No active cell found, attempting to activate a cell...');
          const activated = notebookService.activateCell();
          
          if (activated) {
            // Try again after activation
            activeCell = currentNotebook.content.activeCell;
            console.log('Cell activation successful:', !!activeCell);
          } else {
            console.error('Failed to activate any cell');
          }
        }
        
        if (activeCell) {
          const activeCellIndex = currentNotebook.content.activeCellIndex;
          const content = activeCell.model.toString(); // Use direct model access for immediate content
          
          // Ensure we're getting the actual cell type and content
          const cellType = activeCell.model.type;
          
          const cellContent = {
            content: content || '',  // Ensure content is never undefined
            cellType: cellType || 'code', // Default to code if type is missing
            index: activeCellIndex
          };
          
          console.log('Updating activeCellContent with:', 
            `type=${cellType}, index=${activeCellIndex}, contentLength=${content.length}`);
          
          // Set the cell content immediately
          setActiveCellContent(cellContent);
        } else {
          console.warn('No active cell available, setting activeCellContent to null');
          setActiveCellContent(null);
        }
      } catch (err) {
        console.error('Error getting active cell content:', err);
        setActiveCellContent(null);
      }
    } else {
      setActiveCellContent(null);
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  // Update current notebook when active notebook changes
  useEffect(() => {
    // Set initial notebook if available
    if (notebooks.currentWidget) {
      setCurrentNotebook(notebooks.currentWidget);
      notebookService.setNotebook(notebooks.currentWidget);
      setHasNotebook(true);
    } else {
      setHasNotebook(false);
    }
    
    // Listen for notebook changes
    const notebookChanged = (tracker: INotebookTracker, panel: NotebookPanel | null) => {
      console.log('Active notebook changed:', panel ? 'New notebook selected' : 'No notebook');
      setCurrentNotebook(panel);
      if (panel) {
        notebookService.setNotebook(panel);
        setHasNotebook(true);
        
        // Add listeners to the new notebook
        setupNotebookListeners(panel);
        
        // Refresh content after notebook change
        setTimeout(() => {
          refreshNotebookContent();
          refreshActiveCellContent();
        }, 100);
      } else {
        setHasNotebook(false);
      }
    };
    
    // Add listeners to notebook events
    const setupNotebookListeners = (panel: NotebookPanel) => {
      // Listen for active cell changes
      panel.content.activeCellChanged.connect((_, cell) => {
        console.log('Active cell changed:', cell ? 'New cell selected' : 'No cell');
        setTimeout(refreshActiveCellContent, 50);
      });
      
      // Listen for content changes in cells
      try {
        // Try to connect to the model change event safely
        if (panel.content) {
          // Using type assertion to bypass TypeScript error about model property
          const notebookContent = panel.content as any;
          if (notebookContent.model && notebookContent.model.sharedModel) {
            notebookContent.model.sharedModel.changed.connect(() => {
              console.log('Notebook cells changed');
              setTimeout(() => {
                refreshNotebookContent();
                refreshActiveCellContent();
              }, 50);
            });
          }
        }
      } catch (error) {
        console.error('Error connecting to notebook model changes:', error);
      }
      
      // Listen for cell execution
      panel.sessionContext.statusChanged.connect((_, status) => {
        if (status === 'idle') {
          console.log('Notebook execution completed, refreshing content');
          setTimeout(() => {
            refreshNotebookContent();
            refreshActiveCellContent();
          }, 100);
        }
      });
    };
    
    // Subscribe to notebook changes
    const changedSignal = notebooks.currentChanged.connect(notebookChanged);
    
    // Add listeners to initial notebook if available
    if (notebooks.currentWidget) {
      setupNotebookListeners(notebooks.currentWidget);
    }
    
    // Set up auto-refresh if enabled
    let refreshTimer: number | null = null;
    
    if (options.autoRefresh && options.refreshInterval) {
      refreshTimer = window.setInterval(() => {
        if (hasNotebook) {
          refreshNotebookContent();
          refreshActiveCellContent();
        }
      }, options.refreshInterval);
    }
    
    // Initial content refresh with small delay to ensure notebook is fully loaded
    setTimeout(() => {
      refreshNotebookContent();
      refreshActiveCellContent();
    }, 200);
    
    // Cleanup function
    return () => {
      // Clean up signal connections if they exist
      if (changedSignal) {
        try {
          // Type cast to avoid TypeScript errors
          const signal = changedSignal as any;
          if (typeof signal.disconnect === 'function') {
            signal.disconnect();
          }
        } catch (err) {
          console.error('Error disconnecting from currentChanged signal:', err);
        }
      }
      
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
    };
  }, [notebooks, notebookService, options.autoRefresh, options.refreshInterval, hasNotebook, 
      refreshNotebookContent, refreshActiveCellContent]);
  
  // Insert a new cell in the notebook
  const insertCell = useCallback((
    type: 'code' | 'markdown',
    content: string,
    index?: number
  ) => {
    if (hasNotebook) {
      try {
        notebookService.insertCell(type, content, index);
        refreshNotebookContent();
      } catch (err) {
        console.error('Error inserting cell:', err);
        throw err;
      }
    } else {
      throw new Error('No active notebook');
    }
  }, [notebookService, refreshNotebookContent, hasNotebook]);
  
  // Execute a cell by index
  const executeCell = useCallback(async (index: number) => {
    if (currentNotebook && hasNotebook) {
      try {
        const cell = currentNotebook.content.widgets[index];
        if (cell.model.type === 'code') {
          // Check if it's a CodeCell before executing
          if ('outputArea' in cell) {
            await notebookService.executeCell(cell as CodeCell);
          } else {
            throw new Error('Cell is not a CodeCell');
          }
        } else {
          throw new Error('Cannot execute non-code cell');
        }
      } catch (err) {
        console.error('Error executing cell:', err);
        throw err;
      }
    } else {
      throw new Error('No active notebook');
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  return {
    notebookContent,
    activeCellContent,
    refreshNotebookContent,
    refreshActiveCellContent,
    insertCell,
    executeCell,
    hasActiveNotebook: hasNotebook
  };
};

export default useNotebookContent; 