/**
 * @file MessageList.tsx
 * @description This file contains the MessageList component which displays the conversation
 * between the user and the AI assistant. It renders user and assistant messages with proper
 * formatting, displays timestamps, shows loading states, and provides controls for message
 * actions like retrying, stopping generation, and regenerating responses.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSync,
  faUndo,
  faStop,
  faCopy,
  faRobot,
  faUser,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../hooks/useTheme';

/**
 * Interface defining the structure of a message in the conversation.
 * 
 * @interface Message
 * @property {('user' | 'assistant')} role - Who sent the message (user or AI assistant)
 * @property {string} content - The text content of the message
 * @property {('loading' | 'error' | 'complete')} [status] - The current status of the message
 * @property {{ start?: number; end?: number }} [timestamp] - Timing information for the message
 * @property {boolean} [fromCache] - Whether the message was retrieved from cache
 * @property {string} [requestId] - Unique identifier for the associated request
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'error' | 'complete';
  timestamp?: {
    start?: number;
    end?: number;
  };
  fromCache?: boolean;
  requestId?: string;
}

/**
 * Props for the MessageList component.
 * 
 * @interface MessageListProps
 * @property {Message[]} messages - Array of messages to display
 * @property {boolean} autoScroll - Whether to automatically scroll to new messages
 * @property {boolean} isLoading - Whether the assistant is currently generating a response
 * @property {() => void} onRetry - Callback for retrying the last failed message
 * @property {(requestId?: string) => void} onStop - Callback for stopping the current generation
 * @property {() => void} onRegenerate - Callback for regenerating the last assistant response
 * @property {(content: string) => JSX.Element} formatMessageWithCodeBlocks - Function to format message content with code blocks
 * @property {React.RefObject<HTMLDivElement>} containerRef - Reference to the container element
 * @property {number} [containerWidth] - Width of the container element for responsive layouts
 * @property {boolean} [isCompact] - Whether to display messages in compact mode
 */
interface MessageListProps {
  messages: Message[];
  autoScroll: boolean;
  isLoading: boolean;
  onRetry: () => void;
  onStop: (requestId?: string) => void;
  onRegenerate: () => void;
  formatMessageWithCodeBlocks: (content: string) => JSX.Element;
  containerRef: React.RefObject<HTMLDivElement>;
  containerWidth?: number;
  isCompact?: boolean;
}

/**
 * Formats the time difference between start and end timestamps.
 * 
 * @param {number} [start] - Start timestamp in milliseconds
 * @param {number} [end] - End timestamp in milliseconds
 * @returns {string} Formatted time difference in seconds
 */
const formatTimeDiff = (start?: number, end?: number): string => {
  if (!start || !end) return '';
  const diff = (end - start) / 1000;
  return `${diff.toFixed(2)}s`;
};

/**
 * Formats a timestamp into a readable time string.
 * 
 * @param {number} [timestamp] - Timestamp in milliseconds
 * @returns {string} Formatted time string (hours:minutes)
 */
const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * TypingIndicator component to display during AI response generation
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="jp-AIAssistant-typing-indicator">
      <span className="jp-AIAssistant-typing-dot"></span>
      <span className="jp-AIAssistant-typing-dot"></span>
      <span className="jp-AIAssistant-typing-dot"></span>
    </div>
  );
};

// Optimize the MessageList component with React.memo
export const MessageList = React.memo<MessageListProps>(({
  messages,
  autoScroll,
  isLoading,
  onRetry,
  onStop,
  onRegenerate,
  formatMessageWithCodeBlocks,
  containerRef,
  containerWidth = 0,
  isCompact = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessages = useRef<Message[]>([]);

  // Get theme information
  const { isDarkTheme } = useTheme();

  // Auto scroll to bottom when messages change
  useEffect(() => {
    // Only auto scroll if enabled and a new message was added or loading
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Update previous messages reference
    previousMessages.current = messages;
  }, [messages, autoScroll, isLoading]);

  // Scroll into view when new messages arrive
  React.useEffect(() => {
    if (autoScroll && containerRef.current && messages.length > 0) {
      // Force immediate scroll for better user experience
      containerRef.current.scrollTop = containerRef.current.scrollHeight;

      // Then use animation frame for smoother scroll after rendering
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    }
  }, [messages, autoScroll, isLoading]);

  // Calculate message style based on container width
  const messageStyle = {
    maxWidth: containerWidth > 0 ? `${Math.min(containerWidth * 0.8, 800)}px` : '80%'
  };

  // Format and render timestamp
  const renderTimestamp = (message: Message) => {
    if (message.status === 'loading') {
      return (
        <div className="jp-AIAssistant-timestamp jp-AIAssistant-timestamp-loading">
          <FontAwesomeIcon icon={faSync} className="fa-spin fa-icon-sm" style={{ marginRight: '5px' }} />
          Generating...
        </div>
      );
    }

    if (message.status === 'error') {
      return (
        <div className="jp-AIAssistant-timestamp jp-AIAssistant-timestamp-error">
          <span style={{ color: '#ff6b6b' }}>Error generating response</span>
          <button
            className="jp-AIAssistant-retry"
            onClick={onRetry}
            title="Retry generating the response"
          >
            <FontAwesomeIcon icon={faUndo} className="fa-icon-sm" />
            Retry
          </button>
        </div>
      );
    }

    // Support showing cache status
    if (message.fromCache) {
      return (
        <div className="jp-AIAssistant-cache-indicator" title="Response loaded from cache">
          <FontAwesomeIcon icon={faInfoCircle} className="fa-icon-sm" style={{ marginRight: '5px' }} />
          <span>From cache</span>
        </div>
      );
    }

    // Show timestamp if available
    if (message.timestamp?.start && message.timestamp?.end) {
      const time = formatTimeDiff(message.timestamp.start, message.timestamp.end);
      return (
        <div className={`jp-AIAssistant-timestamp ${message.role === 'user' ? 'jp-AIAssistant-timestamp-user' : 'jp-AIAssistant-timestamp-assistant'}`}>
          {formatTimestamp(message.timestamp.end)} · {time}
        </div>
      );
    }

    return null;
  };

  // Handle stopping message generation
  const handleStopClick = (message: Message) => {
    if (!message.requestId) {
      console.warn("Stop button clicked but message has no requestId:", message);
    } else {
      console.log("Stop button clicked for message with requestId:", message.requestId);
    }

    // Pass the requestId to the stop handler (even if undefined)
    onStop(message.requestId);
  };

  // Render individual message
  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isLoading = message.status === 'loading';
    const isLastMessage = index === messages.length - 1;

    return (
      <div
        key={index}
        className={`jp-AIAssistant-message ${isUser ? 'jp-AIAssistant-message-user' : 'jp-AIAssistant-message-assistant'} ${isLoading ? 'jp-AIAssistant-message-loading' : ''} ${isCompact ? 'jp-AIAssistant-message-compact' : ''}`}
        style={messageStyle}
      >
        {/* Message controls for assistant messages */}
        {isAssistant && !isLoading && (
          <div className="jp-AIAssistant-message-controls">
            <button
              className="jp-AIAssistant-message-control-button"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
              }}
              title="Copy message to clipboard"
            >
              <FontAwesomeIcon icon={faCopy} className="fa-icon-sm" />
            </button>

            {isLastMessage && (
              <button
                className="jp-AIAssistant-message-control-button"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <FontAwesomeIcon icon={faSync} className="fa-icon-sm" />
              </button>
            )}
          </div>
        )}

        {/* Stop generation button for loading messages */}
        {isLoading && (
          <div className="jp-AIAssistant-message-controls">
            <button
              className="jp-AIAssistant-message-control-button"
              onClick={() => handleStopClick(message)}
              title="Stop generation"
            >
              <FontAwesomeIcon icon={faStop} className="fa-icon-sm" />
            </button>
          </div>
        )}

        {/* Message content */}
        <div className="jp-AIAssistant-message-content">
          <div className={`jp-AIAssistant-message-icon ${isCompact ? 'jp-AIAssistant-message-icon-compact' : ''}`}>
            {isUser ? (
              <FontAwesomeIcon icon={faUser} className={isCompact ? "fa-icon-sm" : "fa-icon-md"} />
            ) : (
              <FontAwesomeIcon icon={faRobot} className={isCompact ? "fa-icon-sm" : "fa-icon-md"} />
            )}
          </div>
          <div className="jp-AIAssistant-message-text">
            {message.role === 'assistant' && message.status === 'loading' ? (
              <>
                {message.content && formatMessageWithCodeBlocks(message.content)}
                <TypingIndicator />
              </>
            ) : (
              formatMessageWithCodeBlocks(message.content)
            )}
            {renderTimestamp(message)}
          </div>
        </div>
      </div>
    );
  };

  // Make sure the ref at the end of the messages is properly rendered
  const renderEndRef = () => (
    <div
      ref={messagesEndRef}
      style={{ height: '1px', width: '100%', clear: 'both' }}
      aria-hidden="true"
    />
  );

  return (
    <div className={`jp-AIAssistant-conversation ${isDarkTheme ? 'jp-AIAssistant-conversation-dark' : 'jp-AIAssistant-conversation-light'}`}>
      {messages.length === 0 ? (
        <div className="jp-AIAssistant-emptyState">
          <div className="jp-AIAssistant-emptyState-content">
            <span>No messages yet</span>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => renderMessage(message, index))}
          {renderEndRef()}
        </>
      )}
    </div>
  );
});

export default MessageList; 