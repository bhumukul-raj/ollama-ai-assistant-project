import { renderHook, act } from '@testing-library/react-hooks';
import { useNotebookContent } from '../../ollama_jupyter_ai/labextension/src/hooks/useNotebookContent';
import { NotebookService } from '../../ollama_jupyter_ai/labextension/src/services/NotebookService';

// Mock the notebook service
jest.mock('../../ollama_jupyter_ai/labextension/src/services/NotebookService');

describe('useNotebookContent hook', () => {
  let mockNotebookTracker: any;
  let mockNotebookService: jest.Mocked<NotebookService>;

  beforeEach(() => {
    // Create mock notebook tracker
    mockNotebookTracker = {
      currentWidget: {
        content: {
          activeCellIndex: 0,
          activeCell: {
            model: {
              type: 'code',
              toString: () => 'test cell content'
            }
          },
          activeCellChanged: {
            connect: jest.fn(),
            disconnect: jest.fn()
          }
        },
        sessionContext: {}
      },
      currentChanged: {
        connect: jest.fn(),
        disconnect: jest.fn()
      }
    };

    // Set up mock implementation for NotebookService
    mockNotebookService = {
      setNotebook: jest.fn(),
      getAllCellsContent: jest.fn().mockReturnValue('all cells content'),
      getCellContent: jest.fn().mockReturnValue('cell content'),
      activateCell: jest.fn().mockReturnValue(true),
      insertCell: jest.fn(),
      deleteCell: jest.fn(),
      moveCell: jest.fn(),
      executeCell: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<NotebookService>;

    // Mock the constructor to return our prepared mock
    (NotebookService as jest.MockedClass<typeof NotebookService>).mockImplementation(() => mockNotebookService);
  });

  test('should initialize with notebook content when notebook is available', () => {
    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Check if notebook content was set
    expect(result.current.notebookContent).toBe('all cells content');
    expect(result.current.hasActiveNotebook).toBe(true);
    expect(mockNotebookService.getAllCellsContent).toHaveBeenCalled();
  });

  test('should set active cell content when a cell is selected', () => {
    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Check if active cell content was set
    expect(result.current.activeCellContent).toEqual({
      content: 'cell content',
      cellType: 'code',
      index: 0
    });
    expect(mockNotebookService.getCellContent).toHaveBeenCalledWith(0);
  });

  test('should attempt to activate cell when no active cell is found', () => {
    // Set up tracker with no active cell
    mockNotebookTracker.currentWidget.content.activeCell = null;

    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Check if activateCell was called
    expect(mockNotebookService.activateCell).toHaveBeenCalled();
  });

  test('should handle case when activateCell fails', () => {
    // Set up tracker with no active cell
    mockNotebookTracker.currentWidget.content.activeCell = null;
    
    // Make activateCell fail
    mockNotebookService.activateCell.mockReturnValue(false);

    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Check if activeCellContent is null due to failed activation
    expect(result.current.activeCellContent).toBeNull();
  });

  test('should refresh active cell content when refreshActiveCellContent is called', () => {
    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Reset mock to track new calls
    mockNotebookService.getCellContent.mockClear();

    // Call refreshActiveCellContent
    act(() => {
      result.current.refreshActiveCellContent();
    });

    // Check if getCellContent was called again
    expect(mockNotebookService.getCellContent).toHaveBeenCalledWith(0);
  });

  test('should handle notebook changes', () => {
    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Simulate notebook change by accessing the currentChanged callback
    const notebookChangedCallback = mockNotebookTracker.currentChanged.connect.mock.calls[0][0];
    
    // Create a new notebook panel
    const newNotebookPanel = {
      content: {
        activeCellIndex: 1,
        activeCell: {
          model: {
            type: 'markdown',
            toString: () => 'new cell content'
          }
        },
        activeCellChanged: {
          connect: jest.fn(),
          disconnect: jest.fn()
        }
      }
    };

    // Reset service mocks
    mockNotebookService.setNotebook.mockClear();
    mockNotebookService.getAllCellsContent.mockClear();
    mockNotebookService.getCellContent.mockClear();
    
    // Mock getCellContent to return new content
    mockNotebookService.getCellContent.mockReturnValue('new cell content');
    mockNotebookService.getAllCellsContent.mockReturnValue('new notebook content');

    // Simulate notebook change
    act(() => {
      notebookChangedCallback(mockNotebookTracker, newNotebookPanel);
    });

    // Check if services were called with new notebook
    expect(mockNotebookService.setNotebook).toHaveBeenCalledWith(newNotebookPanel);
    expect(mockNotebookService.getAllCellsContent).toHaveBeenCalled();
    expect(mockNotebookService.getCellContent).toHaveBeenCalledWith(1);
  });

  test('should handle case when no notebook is available', () => {
    // Set up tracker with no current widget
    mockNotebookTracker.currentWidget = null;

    // Render the hook
    const { result } = renderHook(() => useNotebookContent(mockNotebookTracker));

    // Check if notebook content and active cell content are empty
    expect(result.current.notebookContent).toBe('');
    expect(result.current.activeCellContent).toBeNull();
    expect(result.current.hasActiveNotebook).toBe(false);
  });
}); 