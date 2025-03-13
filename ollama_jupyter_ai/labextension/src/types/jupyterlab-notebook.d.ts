/**
 * @file jupyterlab-notebook.d.ts
 * @description TypeScript declaration file for JupyterLab notebook-related modules.
 * 
 * This file provides simplified type definitions for JupyterLab notebook components
 * required by the Ollama extension. It includes interfaces and classes for working
 * with notebooks, cells, and related actions. These type definitions enable the
 * extension to interact with JupyterLab's notebook system while maintaining 
 * type safety.
 * 
 * Key components defined:
 * - INotebookTracker: For tracking active notebooks
 * - NotebookPanel: The main container widget for notebooks
 * - Notebook: The widget that contains cells
 * - NotebookActions: Static methods for notebook operations
 */

// This is a simplified declaration file for JupyterLab/notebook
declare module '@jupyterlab/notebook' {
  import { ISignal } from '@lumino/signaling';
  import { Widget } from '@lumino/widgets';
  import { Cell, ICellModel, CodeCell } from '@jupyterlab/cells';
  import { ISessionContext } from '@jupyterlab/apputils';
  import { Token } from '@lumino/coreutils';

  /**
   * Token for the notebook tracker, used for dependency injection
   */
  export const INotebookTracker: Token<INotebookTracker>;

  /**
   * Interface for tracking notebooks in the application
   * 
   * @interface INotebookTracker
   * @property {NotebookPanel | null} currentWidget - The currently focused notebook panel
   * @property {Cell | null} activeCell - The currently active cell in the active notebook 
   * @property {ISignal<any, NotebookPanel | null>} currentChanged - Signal emitted when the current notebook changes
   */
  export interface INotebookTracker {
    currentWidget: NotebookPanel | null;
    activeCell: Cell | null;
    currentChanged: ISignal<any, NotebookPanel | null>;
  }

  /**
   * The main panel that hosts a notebook instance
   * 
   * @class NotebookPanel
   * @extends Widget
   * @property {Notebook} content - The notebook widget containing the cells
   * @property {INotebookModel} model - The data model for the notebook
   * @property {ISessionContext} sessionContext - The session context for kernel interaction
   */
  export class NotebookPanel extends Widget {
    content: Notebook;
    model: INotebookModel;
    sessionContext: ISessionContext;
  }

  /**
   * Interface for the notebook data model
   * 
   * @interface INotebookModel
   * @property {object} cells - Collection of cell models in the notebook
   * @property {Function} cells.get - Method to get a cell model by index
   * @property {number} cells.length - Number of cells in the notebook
   */
  export interface INotebookModel {
    cells: {
      get(index: number): ICellModel;
      length: number;
    };
  }

  /**
   * The notebook widget that contains and manages individual cells
   * 
   * @class Notebook
   * @extends Widget
   * @property {Cell[]} widgets - Array of cell widgets in the notebook
   * @property {number} activeCellIndex - Index of the currently active cell
   * @property {Cell | null} activeCell - The currently active cell
   * @property {ISignal<Notebook, Cell>} activeCellChanged - Signal emitted when the active cell changes
   */
  export class Notebook extends Widget {
    widgets: Cell[];
    activeCellIndex: number;
    activeCell: Cell | null;
    activeCellChanged: ISignal<Notebook, Cell>;
  }

  /**
   * Static class with methods for notebook operations
   * 
   * @class NotebookActions
   * @property {Function} insertBelow - Static method to insert a cell below the current one
   * @property {Function} deleteCells - Static method to delete selected cells
   * @property {Function} moveUp - Static method to move selected cells up
   * @property {Function} moveDown - Static method to move selected cells down
   * @property {Function} changeCellType - Static method to change the type of selected cells
   */
  export class NotebookActions {
    static insertBelow(notebook: Notebook): void;
    static deleteCells(notebook: Notebook): void;
    static moveUp(notebook: Notebook): void;
    static moveDown(notebook: Notebook): void;
    static changeCellType(notebook: Notebook, type: string): void;
  }
} 