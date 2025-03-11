// Set up DOM environment for React testing
require('@testing-library/jest-dom');

// Mock for requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};

// Mock for matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock for clipboard API
Object.defineProperty(window.navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
});

// Create more comprehensive mocks for JupyterLab notebook
const createMockConnectableSignal = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
});

// Mock for JupyterLab modules
jest.mock('@jupyterlab/application', () => ({}));

jest.mock('@jupyterlab/apputils', () => ({
  ISessionContext: { /* mock token */ }
}));

jest.mock('@jupyterlab/notebook', () => {
  const mockToken = {
    _tokenStructure: true
  };
  
  class MockCell {
    constructor() {
      this.node = {
        focus: jest.fn(),
        dispatchEvent: jest.fn()
      };
      this.model = {
        toString: () => 'cell content',
        type: 'code'
      };
    }
  }
  
  class MockCodeCell extends MockCell {
    constructor() {
      super();
      this.model.type = 'code';
      this.outputArea = {
        model: {
          clear: jest.fn()
        }
      };
    }
  }
  
  class MockMarkdownCell extends MockCell {
    constructor() {
      super();
      this.model.type = 'markdown';
    }
  }
  
  class MockNotebook {
    constructor() {
      this.activeCellIndex = 0;
      this.widgets = [new MockCodeCell()];
      this.activeCellChanged = createMockConnectableSignal();
      this.selectionChanged = createMockConnectableSignal();
    }
    
    get activeCell() {
      return this.widgets[this.activeCellIndex] || null;
    }
  }
  
  class MockNotebookPanel {
    constructor() {
      this.content = new MockNotebook();
      this.sessionContext = {};
      this.node = {
        focus: jest.fn()
      };
      this.model = {
        cells: {
          get: jest.fn().mockImplementation(index => ({
            sharedModel: {
              getSource: () => 'cell content'
            }
          })),
          length: 1
        }
      };
    }
  }
  
  return {
    NotebookPanel: MockNotebookPanel,
    Notebook: MockNotebook,
    CodeCell: MockCodeCell,
    MarkdownCell: MockMarkdownCell,
    INotebookTracker: mockToken,
    NotebookActions: {
      insertBelow: jest.fn(),
      deleteCells: jest.fn(),
      moveUp: jest.fn(),
      moveDown: jest.fn(),
      changeCellType: jest.fn()
    }
  };
});

jest.mock('@jupyterlab/services', () => ({}));
jest.mock('@jupyterlab/ui-components', () => ({}));
jest.mock('@lumino/widgets', () => ({
  Widget: class {}
}));
jest.mock('@lumino/signaling', () => ({
  Signal: class {
    static createSignal() {
      return createMockConnectableSignal();
    }
  }
}));

// Mock for the global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignore React-specific warnings
  if (typeof args[0] === 'string' && 
      (args[0].includes('React does not recognize the') || 
       args[0].includes('Invalid prop'))) {
    return;
  }
  originalConsoleError(...args);
}; 