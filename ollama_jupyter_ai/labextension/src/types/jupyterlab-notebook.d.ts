// This is a simplified declaration file for JupyterLab/notebook
declare module '@jupyterlab/notebook' {
  import { ISignal } from '@lumino/signaling';
  import { Widget } from '@lumino/widgets';
  import { Cell, ICellModel, CodeCell } from '@jupyterlab/cells';
  import { ISessionContext } from '@jupyterlab/apputils';
  import { Token } from '@lumino/coreutils';

  // Add token for dependency injection
  export const INotebookTracker: Token<INotebookTracker>;

  export interface INotebookTracker {
    currentWidget: NotebookPanel | null;
    activeCell: Cell | null;
    currentChanged: ISignal<any, NotebookPanel | null>;
  }

  export class NotebookPanel extends Widget {
    content: Notebook;
    model: INotebookModel;
    sessionContext: ISessionContext;
  }

  export interface INotebookModel {
    cells: { 
      get(index: number): ICellModel; 
      length: number;
    };
  }

  export class Notebook extends Widget {
    widgets: Cell[];
    activeCellIndex: number;
    activeCell: Cell | null;
    activeCellChanged: ISignal<Notebook, Cell>;
  }

  export class NotebookActions {
    static insertBelow(notebook: Notebook): void;
    static deleteCells(notebook: Notebook): void;
    static moveUp(notebook: Notebook): void;
    static moveDown(notebook: Notebook): void;
    static changeCellType(notebook: Notebook, type: string): void;
  }
} 