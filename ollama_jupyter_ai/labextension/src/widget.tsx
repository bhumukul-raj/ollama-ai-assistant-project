/**
 * @file widget.tsx
 * @description This file defines the AIAssistantWidget class, which is the main entry point
 * for the Ollama AI Assistant extension in JupyterLab. It wraps the React-based AI Assistant
 * panel in a JupyterLab widget container, handles error boundaries, and manages the connection
 * between the JupyterLab environment and the React component tree.
 */
import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeManager } from './utils/themeUtils';

/**
 * A JupyterLab widget that hosts the AI Assistant panel component.
 * 
 * This class extends ReactWidget to create a JupyterLab-compatible widget
 * that contains the React-based AI Assistant interface. It handles the integration
 * between JupyterLab's widget system and the React component tree.
 * 
 * The widget includes error boundary protection to prevent crashes and
 * provides error reporting capabilities.
 */
export class AIAssistantWidget extends ReactWidget {
  /**
   * Reference to the JupyterLab notebook tracker
   * Used to access and manipulate notebook content
   * @private
   */
  private notebooks: INotebookTracker;

  /**
   * Creates a new AIAssistantWidget.
   * 
   * @param {INotebookTracker} notebooks - The JupyterLab notebook tracker instance
   * that provides access to notebook documents and their state
   */
  constructor(notebooks: INotebookTracker) {
    super();
    this.notebooks = notebooks;

    // Initialize the theme manager
    ThemeManager.getInstance();
  }

  /**
   * Error handler for the AI Assistant panel.
   * Logs errors to the console and could be extended to report errors
   * to an external error tracking service.
   * 
   * @param {Error} error - The error that occurred
   * @param {React.ErrorInfo} errorInfo - React error information including component stack
   * @private
   */
  private handleError = (error: Error, errorInfo: React.ErrorInfo): void => {
    console.error('AIAssistant encountered an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    // You could implement additional error reporting here
  };

  /**
   * Renders the widget content.
   * 
   * This method is called by JupyterLab's ReactWidget base class when
   * the widget needs to be rendered. It returns the React component tree
   * wrapped in an error boundary for fault tolerance.
   * 
   * @returns {JSX.Element} The rendered React component
   */
  render(): JSX.Element {
    return (
      <div className="jp-AIAssistant-container">
        <ErrorBoundary
          onError={this.handleError}
          onReset={() => console.log('AIAssistant error boundary reset')}
        >
          <AIAssistantPanel notebooks={this.notebooks} />
        </ErrorBoundary>
      </div>
    );
  }
} 