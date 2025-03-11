import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSearch, faLightbulb, faQuestion } from '@fortawesome/free-solid-svg-icons';
import { Message } from '@lumino/messaging';

// Define action types for the buttons
export type ActionType = 'ask' | 'analyze' | 'improve';

interface CellToolbarButtonProps {
  cell: Cell<ICellModel>;
  onClick: (actionType: ActionType) => void;
  isActive?: boolean;
}

const CellToolbarButton: React.FC<CellToolbarButtonProps> = ({ onClick, isActive = false }) => {
  console.log('[Ollama Debug] Rendering CellToolbarButton component, active:', isActive);

  const getButtonStyle = (isActive: boolean) => {
    return {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isActive ? 0.9 : 0,
      transition: 'all 0.2s ease',
      borderRadius: '3px',
      visibility: isActive ? 'visible' as const : 'hidden' as const,
      boxShadow: isActive ? '0 0 3px rgba(0, 0, 0, 0.2)' : 'none',
      margin: '0 4px'
    };
  };

  return (
    <div
      className={`jp-AIAssistant-cell-buttons-container ${isActive ? 'jp-AIAssistant-cell-buttons-active' : ''}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        padding: '4px 0',
        visibility: isActive ? 'visible' as const : 'hidden' as const
      }}
    >
      {/* Ask Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-ask-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => {
          console.log('[Ollama Debug] Ask button clicked');
          e.preventDefault();
          e.stopPropagation();
          onClick('ask');
        }}
        title="Ask AI about this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faQuestion}
          className="fa-icon-sm"
          style={{
            width: '16px',
            height: '16px',
            color: 'var(--jp-ui-font-color1, #333)',
            display: 'block'
          }}
        />
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>Ask</span>
      </button>

      {/* Analyze Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-analyze-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => {
          console.log('[Ollama Debug] Analyze button clicked');
          e.preventDefault();
          e.stopPropagation();
          onClick('analyze');
        }}
        title="Analyze code in this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faSearch}
          className="fa-icon-sm"
          style={{
            width: '16px',
            height: '16px',
            color: 'var(--jp-ui-font-color1, #333)',
            display: 'block'
          }}
        />
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>Analyze</span>
      </button>

      {/* Improve Button */}
      <button
        className={`jp-AIAssistant-cell-button jp-AIAssistant-improve-button ${isActive ? 'jp-AIAssistant-cell-button-active' : ''}`}
        onClick={(e) => {
          console.log('[Ollama Debug] Improve button clicked');
          e.preventDefault();
          e.stopPropagation();
          onClick('improve');
        }}
        title="Suggest improvements for this cell"
        style={getButtonStyle(isActive)}
      >
        <FontAwesomeIcon
          icon={faLightbulb}
          className="fa-icon-sm"
          style={{
            width: '16px',
            height: '16px',
            color: 'var(--jp-ui-font-color1, #333)',
            display: 'block'
          }}
        />
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>Improve</span>
      </button>
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