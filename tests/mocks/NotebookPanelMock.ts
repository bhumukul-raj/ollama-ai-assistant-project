/**
 * Mocks of JupyterLab Notebook classes for testing
 */

export class MockCellModel {
  value = { text: '' };
  type = 'code';

  constructor(public content: string = '', public cellType: string = 'code') {
    this.value.text = content;
    this.type = cellType;
  }

  toString() {
    return this.value.text;
  }

  getValue() {
    return this.value.text;
  }

  setValue(text: string) {
    this.value.text = text;
  }
}

export class MockCell {
  model: MockCellModel;
  
  constructor(content: string = '', cellType: string = 'code') {
    this.model = new MockCellModel(content, cellType);
  }
}

export class MockCodeCell extends MockCell {
  constructor(content: string = '') {
    super(content, 'code');
  }
}

export class MockMarkdownCell extends MockCell {
  constructor(content: string = '') {
    super(content, 'markdown');
  }
}

export class MockNotebookModel {
  cells: MockCellModel[] = [];
  
  constructor(cellContents: string[] = []) {
    this.cells = cellContents.map(content => new MockCellModel(content));
  }
}

export class MockNotebookContent {
  widgets: MockCell[] = [];
  activeCellIndex = 0;
  
  constructor(cells: MockCell[] = []) {
    this.widgets = cells;
  }
  
  get activeCell(): MockCell | null {
    if (this.activeCellIndex >= 0 && this.activeCellIndex < this.widgets.length) {
      return this.widgets[this.activeCellIndex];
    }
    return null;
  }
  
  activateCell(index: number): void {
    if (index >= 0 && index < this.widgets.length) {
      this.activeCellIndex = index;
    }
  }
}

export class MockNotebookPanel {
  content: MockNotebookContent;
  model: MockNotebookModel | null = null;
  
  constructor(cellContents: string[] = []) {
    const cells = cellContents.map(content => new MockCodeCell(content));
    this.content = new MockNotebookContent(cells);
    this.model = new MockNotebookModel(cellContents);
  }
  
  get context() {
    return {
      path: 'test-notebook.ipynb',
      isReady: true
    };
  }
}

export class MockNotebookTracker {
  currentWidget: MockNotebookPanel | null = null;
  
  constructor(notebookPanel: MockNotebookPanel | null = null) {
    this.currentWidget = notebookPanel;
  }
  
  setCurrentWidget(notebook: MockNotebookPanel | null) {
    this.currentWidget = notebook;
  }
}

/**
 * Helper function to create a mock notebook with specified cell contents
 */
export function createMockNotebook(cellContents: string[] = []): MockNotebookPanel {
  return new MockNotebookPanel(cellContents);
}

/**
 * Helper function to create a mock notebook tracker with a notebook
 */
export function createMockNotebookTracker(cellContents: string[] = []): MockNotebookTracker {
  const notebook = cellContents.length ? createMockNotebook(cellContents) : null;
  return new MockNotebookTracker(notebook);
} 