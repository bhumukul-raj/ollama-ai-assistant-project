/**
 * @file InputArea.tsx
 * @description This file contains the InputArea component which provides a user input interface
 * for entering queries, submitting questions, and controlling AI interactions. It features a 
 * resizable text area with support for compact mode, auto-expansion, keyboard shortcuts,
 * and control buttons for submitting queries, stopping ongoing generations, and regenerating responses.
 */
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faSync,
  faStop,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';

/**
 * Props for the InputArea component.
 * @interface InputAreaProps
 * @property {string} inputValue - The current value of the input field.
 * @property {boolean} isLoading - Whether the app is currently processing a request.
 * @property {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} onInputChange - Handler for input changes.
 * @property {(e: React.FormEvent) => void} onSubmit - Handler for form submission.
 * @property {() => void} onStopRequest - Handler for stopping the current request.
 * @property {() => void} onRegenerate - Handler for regenerating the last response.
 * @property {boolean} [isCompact=false] - Whether to display the component in compact mode.
 */
interface InputAreaProps {
  inputValue: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStopRequest: () => void;
  onRegenerate: () => void;
  isCompact?: boolean;
}

/**
 * The InputArea component provides a textarea for user input along with buttons
 * for submitting, regenerating responses, and stopping AI generation.
 * 
 * Features:
 * - Auto-resizing textarea based on content
 * - Keyboard shortcut (Ctrl+Enter) for submission
 * - Expandable/Collapsible input area
 * - Compact mode for space-constrained UIs
 * - Dynamic button states based on context (loading, input validation)
 */
export const InputArea: React.FC<InputAreaProps> = ({
  inputValue,
  isLoading,
  onInputChange,
  onSubmit,
  onStopRequest,
  onRegenerate,
  isCompact = false
}) => {
  // Whether the input area is in expanded mode
  const [isExpanded, setIsExpanded] = useState(false);
  // Reference to the textarea element for direct manipulation
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea based on content height
   * Adjusts the height to match the content, with a maximum height of 200px
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  /**
   * Handle Ctrl+Enter or Cmd+Enter keyboard shortcut for submission
   * Submits the form if there's valid input and no request is loading
   * 
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} e - The keyboard event
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isLoading && inputValue.trim()) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  /**
   * Apply custom styles for compact mode
   * Reduces padding and element sizes for space-constrained UIs
   */
  const inputStyle = React.useMemo(() => {
    if (isCompact) {
      return {
        padding: '6px'
      };
    }
    return {};
  }, [isCompact]);

  /**
   * Apply custom styles for buttons in compact mode
   * Reduces button size and padding for space-constrained UIs
   */
  const buttonStyle = React.useMemo(() => {
    if (isCompact) {
      return {
        padding: '4px 8px',
        fontSize: '12px'
      };
    }
    return {};
  }, [isCompact]);

  /**
   * Handle stop request with proper logging
   * Triggers the parent component to find and stop the active request
   */
  const handleStopRequest = () => {
    console.log("Stop button clicked in InputArea - stopping active generation");
    // This will trigger the parent component to find and stop the active request
    onStopRequest();
  };

  return (
    <div className={`jp-AIAssistant-input ${isExpanded ? 'jp-AIAssistant-input-expanded' : ''} ${isCompact ? 'jp-AIAssistant-input-compact' : ''}`} style={inputStyle}>
      <form className="jp-AIAssistant-input-form" onSubmit={onSubmit}>
        <textarea
          ref={textareaRef}
          className="jp-AIAssistant-input-textarea"
          value={inputValue}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isCompact ? "Ask..." : "Ask a question or type a command..."}
          disabled={isLoading}
          rows={1}
          style={isCompact ? { minHeight: '36px' } : {}}
        />

        <div className="jp-AIAssistant-input-actions">
          {/* Expand/Collapse button only shown in non-compact mode */}
          {!isCompact && (
            <button
              type="button"
              className="jp-AIAssistant-message-control-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse input" : "Expand input"}
            >
              <FontAwesomeIcon
                icon={isExpanded ? faCompress : faExpand}
                className="fa-icon-sm"
              />
            </button>
          )}

          {/* Show Stop button during loading, or Submit/Regenerate buttons when idle */}
          {isLoading ? (
            <button
              type="button"
              className="jp-AIAssistant-input-button jp-AIAssistant-action-button-stop"
              onClick={handleStopRequest}
              title="Stop generation"
              style={buttonStyle}
            >
              <FontAwesomeIcon icon={faStop} className="fa-icon-sm" />
            </button>
          ) : (
            <>
              {/* Regenerate button */}
              {!isCompact && (
                <button
                  type="button"
                  className="jp-AIAssistant-input-button jp-AIAssistant-action-button-refresh"
                  onClick={onRegenerate}
                  disabled={isLoading}
                  title="Regenerate last response"
                  style={buttonStyle}
                >
                  <FontAwesomeIcon icon={faSync} className="fa-icon-sm" />
                </button>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="jp-AIAssistant-input-button"
                disabled={isLoading || !inputValue.trim()}
                title="Send message (Ctrl+Enter)"
                style={buttonStyle}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="fa-icon-sm" />
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default InputArea; 