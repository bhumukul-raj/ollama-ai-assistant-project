import { NotebookService } from '../../ollama_jupyter_ai/labextension/src/services/NotebookService';
import { 
  createMockNotebook, 
  MockNotebookPanel 
} from '../mocks/NotebookPanelMock';

describe('NotebookService', () => {
  let notebookService: NotebookService;
  let mockNotebookPanel: MockNotebookPanel;
  
  beforeEach(() => {
    // Create a mock notebook with sample cell contents
    const cellContents = [
      'print("Hello World")',
      'import pandas as pd\ndf = pd.DataFrame({"A": [1, 2, 3]})',
      'df.head()'
    ];
    mockNotebookPanel = createMockNotebook(cellContents);
    
    // Add necessary properties for NotebookService's activateCell method to work
    (mockNotebookPanel as any).node = { focus: jest.fn() };
    (mockNotebookPanel.content.widgets[0] as any).node = { focus: jest.fn() };
    (mockNotebookPanel.content.widgets[1] as any).node = { focus: jest.fn() };
    (mockNotebookPanel.content.widgets[2] as any).node = { focus: jest.fn() };
    
    // Create the service
    notebookService = new NotebookService();
    notebookService.setNotebook(mockNotebookPanel as any);
  });
  
  describe('activateCell', () => {
    test('activates the first cell when no index is provided', () => {
      // Call method
      const result = notebookService.activateCell();
      
      // Verify cell was activated
      expect(result).toBe(true);
      expect(mockNotebookPanel.content.activeCellIndex).toBe(0);
    });
    
    test('activates a specific cell when index is provided', () => {
      // Call method with index 1
      const result = notebookService.activateCell(1);
      
      // Verify that cell at index 1 was activated
      expect(result).toBe(true);
      expect(mockNotebookPanel.content.activeCellIndex).toBe(1);
    });
    
    test('handles indices outside the valid range', () => {
      // Initial state
      mockNotebookPanel.content.activeCellIndex = 0;
      
      // Try to activate a cell with an invalid index
      const result = notebookService.activateCell(99);
      
      // Should return false for invalid index
      expect(result).toBe(false);
    });
    
    test('handles null notebook gracefully', () => {
      // Create a new service without a notebook
      const emptyService = new NotebookService();
      
      // This should not throw an error and return false
      expect(emptyService.activateCell()).toBe(false);
    });
  });
  
  describe('getCellContent', () => {
    test('retrieves content from a specific cell by index', () => {
      // Setup a mock for notebook model
      const mockNotebook = {
        model: {
          cells: {
            get: jest.fn().mockImplementation((idx) => {
              const content = [
                'print("Hello World")',
                'import pandas as pd\ndf = pd.DataFrame({"A": [1, 2, 3]})',
                'df.head()'
              ][idx];
              return {
                sharedModel: {
                  getSource: () => content
                }
              };
            })
          }
        }
      };
      
      // Set the service to use this notebook
      const service = new NotebookService();
      service.setNotebook(mockNotebook as any);
      
      // Get content of first cell
      const content = service.getCellContent(0);
      
      // Verify
      expect(content).toBe('print("Hello World")');
    });
    
    test('returns empty string for invalid cell index', () => {
      // Setup with empty cell
      const mockNotebook = {
        model: {
          cells: {
            get: jest.fn().mockReturnValue(null)
          }
        }
      };
      
      // Set the notebook
      const service = new NotebookService();
      service.setNotebook(mockNotebook as any);
      
      // Get content from non-existent cell
      const content = service.getCellContent(99);
      
      // Should return empty string
      expect(content).toBe('');
    });
    
    test('throws error when notebook is null', () => {
      // Create a service without a notebook
      const emptyService = new NotebookService();
      
      // Should throw an error
      expect(() => emptyService.getCellContent(0)).toThrow('No active notebook');
    });
  });
  
  describe('getAllCellsContent', () => {
    test('retrieves content from all cells', () => {
      // Setup mock model
      const cellContents = [
        'print("Hello World")',
        'import pandas as pd\ndf = pd.DataFrame({"A": [1, 2, 3]})',
        'df.head()'
      ];
      
      const mockNotebook = {
        model: {
          cells: {
            length: cellContents.length,
            get: jest.fn().mockImplementation((idx) => ({
              sharedModel: {
                getSource: () => cellContents[idx]
              }
            }))
          }
        }
      };
      
      const service = new NotebookService();
      service.setNotebook(mockNotebook as any);
      
      // Get all cells content
      const content = service.getAllCellsContent();
      
      // Verify content format matches implementation
      expect(content).toContain('Cell 1');
      expect(content).toContain('Cell 2');
      expect(content).toContain('Cell 3');
      expect(content).toContain('print("Hello World")');
      expect(content).toContain('import pandas as pd');
      expect(content).toContain('df.head()');
    });
    
    test('throws error when notebook is null', () => {
      // Create a service without a notebook
      const emptyService = new NotebookService();
      
      // Should throw an error
      expect(() => emptyService.getAllCellsContent()).toThrow('No active notebook');
    });
  });
}); 