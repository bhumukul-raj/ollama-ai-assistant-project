/**
 * @file CellToolbarButton.tsx
 * @description This file contains the CellToolbarButton component which adds AI-powered 
 * capabilities directly to Jupyter notebook cells. It provides buttons for asking questions 
 * about code, analyzing code, and suggesting improvements, all powered by the Ollama AI service.
 * The component manages its own state, caches responses, and renders popup panels with AI-generated content.
 */
import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { Cell, ICellModel, CodeCell } from '@jupyterlab/cells';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faLightbulb, faQuestion, faTimes, faCopy } from '@fortawesome/free-solid-svg-icons';
import { Message } from '@lumino/messaging';
import { OllamaService } from '../services/OllamaService';
import { IOutput, IStream, IError, IExecuteResult, IDisplayData } from '@jupyterlab/nbformat';
import { formatMessageWithCodeBlocks } from '../utils/formatUtils';

/**
 * Action types that can be performed on a cell.
 * - 'ask': Ask a question about the code in the cell
 * - 'analyze': Get a detailed analysis of the code
 * - 'improve': Get suggestions for improving the code
 */
export type ActionType = 'ask' | 'analyze' | 'improve';

/**
 * Props for the CellToolbarButton component.
 * 
 * @interface CellToolbarButtonProps
 * @property {Cell<ICellModel>} cell - The Jupyter notebook cell to attach the button to
 * @property {(actionType: ActionType) => void} onClick - Callback function triggered when a button is clicked
 * @property {boolean} [isActive=false] - Whether the button is currently active/visible
 */
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

/**
 * State interface for panel management.
 * 
 * @interface PanelState
 * @property {ActionType[]} activePanels - Array of currently active action panels
 * @property {Record<ActionType, boolean>} loadingStates - Loading state for each action type
 * @property {Record<ActionType, string>} responses - AI-generated responses for each action type
 */
interface PanelState {
  activePanels: ActionType[];
  loadingStates: Record<ActionType, boolean>;
  responses: Record<ActionType, string>;
}

/**
 * Union type for panel state actions.
 * Represents the different ways the panel state can be modified.
 */
type PanelAction =
  | { type: 'TOGGLE_PANEL'; payload: ActionType }
  | { type: 'CLOSE_ALL_PANELS' }
  | { type: 'SET_LOADING'; payload: { actionType: ActionType; isLoading: boolean } }
  | { type: 'SET_RESPONSE'; payload: { actionType: ActionType; response: string } }
  | { type: 'RESTORE_CACHE'; payload: Record<ActionType, string> };

/**
 * Initial state for the panel reducer.
 */
const initialPanelState: PanelState = {
  activePanels: [],
  loadingStates: {
    ask: false,
    analyze: false,
    improve: false
  },
  responses: {
    ask: '',
    analyze: '',
    improve: ''
  }
};

function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'TOGGLE_PANEL': {
      const isActive = state.activePanels.includes(action.payload);
      return {
        ...state,
        activePanels: isActive
          ? state.activePanels.filter(panel => panel !== action.payload)
          : [...state.activePanels, action.payload]
      };
    }
    case 'CLOSE_ALL_PANELS':
      return {
        ...state,
        activePanels: []
      };
    case 'SET_LOADING':
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.payload.actionType]: action.payload.isLoading
        }
      };
    case 'SET_RESPONSE':
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.actionType]: action.payload.response
        }
      };
    case 'RESTORE_CACHE':
      // Only update changed responses to prevent unnecessary rerenders
      const newResponses = { ...state.responses };
      let changed = false;

      Object.entries(action.payload).forEach(([type, content]) => {
        if (newResponses[type as ActionType] !== content) {
          newResponses[type as ActionType] = content;
          changed = true;
        }
      });

      return changed ? { ...state, responses: newResponses } : state;
    default:
      return state;
  }
}

const CellToolbarButton: React.FC<CellToolbarButtonProps> = ({ cell, onClick, isActive = false }) => {
  // Use reducer for complex state management
  const [panelState, dispatch] = useReducer(panelReducer, initialPanelState);
  const { activePanels, loadingStates, responses } = panelState;

  // Refs to track panel elements
  const panelRefs = useRef<Record<ActionType, HTMLDivElement | null>>({
    ask: null,
    analyze: null,
    improve: null
  });

  // Keep track of render count to debug excessive re-renders
  const renderCount = useRef(0);
  renderCount.current++;

  // Effect to handle panel positioning for stacking
  useEffect(() => {
    if (activePanels.length === 0) return;

    // Function to update panel positions
    const updatePanelPositions = () => {
      // Panel order matters for stacking (we want consistent ordering)
      const actionTypes: ActionType[] = ['ask', 'analyze', 'improve'];
      let currentBottom = -220; // Start with the default bottom position

      // Only calculate for active panels
      actionTypes.forEach(type => {
        if (!activePanels.includes(type)) {
          return;
        }

        const panel = panelRefs.current[type];
        if (!panel) {
          return;
        }

        // Apply the current position
        panel.style.bottom = `${currentBottom}px`;
        panel.style.zIndex = '19'; // Ensure consistent z-index
        currentBottom -= 220; // Move next panel up
      });
    };

    // Use requestAnimationFrame for better performance
    const frameId = requestAnimationFrame(() => {
      updatePanelPositions();
    });

    // Clean up animation frame on unmount or when dependencies change
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [activePanels, loadingStates]);

  // Update panel positions
  useEffect(() => {
    const updatePanelPositions = () => {
      Object.entries(panelRefs.current).forEach(([type, ref]) => {
        if (ref) {
          const button = ref;
          const rect = button.getBoundingClientRect();
          const panel = panelRefs.current[type as ActionType];
          if (panel) {
            panel.style.top = `${rect.bottom}px`;
            panel.style.left = `${rect.left}px`;
          }
        }
      });
    };

    window.addEventListener('resize', updatePanelPositions);
    return () => window.removeEventListener('resize', updatePanelPositions);
  }, []);

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
        dispatch({ type: 'RESTORE_CACHE', payload: cachedState });
      }
    }
  }, [isActive, cell]);

  // Effect to hide panel when cell becomes inactive
  useEffect(() => {
    if (!isActive && activePanels.length > 0) {
      // Save all panel states before closing
      if (cell) {
        const currentPanelState: Record<ActionType, string> = { ...responses };
        // Only cache non-empty responses to save memory
        const hasValidResponses = Object.values(currentPanelState).some(response => !!response.trim());

        if (hasValidResponses) {
          panelStateCache.set(cell.model.id, currentPanelState);
        }
      }

      // Close all panels
      dispatch({ type: 'CLOSE_ALL_PANELS' });
    }
  }, [isActive, activePanels, cell, responses]);

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
        return `You are a coding expert. Analyze this code and explain its functionality, key concepts, and any potential gotchas:

Code:
${content}

Output:
${output}

Provide a clear, concise explanation focusing on:
1. What the code does
2. Key programming concepts used
3. Important considerations or edge cases
4. Any potential issues to watch out for`;

      case 'analyze':
        return `As a code quality expert, analyze this code for best practices, performance, and maintainability:

Code:
${content}

Output:
${output}

Focus your analysis on:
1. Code structure and organization
2. Performance considerations
3. Error handling and edge cases
4. Documentation and readability
5. Potential security concerns
6. Optimization opportunities`;

      case 'improve':
        return `As a senior developer, suggest specific improvements for this code:

Code:
${content}

Output:
${output}

Provide concrete suggestions for:
1. Code optimization and performance
2. Better error handling
3. Improved readability and maintainability
4. Modern best practices
5. Security enhancements
6. Testing considerations

For each suggestion, explain the benefit and provide a brief example if applicable.`;

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
    dispatch({ type: 'TOGGLE_PANEL', payload: actionType });

    // If we're closing the panel, just return
    if (activePanels.includes(actionType)) {
      onClick(actionType);
      return;
    }

    // Check if we have a cached response
    const cachedContent = panelStateCache.get(cell.model.id)?.[actionType];

    // Create a unique key for this request
    const requestKey = getRequestKey(cell.model.id, actionType);

    // Set loading state if no cache and no pending request
    if (!cachedContent && !pendingRequests.has(requestKey)) {
      // Mark this request as pending to prevent duplicate requests
      pendingRequests.set(requestKey, true);

      // Update loading state
      dispatch({
        type: 'SET_LOADING',
        payload: { actionType: actionType, isLoading: true }
      });

      // Clear previous response
      dispatch({
        type: 'SET_RESPONSE',
        payload: { actionType: actionType, response: '' }
      });

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
            // Update the UI with the current response
            dispatch({
              type: 'SET_RESPONSE',
              payload: { actionType: actionType, response: partialResponse }
            });

            if (done) {
              // Update loading state when done
              dispatch({
                type: 'SET_LOADING',
                payload: { actionType: actionType, isLoading: false }
              });

              // Cache the complete response
              cacheResponse(actionType, partialResponse);
            }
          }
        );
      } catch (error) {
        console.error('Error getting Ollama response:', error);
        dispatch({
          type: 'SET_RESPONSE',
          payload: {
            actionType: actionType,
            response: 'Error: Failed to get response from Ollama'
          }
        });

        dispatch({
          type: 'SET_LOADING',
          payload: { actionType: actionType, isLoading: false }
        });

        // Clear the pending request flag on error
        pendingRequests.delete(requestKey);
      }
    } else if (cachedContent) {
      // Use cached response
      dispatch({
        type: 'SET_RESPONSE',
        payload: { actionType: actionType, response: cachedContent }
      });

      // Ensure loading state is false
      dispatch({
        type: 'SET_LOADING',
        payload: { actionType: actionType, isLoading: false }
      });
    }

    onClick(actionType);
  }, [cell, activePanels, getCellContent, getPromptForActionType, onClick, cacheResponse, getRequestKey]);

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_PANELS' });
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

  // Add debug logging to panel rendering
  const renderPopupPanel = useCallback((type: ActionType) => {
    const isActive = activePanels.includes(type);
    const isLoading = loadingStates[type];
    const content = responses[type] || '';

    // Use CSS class-based rendering with individual panel refs
    return (
      <div
        key={`panel-${type}`}
        ref={(node) => {
          panelRefs.current[type] = node;
        }}
        className={`jp-AIAssistant-popup-panel ${isActive ? 'active' : ''}`}
        data-panel-type={type}
        data-loading={isLoading ? 'true' : 'false'}
        style={{
          // Set initial position - will be updated by the effect
          bottom: '-220px',
          // Use CSS transition for smooth movement
          transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          // Ensure consistent height during loading and content display
          minHeight: '210px'
        }}
      >
        <div className="jp-AIAssistant-popup-header">
          <div className="jp-AIAssistant-popup-title">{getPanelTitle(type)}</div>
          <div className="jp-AIAssistant-popup-actions">
            <button
              className="jp-AIAssistant-popup-copy"
              onClick={() => navigator.clipboard.writeText(content)}
              title="Copy content"
            >
              <FontAwesomeIcon icon={faCopy} />
            </button>
            <button
              className="jp-AIAssistant-popup-close"
              onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: type })}
              title="Close panel"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
        <div className="jp-AIAssistant-popup-content">
          {isLoading ? (
            <div className="jp-AIAssistant-loading">
              Generating response...
              <div className="jp-AIAssistant-spinner"></div>
            </div>
          ) : (
            content ? formatMessageWithCodeBlocks(content) : 'No response yet'
          )}
        </div>
      </div>
    );
  }, [activePanels, loadingStates, responses, getPanelTitle]);

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
        className={`jp-AIAssistant-cell-button jp-AIAssistant-ask-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''} ${activePanels.includes('ask') ? 'jp-AIAssistant-button-selected' : ''}`}
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

      {/* Analyze Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-analyze-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''} ${activePanels.includes('analyze') ? 'jp-AIAssistant-button-selected' : ''}`}
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

      {/* Improve Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-improve-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''} ${activePanels.includes('improve') ? 'jp-AIAssistant-button-selected' : ''}`}
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

      {/* Render all active panels */}
      {activePanels.map(type => renderPopupPanel(type))}
    </div>
  );
};

export class CellToolbarButtonWidget extends ReactWidget {
  private readonly _cell: Cell<ICellModel>;
  private readonly _onClick: (actionType: ActionType) => void;
  private _isActive: boolean = false;
  private _isInitialized: boolean = false;

  constructor(cell: Cell<ICellModel>, onClick: (actionType: ActionType) => void) {
    super();
    this._cell = cell;
    this._onClick = onClick;
    this.addClass('jp-AIAssistant-cell-button-wrapper');

    // Add additional classes to improve visibility
    this.addClass('jp-Toolbar-item');

    // Add a data attribute with the cell ID for easier debugging
    this.node.setAttribute('data-cell-id', cell.model.id);

    // Initialize as hidden, using CSS properties instead of style properties
    this.node.classList.add('jp-AIAssistant-cell-button-hidden');
  }

  setActive(isActive: boolean): void {
    if (this._isActive === isActive) {
      // No change, avoid unnecessary updates
      return;
    }

    this._isActive = isActive;

    // Make sure the node is available before trying to modify it
    if (!this.node) {
      return;
    }

    // Lazy initialization - only fully initialize when first activated
    if (isActive && !this._isInitialized) {
      this._isInitialized = true;
    }

    // Use CSS classes instead of direct style manipulation
    if (isActive) {
      this.node.classList.add('jp-AIAssistant-cell-buttons-active');
      this.node.classList.remove('jp-AIAssistant-cell-button-hidden');
    } else {
      this.node.classList.remove('jp-AIAssistant-cell-buttons-active');
      this.node.classList.add('jp-AIAssistant-cell-button-hidden');
    }

    // Only update if initialized
    if (this._isInitialized) {
      this.update();
    }
  }

  render(): JSX.Element {
    // Only render the full component if it's been initialized
    if (!this._isInitialized) {
      return <div className="jp-AIAssistant-cell-button-placeholder"></div>;
    }

    return <CellToolbarButton
      cell={this._cell}
      onClick={this._onClick}
      isActive={this._isActive}
    />;
  }

  protected onBeforeAttach(msg: Message): void {
    super.onBeforeAttach(msg);

    // Check if the parent is the active cell
    const notebookPanel = this._cell.parent?.parent as any;
    if (notebookPanel && notebookPanel.content && notebookPanel.content.activeCell === this._cell) {
      this.setActive(true);
    } else {
      this.setActive(false);
    }
  }

  protected onAfterDetach(msg: Message): void {
    super.onAfterDetach(msg);

    // Clean up any resources when detached
    this._isActive = false;
  }
} 