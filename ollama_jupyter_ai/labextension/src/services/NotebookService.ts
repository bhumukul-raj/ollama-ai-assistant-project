import { NotebookPanel, NotebookActions } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';

export class NotebookService {
  private notebook: NotebookPanel | null = null;

  setNotebook(notebook: NotebookPanel) {
    this.notebook = notebook;
  }

  async executeCell(cell: CodeCell) {
    if (!this.notebook || !this.notebook.sessionContext) {
      throw new Error('No active notebook');
    }
    await this.notebook.sessionContext.session?.kernel?.requestExecute({
      code: cell.model.toString()
    }).done;
  }

  insertCell(type: 'code' | 'markdown', content: string, index?: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }

    // Use NotebookActions to insert a cell
    NotebookActions.insertBelow(this.notebook.content);
    const activeCell = this.notebook.content.activeCell;
    
    if (activeCell) {
      // Set the cell content
      activeCell.model.sharedModel.setSource(content);
      
      // Change cell type if needed
      if (type === 'markdown') {
        NotebookActions.changeCellType(this.notebook.content, 'markdown');
      }
    }
  }

  deleteCell(index: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }
    
    // Select the cell at the given index
    this.notebook.content.activeCellIndex = index;
    // Delete the selected cell
    NotebookActions.deleteCells(this.notebook.content);
  }

  moveCell(fromIndex: number, toIndex: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }
    
    // Select the cell at fromIndex
    this.notebook.content.activeCellIndex = fromIndex;
    
    // Move the cell up or down based on the target index
    const steps = Math.abs(toIndex - fromIndex);
    for (let i = 0; i < steps; i++) {
      if (fromIndex < toIndex) {
        NotebookActions.moveDown(this.notebook.content);
      } else {
        NotebookActions.moveUp(this.notebook.content);
      }
    }
  }

  activateCell(index?: number): boolean {
    if (!this.notebook) {
      console.error('Cannot activate cell: No active notebook');
      return false;
    }
    
    try {
      const notebook = this.notebook.content;
      
      // If no specific index is provided, try to use the current active cell
      // or default to the first cell
      const cellIndex = (index !== undefined) 
        ? index 
        : (notebook.activeCellIndex >= 0 
            ? notebook.activeCellIndex 
            : 0);
      
      // Make sure the index is valid
      if (cellIndex < 0 || cellIndex >= notebook.widgets.length) {
        console.error(`Cannot activate cell: Index ${cellIndex} is out of range`);
        return false;
      }
      
      console.log(`Attempting to activate cell at index ${cellIndex}`);
      
      // Set the active cell index
      notebook.activeCellIndex = cellIndex;
      
      // Get the active cell and focus it
      const cell = notebook.widgets[cellIndex];
      if (cell) {
        try {
          // Focus the notebook first
          if (this.notebook.node && this.notebook.node.focus) {
            console.log('Focusing notebook node');
            this.notebook.node.focus();
          } else {
            console.warn('Notebook node or focus method not available');
          }
          
          // Then focus the cell
          if (cell.node && cell.node.focus) {
            console.log('Focusing cell node');
            cell.node.focus();
          } else {
            console.warn('Cell node or focus method not available');
          }
          
          // Force a selection event via programmatic click
          try {
            const clickEvent = new MouseEvent('mousedown', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            cell.node.dispatchEvent(clickEvent);
            
            const mouseUpEvent = new MouseEvent('mouseup', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            cell.node.dispatchEvent(mouseUpEvent);
            
            console.log('Dispatched mouse events to ensure cell selection');
          } catch (e) {
            console.warn('Error dispatching mouse events:', e);
          }
          
          console.log(`Successfully activated cell at index ${cellIndex}`);
          return true;
        } catch (innerError) {
          console.error('Error while focusing cell:', innerError);
          return false;
        }
      }
      
      console.error(`Failed to activate cell at index ${cellIndex}: Cell not found`);
      return false;
    } catch (error) {
      console.error('Error activating cell:', error);
      return false;
    }
  }

  getCellContent(index: number): string {
    if (!this.notebook || !this.notebook.model) {
      throw new Error('No active notebook');
    }
    const cell = this.notebook.model.cells.get(index);
    return cell ? cell.sharedModel.getSource() : '';
  }

  getAllCellsContent(): string {
    if (!this.notebook || !this.notebook.model) {
      throw new Error('No active notebook');
    }
    const cells = this.notebook.model.cells;
    let content = '';
    for (let i = 0; i < cells.length; i++) {
      const cell = cells.get(i);
      content += `Cell ${i + 1}:\n${cell.sharedModel.getSource()}\n\n`;
    }
    return content;
  }
}