import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { Cell, ICellModel, CodeCell } from '@jupyterlab/cells';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faLightbulb, faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Message } from '@lumino/messaging';
import { OllamaService } from '../services/OllamaService';
import { IOutput, IStream, IError, IExecuteResult, IDisplayData } from '@jupyterlab/nbformat';

// Define action types for the buttons
export type ActionType = 'ask' | 'analyze' | 'improve';

interface CellToolbarButtonProps {
  cell: Cell<ICellModel>;
  onClick: (actionType: ActionType) => void;
  isActive?: boolean;
}

// Global cache for storing panel states across cells
const panelStateCache = new Map<string, Record<ActionType, string>>();

// Global variable to track pending requests to prevent duplicates
const pendingRequests = new Map<string, boolean>();

// Initialize Ollama service
const ollamaService = new OllamaService();

const CellToolbarButton: React.FC<CellToolbarButtonProps> = ({ cell, onClick, isActive = false }) => {
  console.log('[Ollama Debug] Rendering CellToolbarButton component, active:', isActive);

  // State for active popup panels
  const [activePanels, setActivePanels] = useState<ActionType[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<ActionType, boolean>>({
    ask: false,
    analyze: false,
    improve: false
  });
  const [responses, setResponses] = useState<Record<ActionType, string>>({
    ask: '',
    analyze: '',
    improve: ''
  });

  // Refs to track panel heights for stacking
  const panelRefs = useRef<Record<ActionType, HTMLDivElement | null>>({
    ask: null,
    analyze: null,
    improve: null
  });

  // Keep track of render count to debug excessive re-renders
  const renderCount = useRef(0);
  renderCount.current++;

  // Memoized function to get cell content to prevent unnecessary recalculations
  const getCellContent = useCallback(() => {
    const cellContent = cell.model.sharedModel.source;
    let outputContent = '';

    // Get output if it's a code cell
    if (cell instanceof CodeCell) {
      const outputs = cell.outputArea.model.toJSON() as IOutput[];
      outputContent = outputs.map(output => {
        if (output.output_type === 'stream') {
          return (output as IStream).text;
        } else if (output.output_type === 'error') {
          const errorOutput = output as IError;
          return `Error: ${errorOutput.ename}\n${errorOutput.evalue}\n${errorOutput.traceback.join('\n')}`;
        } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
          const dataOutput = output as IExecuteResult | IDisplayData;
          const textData = dataOutput.data['text/plain'];
          return Array.isArray(textData) ? textData.join('\n') : textData || '';
        }
        return '';
      }).join('\n');
    }

    return { cellContent, outputContent };
  }, [cell]);

  // Effect to restore cached panel state when cell becomes active
  useEffect(() => {
    if (isActive && cell) {
      const cachedState = panelStateCache.get(cell.model.id);
      if (cachedState) {
        // Restore cached responses
        setResponses(prevResponses => {
          // Only update changed responses to prevent unnecessary rerenders
          const newResponses = { ...prevResponses };
          let changed = false;

          Object.entries(cachedState).forEach(([type, content]) => {
            if (newResponses[type as ActionType] !== content) {
              newResponses[type as ActionType] = content;
              changed = true;
            }
          });

          return changed ? newResponses : prevResponses;
        });
      }
    }
  }, [isActive, cell]);

  // Effect to hide panel when cell becomes inactive
  useEffect(() => {
    if (!isActive) {
      setActivePanels([]);
    }
  }, [isActive]);

  // Effect to adjust panel positions when panels change
  useEffect(() => {
    if (activePanels.length > 0) {
      updatePanelPositions();
    }
  }, [activePanels]);

  const updatePanelPositions = useCallback(() => {
    // Calculate positions for stacked panels
    const positions: Record<ActionType, { bottom: number }> = {
      ask: { bottom: -220 },
      analyze: { bottom: -220 },
      improve: { bottom: -220 }
    };

    // Sort active panels to ensure consistent stacking order
    const sortedPanels = [...activePanels].sort((a, b) => {
      const order: Record<ActionType, number> = { ask: 0, analyze: 1, improve: 2 };
      return order[a] - order[b];
    });

    // Calculate stacking positions
    let currentBottom = -220; // Initial bottom position
    for (let index = 0; index < sortedPanels.length; index++) {
      const panelType = sortedPanels[index];
      if (index > 0) {
        // Get height of previous panel
        const prevPanelType = sortedPanels[index - 1];
        const prevPanel = panelRefs.current[prevPanelType];
        const prevPanelHeight = prevPanel?.offsetHeight || 210;
        currentBottom -= (prevPanelHeight + 10); // 10px gap between panels
      }
      positions[panelType].bottom = currentBottom;
    }

    // Apply positions to each panel
    Object.entries(positions).forEach(([type, position]) => {
      const panel = panelRefs.current[type as ActionType];
      if (panel) {
        panel.style.bottom = `${position.bottom}px`;
      }
    });
  }, [activePanels]);

  const getButtonStyle = useCallback((isActive: boolean) => {
    return {
      transform: isActive ? 'scale(1)' : 'scale(0.9)',
      opacity: isActive ? 1 : 0,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: isActive ? 'auto' as const : 'none' as const
    };
  }, []);

  const getPromptForActionType = useCallback((actionType: ActionType, content: string, output: string) => {
    switch (actionType) {
      case 'ask':
        return `I have a Jupyter notebook cell with the following content:\n\nCode:\n${content}\n\nOutput:\n${output}\n\nPlease help me understand this code and its output.`;
      case 'analyze':
        return `Please analyze this Jupyter notebook cell:\n\nCode:\n${content}\n\nOutput:\n${output}\n\nProvide a detailed analysis of the code quality, potential issues, and performance considerations.`;
      case 'improve':
        return `Please suggest improvements for this Jupyter notebook cell:\n\nCode:\n${content}\n\nOutput:\n${output}\n\nProvide specific suggestions to improve the code's quality, readability, and efficiency.`;
      default:
        return '';
    }
  }, []);

  // Function to create a unique request key
  const getRequestKey = useCallback((cellId: string, actionType: ActionType) => {
    return `${cellId}_${actionType}`;
  }, []);

  const cacheResponse = useCallback((actionType: ActionType, content: string) => {
    if (!cell || !content) return;

    // Get existing cache for this cell or create a new one
    const existingCache = panelStateCache.get(cell.model.id) || {} as Record<ActionType, string>;

    // Update the cache with the new content
    const updatedCache = {
      ...existingCache,
      [actionType]: content
    };

    // Save the updated cache
    panelStateCache.set(cell.model.id, updatedCache);
    console.log(`[Ollama Debug] Cached response for ${actionType}, length: ${content.length}`);

    // Clear the pending request flag
    const requestKey = getRequestKey(cell.model.id, actionType);
    pendingRequests.delete(requestKey);
  }, [cell, getRequestKey]);

  const handleButtonClick = useCallback(async (actionType: ActionType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!cell) return;

    // Toggle panel state
    if (activePanels.includes(actionType)) {
      // If panel is already open, close it
      setActivePanels(prev => prev.filter(type => type !== actionType));
      return;
    }

    // Check if we have a cached response
    const cachedContent = panelStateCache.get(cell.model.id)?.[actionType];

    // Add panel to active panels
    setActivePanels(prev => [...prev, actionType]);

    // Create a unique key for this request
    const requestKey = getRequestKey(cell.model.id, actionType);

    // Set loading state if no cache and no pending request
    if (!cachedContent && !pendingRequests.has(requestKey)) {
      // Mark this request as pending to prevent duplicate requests
      pendingRequests.set(requestKey, true);

      // Update loading state
      setLoadingStates(prev => ({
        ...prev,
        [actionType]: true
      }));

      // Clear previous response
      setResponses(prev => ({
        ...prev,
        [actionType]: ''
      }));

      try {
        const { cellContent, outputContent } = getCellContent();
        const prompt = getPromptForActionType(actionType, cellContent, outputContent);

        // Create a variable to accumulate the streaming response
        let fullResponse = '';

        // Send request to Ollama
        await ollamaService.generateResponse(
          prompt,
          'mistral',
          undefined,
          (partialResponse: string, done: boolean) => {
            // Append the new chunk to our accumulator
            fullResponse += partialResponse;

            // Update the UI with the current accumulated response
            setResponses(prev => ({
              ...prev,
              [actionType]: fullResponse
            }));

            if (done) {
              // Update loading state when done
              setLoadingStates(prev => ({
                ...prev,
                [actionType]: false
              }));

              // Cache the complete response
              cacheResponse(actionType, fullResponse);
            }
          }
        );
      } catch (error) {
        console.error('Error getting Ollama response:', error);
        setResponses(prev => ({
          ...prev,
          [actionType]: 'Error: Failed to get response from Ollama'
        }));
        setLoadingStates(prev => ({
          ...prev,
          [actionType]: false
        }));

        // Clear the pending request flag on error
        pendingRequests.delete(requestKey);
      }
    } else if (cachedContent) {
      // Use cached response
      setResponses(prev => ({
        ...prev,
        [actionType]: cachedContent
      }));

      // Ensure loading state is false
      setLoadingStates(prev => ({
        ...prev,
        [actionType]: false
      }));
    }

    onClick(actionType);
  }, [cell, activePanels, getCellContent, getPromptForActionType, onClick, cacheResponse, getRequestKey]);

  const handleClosePanel = useCallback((actionType: ActionType) => {
    setActivePanels(prev => prev.filter(type => type !== actionType));
  }, []);

  const getPanelTitle = useCallback((type: ActionType) => {
    switch (type) {
      case 'ask':
        return 'AI Assistant Explanation';
      case 'analyze':
        return 'Code Analysis';
      case 'improve':
        return 'Suggested Improvements';
    }
  }, []);

  const renderPopupPanel = useCallback((type: ActionType) => {
    const isActive = activePanels.includes(type);
    const isLoading = loadingStates[type];
    const content = responses[type] || '';

    return (
      <div
        ref={ref => { panelRefs.current[type] = ref; }}
        className={`jp-AIAssistant-popup-panel ${isActive ? 'active' : ''}`}
        style={{ display: isActive ? 'flex' : 'none' }}
      >
        <div className="jp-AIAssistant-popup-header">
          <div className="jp-AIAssistant-popup-title">{getPanelTitle(type)}</div>
          <button className="jp-AIAssistant-popup-close" onClick={() => handleClosePanel(type)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="jp-AIAssistant-popup-content">
          {isLoading ? (
            <div className="jp-AIAssistant-loading">
              Generating response...
              <div className="jp-AIAssistant-spinner"></div>
            </div>
          ) : (
            content || 'No response yet'
          )}
        </div>
      </div>
    );
  }, [activePanels, loadingStates, responses, getPanelTitle, handleClosePanel]);

  return (
    <div
      className={`jp-AIAssistant-cell-buttons-container ${isActive ? 'jp-AIAssistant-cell-buttons-active' : ''}`}
      style={{
        position: 'relative',
        transform: isActive ? 'scale(1)' : 'scale(0.95)'
      }}
    >
      {/* Ask Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-ask-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => handleButtonClick('ask', e)}
        title="Ask AI about this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faQuestion}
          className="fa-icon-sm"
        />
        <span>Ask</span>
      </button>
      {renderPopupPanel('ask')}

      {/* Analyze Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-analyze-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => handleButtonClick('analyze', e)}
        title="Analyze code in this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faSearch}
          className="fa-icon-sm"
        />
        <span>Analyze</span>
      </button>
      {renderPopupPanel('analyze')}

      {/* Improve Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-improve-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => handleButtonClick('improve', e)}
        title="Suggest improvements for this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faLightbulb}
          className="fa-icon-sm"
        />
        <span>Improve</span>
      </button>
      {renderPopupPanel('improve')}
    </div>
  );
};

export class CellToolbarButtonWidget extends ReactWidget {
  private readonly _cell: Cell<ICellModel>;
  private readonly _onClick: (actionType: ActionType) => void;
  private _isActive: boolean = false;

  constructor(cell: Cell<ICellModel>, onClick: (actionType: ActionType) => void) {
    super();
    console.log('[Ollama Debug] Creating CellToolbarButtonWidget for cell:', cell.model.id);
    this._cell = cell;
    this._onClick = onClick;
    this.addClass('jp-AIAssistant-cell-button-wrapper');

    // Add additional classes to improve visibility
    this.addClass('jp-Toolbar-item');

    // Add a data attribute with the cell ID for easier debugging
    this.node.setAttribute('data-cell-id', cell.model.id);
  }

  setActive(isActive: boolean): void {
    if (this._isActive === isActive) {
      // No change, avoid unnecessary updates
      return;
    }

    this._isActive = isActive;

    // Make sure the node is available before trying to modify it
    if (!this.node) {
      console.log('[Ollama Debug] Cannot update button - no DOM node available');
      return;
    }

    if (isActive) {
      console.log('[Ollama Debug] Activating buttons for cell:', this._cell.model.id);
      this.node.classList.add('jp-AIAssistant-cell-buttons-active');
      this.node.style.visibility = 'visible';
      this.node.style.display = 'flex';
      this.node.style.opacity = '1';
    } else {
      console.log('[Ollama Debug] Deactivating buttons for cell:', this._cell.model.id);
      this.node.classList.remove('jp-AIAssistant-cell-buttons-active');
      this.node.style.visibility = 'hidden';
      this.node.style.opacity = '0';
    }

    // Schedule an update to re-render the component
    this.update();
  }

  render(): JSX.Element {
    console.log('[Ollama Debug] Rendering CellToolbarButtonWidget, active:', this._isActive);
    return <CellToolbarButton
      cell={this._cell}
      onClick={this._onClick}
      isActive={this._isActive}
    />;
  }

  protected onBeforeShow(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget before show');
    super.onBeforeShow(msg);
  }

  protected onAfterShow(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget after show');
    super.onAfterShow(msg);
  }

  protected onBeforeAttach(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget before attach');
    super.onBeforeAttach(msg);
  }

  protected onAfterAttach(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget attached to DOM');
    super.onAfterAttach(msg);

    // Check if the parent is the active cell
    const notebookPanel = this._cell.parent?.parent as any;
    if (notebookPanel && notebookPanel.content && notebookPanel.content.activeCell === this._cell) {
      console.log('[Ollama Debug] This cell is the active cell');
      this.setActive(true);
    } else {
      console.log('[Ollama Debug] This cell is not the active cell');
      this.setActive(false);
    }
  }

  protected onBeforeDetach(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget before detach');
    super.onBeforeDetach(msg);
  }

  protected onAfterDetach(msg: Message): void {
    console.log('[Ollama Debug] CellToolbarButtonWidget after detach');
    super.onAfterDetach(msg);
  }
} 