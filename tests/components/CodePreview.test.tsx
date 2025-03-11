import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CodePreview } from '../../ollama_jupyter_ai/labextension/src/components/CodePreview';

describe('CodePreview Component', () => {
  // Sample code for testing
  const sampleCode = `def hello_world():
    print("Hello, world!")
    return 42`;
  
  const sampleOriginalCode = `def hello():
    print("Hello!")
    return 0`;
  
  test('renders code with syntax highlighting', () => {
    render(<CodePreview code={sampleCode} language="python" />);
    
    // Should display the language
    expect(screen.getByText('PYTHON')).toBeInTheDocument();
    
    // Can't test exact text content with dangerouslySetInnerHTML
    // Instead, verify the structure is rendered correctly
    const codeLines = document.querySelectorAll('.jp-AIAssistant-code-line');
    expect(codeLines.length).toBe(3); // Our sample has 3 lines
    
    // Check if the line number elements exist
    const lineNumbers = document.querySelectorAll('.jp-AIAssistant-code-line-number');
    expect(lineNumbers.length).toBe(3);
    expect(lineNumbers[0].textContent).toBe('1');
    expect(lineNumbers[1].textContent).toBe('2');
    expect(lineNumbers[2].textContent).toBe('3');
    
    // Should have copy button
    expect(screen.getByTitle('Copy code')).toBeInTheDocument();
  });
  
  test('shows diff view when diff button is clicked', async () => {
    render(
      <CodePreview 
        code={sampleCode} 
        originalCode={sampleOriginalCode}
        language="python" 
      />
    );
    
    // Diff button should be present when originalCode is provided
    const diffButton = screen.getByText('Diff');
    expect(diffButton).toBeInTheDocument();
    
    // Click the diff button
    await act(async () => {
      fireEvent.click(diffButton);
    });
    
    // Should show "Normal" button after switching to diff view
    expect(screen.getByText('Normal')).toBeInTheDocument();
    
    // Should show removed lines (from originalCode)
    const removedElements = document.querySelectorAll('.jp-AIAssistant-code-line.removed');
    expect(removedElements.length).toBeGreaterThan(0);
    
    // Should show added lines (from new code)
    const addedElements = document.querySelectorAll('.jp-AIAssistant-code-line.added');
    expect(addedElements.length).toBeGreaterThan(0);
  });
  
  test('applies code when apply button is clicked', async () => {
    const mockApply = jest.fn();
    
    render(
      <CodePreview 
        code={sampleCode} 
        language="python" 
        onApply={mockApply}
      />
    );
    
    // Apply button should be present when onApply is provided
    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeInTheDocument();
    
    // Click the apply button
    await act(async () => {
      fireEvent.click(applyButton);
    });
    
    // Should call onApply with the code
    expect(mockApply).toHaveBeenCalledWith(sampleCode);
  });
  
  test('supports undo/redo functionality', async () => {
    const mockUndo = jest.fn();
    const mockRedo = jest.fn();
    
    render(
      <CodePreview 
        code={sampleCode} 
        language="python" 
        onUndo={mockUndo}
        onRedo={mockRedo}
        hasHistory={true}
      />
    );
    
    // Undo and redo buttons should be present when hasHistory is true
    const undoButton = screen.getByTitle('Undo');
    const redoButton = screen.getByTitle('Redo');
    
    expect(undoButton).toBeInTheDocument();
    expect(redoButton).toBeInTheDocument();
    
    // Click the undo button
    await act(async () => {
      fireEvent.click(undoButton);
    });
    expect(mockUndo).toHaveBeenCalledTimes(1);
    
    // Click the redo button
    await act(async () => {
      fireEvent.click(redoButton);
    });
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });
  
  test('copies code to clipboard when copy button is clicked', async () => {
    // Mock clipboard API using spyOn instead of direct assignment
    const writeTextMock = jest.spyOn(navigator.clipboard, 'writeText')
      .mockImplementation(() => Promise.resolve());
    
    render(<CodePreview code={sampleCode} language="python" />);
    
    // Find and click the copy button
    const copyButton = screen.getByTitle('Copy code');
    await act(async () => {
      fireEvent.click(copyButton);
    });
    
    // Check if navigator.clipboard.writeText was called with the correct code
    expect(writeTextMock).toHaveBeenCalledWith(sampleCode);
    
    // Restore original implementation
    writeTextMock.mockRestore();
  });
}); 