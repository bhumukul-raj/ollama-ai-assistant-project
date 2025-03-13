/**
 * @fileoverview Notebook extension for integrating Ollama AI features into Jupyter notebooks.
 * This extension adds AI assistant functionality directly to notebook cells through toolbar buttons,
 * enabling users to interact with AI models for code analysis, improvement, and questions.
 * The extension supports both JupyterLab 3 and 4 with different implementation approaches.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { ToolbarButton } from '@jupyterlab/apputils';
import { OllamaService } from './services/OllamaService';
import { CellToolbarButtonWidget, ActionType } from './components/CellToolbarButton';
import { IObservableList } from '@jupyterlab/observables';
import { ISignal } from '@lumino/signaling';

/**
 * Notebook-specific extension for Ollama AI features
 * 
 * This plugin adds AI assistant functionality to individual notebook cells
 * by attaching toolbar buttons that provide access to AI operations like:
 * - Asking questions about cell content
 * - Analyzing code in the cell
 * - Suggesting improvements to code
 * 
 * The plugin supports different JupyterLab versions with adaptive approaches.
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

    // Add more detailed logging
    console.log('[Ollama Debug] Starting to add cell toolbar buttons');
    console.log('[Ollama Debug] INotebookTracker available:', notebooks ? 'Yes' : 'No');
    console.log('[Ollama Debug] Current notebook widget:', notebooks.currentWidget ? 'Available' : 'Not available');

    // Try to get JupyterLab version to adjust approach
    let jupyterLabVersion = '';
    try {
      // @ts-ignore - Access window object to get JupyterLab version if available
      if (window && window._jupyterlab && window._jupyterlab.version) {
        // @ts-ignore
        jupyterLabVersion = window._jupyterlab.version;
        console.log('[Ollama Debug] JupyterLab version:', jupyterLabVersion);
      } else {
        console.log('[Ollama Debug] JupyterLab version not available in window object');
      }
    } catch (e) {
      console.log('[Ollama Debug] Error getting JupyterLab version:', e);
    }

    /**
     * JupyterLab 4 approach - Uses the widget extension registry to add buttons to all cells
     * This is the preferred method for JupyterLab 4 which provides better cell integration
     */
    try {
      console.log('[Ollama Debug] Trying JupyterLab 4 approach with toolbar factories');

      // Add our button factory to the Cell toolbar registry
      app.docRegistry.addWidgetExtension('Cell', {
        createNew: (cell: Cell<ICellModel>) => {
          console.log('[Ollama Debug] Cell factory createNew called for cell:', cell.model.id);

          const button = new CellToolbarButtonWidget(cell, (actionType: ActionType) => {
            const cellContent = cell.model.sharedModel.source;
            console.log(`[Ollama Debug] ${actionType} button clicked for cell:`, cellContent.substring(0, 50) + '...');
            // Handle different actions
            switch (actionType) {
              case 'ask':
                console.log('[Ollama Debug] Handling ASK action');
                // TODO: Implement AI questions about the cell
                break;
              case 'analyze':
                console.log('[Ollama Debug] Handling ANALYZE action');
                // TODO: Implement code analysis
                break;
              case 'improve':
                console.log('[Ollama Debug] Handling IMPROVE action');
                // TODO: Implement code improvement suggestions
                break;
            }
          });

          // Position the button below the cell
          button.addClass('jp-Cell-inputArea-attachments');
          return button;
        }
      });

      console.log('[Ollama Debug] Widget extension added for cells');
    } catch (error) {
      console.error('[Ollama Debug] Error with JupyterLab 4 approach:', error);
    }

    /**
     * Function to add button to cell toolbar - original approach as fallback for JupyterLab 3
     * This manually adds buttons to cells and manages their visibility based on the active cell
     * 
     * @param notebook - The notebook panel to add buttons to
     */
    const addCellToolbarButton = (notebook: NotebookPanel) => {
      console.log('[Ollama Debug] Adding buttons to notebook:', notebook.id);

      // Keep track of all buttons to manage visibility
      const cellButtons = new Map<string, CellToolbarButtonWidget>();

      // Track initialized cells to avoid creating buttons for every cell
      const initializedCells = new Set<string>();

      /**
       * Adds a button to a specific cell
       * 
       * @param cell - The cell to add the button to
       */
      const addButtonToCell = (cell: Cell<ICellModel>) => {
        // Only create button if it doesn't exist and is the active cell
        const isActiveCell = notebook.content.activeCell === cell;

        // Check if we already have a button for this cell
        if (cellButtons.has(cell.model.id)) {
          // Update existing button state
          const button = cellButtons.get(cell.model.id);
          if (button) {
            button.setActive(isActiveCell);
          }
          return;
        }

        // For non-active cells, we'll create buttons on demand when they become active
        if (!isActiveCell && !initializedCells.has(cell.model.id)) {
          return;
        }

        // Mark this cell as having been initialized
        initializedCells.add(cell.model.id);

        // Create a button widget
        const button = new CellToolbarButtonWidget(cell, (actionType: ActionType) => {
          const cellContent = cell.model.sharedModel.source;

          // Handle different actions
          switch (actionType) {
            case 'ask':
              // Implementation omitted
              break;
            case 'analyze':
              // Implementation omitted
              break;
            case 'improve':
              // Implementation omitted
              break;
          }
        });

        // Position the button
        button.addClass('jp-Cell-inputArea-attachments');

        // Add to cell
        const toolbar = (cell as any).toolbar;
        if (toolbar) {
          toolbar.addItem('aiAssistant', button);
        } else {
          // Try alternate method if direct toolbar access fails
          try {
            const cellWidget = cell as any;
            if (cellWidget.layout && typeof cellWidget.layout.addWidget === 'function') {
              cellWidget.layout.addWidget(button);
            }
          } catch (error) {
            console.error('[Ollama Debug] Error adding button with alternate method:', error);
          }
        }

        // Store the button
        cellButtons.set(cell.model.id, button);

        // Set initial active state
        button.setActive(isActiveCell);
      };

      /**
       * Updates button visibility based on which cell is active
       * Shows buttons only for the active cell to reduce visual clutter
       * 
       * @param activeCell - The currently active cell or null
       */
      const updateButtonVisibility = (activeCell: Cell<ICellModel> | null) => {
        // First, hide all buttons
        for (const [cellId, button] of cellButtons.entries()) {
          button.setActive(false);
        }

        // Then show the active cell's button
        if (activeCell) {
          const activeButton = cellButtons.get(activeCell.model.id);
          if (activeButton) {
            activeButton.setActive(true);
          } else {
            // If no button exists for this cell, create one
            addButtonToCell(activeCell);
          }
        }
      };

      // Only add buttons for the active cell initially
      if (notebook.content.activeCell) {
        addButtonToCell(notebook.content.activeCell);
      }

      // Listen for active cell changes to update visibility
      notebook.content.activeCellChanged.connect((sender, activeCell) => {
        updateButtonVisibility(activeCell);
      });

      // Add button to new cells when they become active
      if (notebook.model) {
        const cells = notebook.model.cells;
        (cells as any).changed.connect((sender: IObservableList<ICellModel>, args: IObservableList.IChangedArgs<ICellModel>) => {
          if (args.type === 'add') {
            setTimeout(() => {
              // For new cells, only initialize if they're active
              if (args.newIndex < notebook.content.widgets.length) {
                const cell = notebook.content.widgets[args.newIndex] as Cell<ICellModel>;
                // Only initialize if it's the active cell
                if (notebook.content.activeCell === cell) {
                  addButtonToCell(cell);
                }
              }
            }, 100);
          }
        });
      }

      /**
       * Cleanup function to prevent memory leaks
       * Clears references to buttons and cells when the notebook is disposed
       */
      const cleanup = () => {
        // Clear button references
        cellButtons.clear();
        initializedCells.clear();
      };

      // Add cleanup callback
      notebook.disposed.connect(cleanup);
    };

    // Add buttons to existing notebooks using the original approach as a fallback
    if (notebooks.currentWidget) {
      console.log('[Ollama Debug] Adding buttons to current notebook');
      addCellToolbarButton(notebooks.currentWidget);
    } else {
      console.log('[Ollama Debug] No current notebook to add buttons to');
    }

    // Watch for new notebooks
    console.log('[Ollama Debug] Setting up listener for notebook changes');
    notebooks.currentChanged.connect((sender: INotebookTracker, notebook: NotebookPanel | null) => {
      console.log('[Ollama Debug] Notebook changed event triggered');
      if (notebook) {
        console.log('[Ollama Debug] New notebook detected, adding buttons');
        addCellToolbarButton(notebook);
      } else {
        console.log('[Ollama Debug] Notebook changed to null');
      }
    });
    console.log('[Ollama Debug] Notebook extension setup complete');
  }
};

export default notebookExtension;
