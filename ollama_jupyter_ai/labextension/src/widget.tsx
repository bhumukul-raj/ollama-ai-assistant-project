import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * A widget that hosts the AI Assistant panel component.
 */
export class AIAssistantWidget extends ReactWidget {
  private notebooks: INotebookTracker;

  constructor(notebooks: INotebookTracker) {
    super();
    this.notebooks = notebooks;
  }

  /**
   * Handle errors in the AI Assistant panel
   */
  private handleError = (error: Error, errorInfo: React.ErrorInfo): void => {
    console.error('AIAssistant encountered an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    // You could implement additional error reporting here
  };

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