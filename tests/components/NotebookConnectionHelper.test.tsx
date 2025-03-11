import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotebookConnectionHelper } from '../../ollama_jupyter_ai/labextension/src/components/NotebookConnectionHelper';
import { NotebookService } from '../../ollama_jupyter_ai/labextension/src/services/NotebookService';
import { ISignal } from '@lumino/signaling';

// Mock the necessary dependencies
jest.mock('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext', () => {
  const originalModule = jest.requireActual('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
  return {
    ...originalModule,
    useAIAssistant: jest.fn(),
    AIAssistantContext: {
      Provider: ({ children }) => children,
    },
  };
});

jest.mock('../../ollama_jupyter_ai/labextension/src/services/NotebookService');

// Mock FontAwesome to avoid issues with icon rendering
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <div data-testid="mock-icon" />
}));

// Create a type for the mock versions we're using
interface MockISignal<S, T> {
  connect: jest.Mock;
  disconnect: jest.Mock;
}

// Add mock signal creator
const createMockSignal = (): MockISignal<any, any> => {
  return {
    connect: jest.fn(),
    disconnect: jest.fn()
  };
};

describe('NotebookConnectionHelper Component', () => {
  // Mock data for the notebook tracker with improved type safety
  const createMockNotebookTracker = (options = {}) => {
    const defaults = {
      currentWidget: {
        content: {
          activeCellIndex: 0,
          widgets: [
            { 
              node: { 
                focus: jest.fn(),
                dispatchEvent: jest.fn()
              },
              model: { 
                toString: () => 'test cell content',
                type: 'code'
              }
            }
          ],
          activeCellChanged: createMockSignal()
        },
        node: {
          focus: jest.fn()
        },
        model: {
          cells: {
            get: (index) => ({ 
              sharedModel: { 
                getSource: () => 'test cell content' 
              } 
            }),
            length: 1
          }
        },
        sessionContext: {
          statusChanged: createMockSignal()
        }
      },
      activeCell: {
        model: {
          toString: () => 'test cell content',
          type: 'code'
        },
        node: {
          focus: jest.fn()
        }
      },
      // Required INotebookTracker signals
      currentChanged: createMockSignal(),
      activeCellChanged: createMockSignal(),
      selectionChanged: createMockSignal(),
      widgetAdded: createMockSignal(),
      widgetUpdated: createMockSignal(),
      restored: createMockSignal(),
      // Required INotebookTracker properties
      size: 1,
      find: jest.fn(),
      filter: jest.fn(),
      forEach: jest.fn(),
      iter: jest.fn(),
      onCurrentChanged: jest.fn(),
      dispose: jest.fn(),
      has: jest.fn(),
      inject: jest.fn(),
      isDisposed: false
    };
    
    return {
      ...defaults,
      ...options
    };
  };

  // Mock useAIAssistant hook data with improved structure
  const createMockUseAIAssistant = (options = {}) => {
    const defaults = {
      hasActiveNotebook: true,
      activeCellContent: {
        content: 'test cell content',
        cellType: 'code',
        index: 0
      },
      refreshActiveCellContent: jest.fn(),
      refreshNotebookContent: jest.fn(),
      notebookContent: 'test notebook content'
    };
    
    return {
      ...defaults,
      ...options
    };
  };
  
  beforeEach(() => {
    // Set up mock implementation for NotebookService with improved return values
    (NotebookService as jest.MockedClass<typeof NotebookService>).mockImplementation(() => ({
      setNotebook: jest.fn(),
      activateCell: jest.fn().mockReturnValue(true),
      getCellContent: jest.fn().mockReturnValue('test cell content'),
      getAllCellsContent: jest.fn().mockReturnValue('test notebook content'),
      insertCell: jest.fn(),
      deleteCell: jest.fn(),
      moveCell: jest.fn(),
      executeCell: jest.fn().mockResolvedValue(undefined)
    } as any));
    
    // Reset useAIAssistant mock
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReset();
    
    // Reset timer mocks
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  test('should display success message when notebook is properly connected', async () => {
    // Mock the hook to return successful connection
    const mockAIAssistant = createMockUseAIAssistant();
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReturnValue(mockAIAssistant);
    
    let rendered;
    await act(async () => {
      // Render the component with a mock tracker that has all required properties
      rendered = render(<NotebookConnectionHelper notebooks={createMockNotebookTracker() as any} />);
    });
    
    // Mock that the component has determined connection is successful
    await act(async () => {
      // Trigger setState by calling checkConnection logic instead of advancing timers
      const currentElement = rendered.container.querySelector('.jp-AIAssistant-connection-checking');
      expect(currentElement).toBeInTheDocument();
      
      // Force the component state to 'connected'
      // This is done by simulating the effect of a successful connection check
      jest.advanceTimersByTime(300);
    });
    
    // Now check that we have a connected status
    const connectedElement = rendered.container.querySelector('.jp-AIAssistant-connection-connected');
    expect(connectedElement).toBeInTheDocument();
    expect(connectedElement).toHaveAttribute('title', 'Connected to notebook');
  });

  test('should display error message when no active cell is found', async () => {
    // Mock the hook to return data without active cell content
    const mockAIAssistant = createMockUseAIAssistant({ activeCellContent: null });
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReturnValue(mockAIAssistant);
    
    // Create a mock tracker with no active cell
    const mockTracker = createMockNotebookTracker({ activeCell: null });
    
    let rendered;
    await act(async () => {
      // Render the component
      rendered = render(<NotebookConnectionHelper notebooks={mockTracker as any} />);
    });
    
    // Act: Trigger the setTimeout in the component
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    
    // Assert: Check that the appropriate error message is in the title attribute
    const indicator = rendered.container.querySelector('.jp-AIAssistant-connection-disconnected');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('title', 'Not connected to notebook - please select a cell');
  });

  test('should display error message when no active notebook is found', async () => {
    // Mock the hook to return data without active notebook
    const mockAIAssistant = createMockUseAIAssistant({ activeCellContent: null, hasActiveNotebook: false });
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReturnValue(mockAIAssistant);
    
    // Create a mock tracker with no current widget
    const mockTracker = createMockNotebookTracker({ currentWidget: null });
    
    let rendered;
    await act(async () => {
      // Render the component
      rendered = render(<NotebookConnectionHelper notebooks={mockTracker as any} />);
    });
    
    // Act: Trigger the setTimeout in the component
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    
    // Assert: Check that the appropriate error message is in the title attribute
    const indicator = rendered.container.querySelector('.jp-AIAssistant-connection-disconnected');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('title', 'Not connected to notebook - please select a cell');
  });

  test('should attempt to fix notebook connection when indicator is clicked', async () => {
    // Mock the hook to return data without active cell content
    const mockAIAssistant = createMockUseAIAssistant({ activeCellContent: null });
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReturnValue(mockAIAssistant);
    
    // Create a mock notebook tracker with the required properties
    const mockTracker = createMockNotebookTracker();
    
    let rendered;
    await act(async () => {
      // Render the component
      rendered = render(<NotebookConnectionHelper notebooks={mockTracker as any} />);
    });
    
    // Act: Trigger the setTimeout to move to disconnected state
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    
    // Find and click the connection indicator
    const indicator = rendered.container.querySelector('.jp-AIAssistant-connection-disconnected');
    expect(indicator).toBeInTheDocument();
    
    // Reset the mock to ensure we only count new calls
    mockAIAssistant.refreshActiveCellContent.mockClear();
    
    // Click the indicator to trigger the retry
    await act(async () => {
      fireEvent.click(indicator);
      // Advance timers to allow the code inside onClick to execute
      jest.advanceTimersByTime(300);
    });
    
    // Check that refreshActiveCellContent was called as part of the fix
    expect(mockAIAssistant.refreshActiveCellContent).toHaveBeenCalled();
  });

  test('should continue checking notebook status at regular intervals', async () => {
    // Mock the hook to return data with an error state initially
    const mockAIAssistant = createMockUseAIAssistant({ activeCellContent: null });
    const { useAIAssistant } = require('../../ollama_jupyter_ai/labextension/src/context/AIAssistantContext');
    useAIAssistant.mockReturnValue(mockAIAssistant);
    
    // Create a mock tracker
    const mockTracker = createMockNotebookTracker();
    
    await act(async () => {
      // Render the component
      render(<NotebookConnectionHelper notebooks={mockTracker as any} />);
    });
    
    // Reset the mock to count new calls
    mockAIAssistant.refreshActiveCellContent.mockClear();
    
    // Reset the mock to track calls to checkConnection
    const originalConsoleLog = console.log;
    let checkConnectionCalled = false;
    console.log = jest.fn().mockImplementation((message) => {
      if (message.includes('Notebook changed - resetting connection state')) {
        checkConnectionCalled = true;
      }
      originalConsoleLog(message);
    });
    
    // Simulate a notebook change
    await act(async () => {
      const currentChanged = mockTracker.currentChanged;
      // Trigger the currentChanged signal
      currentChanged.connect.mock.calls[0][0]();
    });
    
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Verify the notebook change was detected
    expect(checkConnectionCalled).toBe(true);
  });
}); 