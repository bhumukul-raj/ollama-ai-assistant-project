import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAIAssistant } from '../context/AIAssistantContext';
import { INotebookTracker } from '@jupyterlab/notebook';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { NotebookService } from '../services/NotebookService';

interface NotebookConnectionHelperProps {
  notebooks: INotebookTracker;
}

/**
 * Simple notebook connection status indicator
 * Shows green check for connected, red warning for disconnected
 */
export const NotebookConnectionHelper: React.FC<NotebookConnectionHelperProps> = ({ notebooks }) => {
  const { 
    hasActiveNotebook, 
    activeCellContent,
    refreshActiveCellContent
  } = useAIAssistant();
  
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [notebookService] = useState(() => new NotebookService());
  const attemptCountRef = useRef<number>(0);
  const maxAttempts = 5; // Maximum number of connection attempts
  const connectionEstablishedRef = useRef<boolean>(false);
  
  // Simple check for notebook connection
  const checkConnection = useCallback(() => {
    // If we've already established a connection successfully, don't keep checking
    if (connectionEstablishedRef.current) {
      return;
    }
    
    // Limit the number of automatic checks
    if (attemptCountRef.current >= maxAttempts) {
      console.log('Maximum connection check attempts reached');
      setConnectionStatus('disconnected');
      return;
    }
    
    attemptCountRef.current += 1;
    setConnectionStatus('checking');
    
    try {
      // Check if notebook tracker and current notebook exist
      if (!notebooks || !notebooks.currentWidget) {
        setConnectionStatus('disconnected');
        return;
      }
      
      // Set the notebook in the service
      notebookService.setNotebook(notebooks.currentWidget);
      
      // Check if there is an active cell
      if (!notebooks.activeCell) {
        setConnectionStatus('disconnected');
        return;
      }
      
      // Get cell content directly
      const cellContent = notebooks.activeCell.model.toString();
      
      // If we can get cell content, try to refresh it in the context
      if (cellContent && refreshActiveCellContent) {
        refreshActiveCellContent();
        
        // Give a small delay for content to update
        setTimeout(() => {
          // Check if we got the content in the context
          if (hasActiveNotebook && activeCellContent) {
            setConnectionStatus('connected');
            attemptCountRef.current = 0; // Reset counter on success
            connectionEstablishedRef.current = true; // Mark connection as established
          } else {
            setConnectionStatus('disconnected');
          }
        }, 200);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check error:', error);
      setConnectionStatus('disconnected');
    }
  }, [notebooks, hasActiveNotebook, activeCellContent, refreshActiveCellContent, notebookService]);
  
  // Reset connection state when dependencies change
  useEffect(() => {
    // Reset the connection established flag whenever relevant dependencies change
    connectionEstablishedRef.current = false;
    attemptCountRef.current = 0;
    checkConnection();
  }, [notebooks, checkConnection]);
  
  // Check connection on mount and when dependencies change
  useEffect(() => {
    // Set up listener for notebook changes
    if (notebooks) {
      const onNotebookChanged = () => {
        console.log('Notebook changed - resetting connection state');
        connectionEstablishedRef.current = false;
        attemptCountRef.current = 0; // Reset counter when notebook changes
        checkConnection();
      };
      
      notebooks.currentChanged.connect(onNotebookChanged);
      
      // Also listen for active cell changes
      const currentNotebook = notebooks.currentWidget;
      if (currentNotebook?.content) {
        const onActiveCellChanged = () => {
          console.log('Active cell changed - checking connection');
          connectionEstablishedRef.current = false;
          attemptCountRef.current = 0; // Reset counter when cell changes
          checkConnection();
        };
        
        currentNotebook.content.activeCellChanged.connect(onActiveCellChanged);
        
        return () => {
          notebooks.currentChanged.disconnect(onNotebookChanged);
          currentNotebook.content.activeCellChanged.disconnect(onActiveCellChanged);
        };
      }
      
      return () => {
        notebooks.currentChanged.disconnect(onNotebookChanged);
      };
    }
  }, [notebooks, checkConnection]);
  
  // Simple status icon - small and unobtrusive
  if (connectionStatus === 'connected') {
    return (
      <span className="jp-AIAssistant-connection-indicator jp-AIAssistant-connection-connected" title="Connected to notebook">
        <FontAwesomeIcon icon={faCheck} />
      </span>
    );
  } else if (connectionStatus === 'checking') {
    return (
      <span className="jp-AIAssistant-connection-indicator jp-AIAssistant-connection-checking" title="Checking notebook connection...">
        <FontAwesomeIcon icon={faSync} className="jp-AIAssistant-spinner" />
      </span>
    );
  } else {
    return (
      <span 
        className="jp-AIAssistant-connection-indicator jp-AIAssistant-connection-disconnected" 
        title="Not connected to notebook - please select a cell"
        onClick={() => {
          // Reset counters and flags on manual retry
          connectionEstablishedRef.current = false;
          attemptCountRef.current = 0;
          checkConnection();
        }}
      >
        <FontAwesomeIcon icon={faExclamationTriangle} />
      </span>
    );
  }
};

export default NotebookConnectionHelper; 