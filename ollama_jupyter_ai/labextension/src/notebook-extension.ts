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

    // Try the JupyterLab 4 approach - register cell toolbar factory for all cells
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

    // Function to add button to cell toolbar - original approach as fallback
    const addCellToolbarButton = (notebook: NotebookPanel) => {
      console.log('[Ollama Debug] Adding buttons to notebook:', notebook.id);
      console.log('[Ollama Debug] Notebook content available:', notebook.content ? 'Yes' : 'No');
      console.log('[Ollama Debug] Number of cells:', notebook.content.widgets.length);

      // Keep track of all buttons to manage visibility
      const cellButtons = new Map<string, CellToolbarButtonWidget>();

      const addButtonToCell = (cell: Cell<ICellModel>) => {
        console.log('[Ollama Debug] Adding button to cell type:', cell.model.type, 'cell ID:', cell.model.id);

        // Check if we already have a button for this cell
        if (cellButtons.has(cell.model.id)) {
          console.log('[Ollama Debug] Button already exists for this cell, skipping');
          return;
        }

        // Check if the cell already has our button
        const toolbar = (cell as any).toolbar;
        console.log('[Ollama Debug] Cell toolbar available:', toolbar ? 'Yes' : 'No');

        let button: CellToolbarButtonWidget | null = null;

        if (toolbar) {
          console.log('[Ollama Debug] Toolbar items:', Object.keys(toolbar.items || {}));

          // Check if our button already exists
          if (toolbar.items && toolbar.items['aiAssistant']) {
            console.log('[Ollama Debug] Button already exists, skipping');
            button = toolbar.items['aiAssistant'] as CellToolbarButtonWidget;
          } else {
            try {
              button = new CellToolbarButtonWidget(cell, (actionType: ActionType) => {
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

              // Add button to cell toolbar
              console.log('[Ollama Debug] Adding button to toolbar');
              toolbar.addItem('aiAssistant', button);
              console.log('[Ollama Debug] Button added successfully');
            } catch (error) {
              console.error('[Ollama Debug] Error adding button to cell:', error);
            }
          }
        } else {
          // Try alternate method to get toolbar if direct access fails
          console.log('[Ollama Debug] Trying alternate method to access toolbar');
          try {
            // In some JupyterLab versions, toolbar might be accessed differently
            const cellWidget = cell as any;
            if (cellWidget.layout && typeof cellWidget.layout.addWidget === 'function') {
              console.log('[Ollama Debug] Using layout.addWidget method');
              button = new CellToolbarButtonWidget(cell, (actionType: ActionType) => {
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
              cellWidget.layout.addWidget(button);
              console.log('[Ollama Debug] Button added via alternate method');
            } else {
              console.log('[Ollama Debug] Layout not available for alternate method');
            }
          } catch (altError) {
            console.error('[Ollama Debug] Error with alternate method:', altError);
          }
        }

        // Store the button if we created one
        if (button) {
          cellButtons.set(cell.model.id, button);
        }
      };

      // Add button to existing cells
      console.log('[Ollama Debug] Processing existing cells');
      notebook.content.widgets.forEach((cell: Cell<ICellModel>, index: number) => {
        console.log(`[Ollama Debug] Processing cell ${index + 1}/${notebook.content.widgets.length}`);
        addButtonToCell(cell);
      });

      // Add button to new cells
      if (notebook.model) {
        console.log('[Ollama Debug] Setting up listener for new cells');
        const cells = notebook.model.cells;
        (cells as any).changed.connect((sender: IObservableList<ICellModel>, args: IObservableList.IChangedArgs<ICellModel>) => {
          if (args.type === 'add') {
            console.log('[Ollama Debug] New cell added, index:', args.newIndex);
            setTimeout(() => {
              // Allow a short delay for the cell to be fully created in the DOM
              if (args.newIndex < notebook.content.widgets.length) {
                const cell = notebook.content.widgets[args.newIndex] as Cell<ICellModel>;
                addButtonToCell(cell);

                // If this is the active cell, make its button visible
                if (notebook.content.activeCell === cell) {
                  const button = cellButtons.get(cell.model.id);
                  if (button) {
                    button.setActive(true);
                  }
                }
              }
            }, 100);
          }
        });
        console.log('[Ollama Debug] Listener for new cells set up successfully');
      } else {
        console.log('[Ollama Debug] Notebook model not available, can\'t add listener for new cells');
      }

      // Improved function to update button visibility based on active cell
      const updateButtonVisibility = (activeCell: Cell<ICellModel> | null) => {
        console.log('[Ollama Debug] Active cell changed, ID:', activeCell?.model.id);

        // First, hide all buttons
        for (const [cellId, button] of cellButtons.entries()) {
          button.setActive(false);
          console.log(`[Ollama Debug] Hiding button for cell ${cellId}`);
        }

        // Then show the active cell's button
        if (activeCell) {
          const activeButton = cellButtons.get(activeCell.model.id);
          if (activeButton) {
            activeButton.setActive(true);
            console.log(`[Ollama Debug] Showing button for active cell ${activeCell.model.id}`);
          } else {
            console.log(`[Ollama Debug] No button found for active cell ${activeCell.model.id}, creating one`);
            // If no button exists for this cell, create one
            addButtonToCell(activeCell);
            const newButton = cellButtons.get(activeCell.model.id);
            if (newButton) {
              newButton.setActive(true);
            }
          }
        }
      };

      // Listen for active cell changes to update visibility
      notebook.content.activeCellChanged.connect((sender, activeCell) => {
        updateButtonVisibility(activeCell);
      });

      // Initial setup for the current active cell
      if (notebook.content.activeCell) {
        updateButtonVisibility(notebook.content.activeCell);
      }
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
