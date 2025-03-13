/**
 * @file CodePreview.tsx
 * @description This file contains the CodePreview component which displays code with syntax 
 * highlighting and provides buttons for code actions like copying, applying changes, and 
 * navigating edit history. It's used to preview code modifications suggested by the AI
 * before applying them to the notebook.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faUndo,
  faRedo,
  faCode
} from '@fortawesome/free-solid-svg-icons';

/**
 * Props for the CodePreview component.
 * 
 * @interface CodePreviewProps
 * @property {string} code - The code to display in the preview
 * @property {string} [language='python'] - The programming language for syntax highlighting
 * @property {string} [originalCode] - The original code for comparison/diff highlighting
 * @property {(code: string) => void} [onApply] - Callback for when the user applies the code
 * @property {() => void} [onUndo] - Callback for undoing the last change
 * @property {() => void} [onRedo] - Callback for redoing the last undone change
 * @property {boolean} [hasHistory] - Whether there is edit history available for undo/redo
 */
interface CodePreviewProps {
  code: string;
  language?: string;
  originalCode?: string;
  onApply?: (code: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  hasHistory?: boolean;
}

/**
 * Syntax highlighting rule definition.
 * 
 * @interface HighlightRule
 * @property {RegExp} pattern - Regular expression pattern to match syntax elements
 * @property {string} className - CSS class name to apply to matched elements
 */
interface HighlightRule {
  pattern: RegExp;
  className: string;
}

/**
 * Predefined syntax highlighting rules for different programming languages.
 */
const languageRules: Record<string, HighlightRule[]> = {
  python: [
    { pattern: /(^|\s)(def|class|import|from|return|if|else|for|while|try|except|with)(\s|$)/g, className: 'keyword' },
    { pattern: /(["'])(.*?)\1/g, className: 'string' },
    { pattern: /#.*/g, className: 'comment' },
    { pattern: /\b\d+\b/g, className: 'number' },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, className: 'class' }
  ],
  javascript: [
    { pattern: /(^|\s)(const|let|var|function|return|if|else|for|while|try|catch|class|import|export)(\s|$)/g, className: 'keyword' },
    { pattern: /(["'`])(.*?)\1/g, className: 'string' },
    { pattern: /\/\/.*/g, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\b/g, className: 'number' },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, className: 'class' }
  ]
};

/**
 * Component that displays code with syntax highlighting and action buttons.
 * 
 * Features:
 * - Syntax highlighting for various programming languages
 * - Code comparison with original code (when provided)
 * - Copy to clipboard functionality
 * - Apply code changes to notebook
 * - Undo/redo support for code changes
 * 
 * @param {CodePreviewProps} props - Component properties
 * @returns {JSX.Element} The rendered component
 */
export const CodePreview: React.FC<CodePreviewProps> = ({
  code,
  language = 'python',
  originalCode,
  onApply,
  onUndo,
  onRedo,
  hasHistory = false
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [diffView, setDiffView] = useState(false);

  // Memoized function to compute diff between original and new code
  const computeDiff = useMemo(() => {
    if (!originalCode) return null;

    const oldLines = originalCode.split('\n');
    const newLines = code.split('\n');
    const elements: JSX.Element[] = [];

    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        // Unchanged line
        elements.push(
          <div key={`${i}-${j}`} className="jp-AIAssistant-code-line">
            <span className="jp-AIAssistant-code-line-number">{j + 1}</span>
            <span className="jp-AIAssistant-code-line-content">{newLines[j]}</span>
          </div>
        );
        i++;
        j++;
      } else {
        // Line was changed
        if (i < oldLines.length) {
          elements.push(
            <div key={`removed-${i}`} className="jp-AIAssistant-code-line removed">
              <span className="jp-AIAssistant-code-line-number">-</span>
              <span className="jp-AIAssistant-code-line-content">{oldLines[i]}</span>
            </div>
          );
          i++;
        }
        if (j < newLines.length) {
          elements.push(
            <div key={`added-${j}`} className="jp-AIAssistant-code-line added">
              <span className="jp-AIAssistant-code-line-number">+</span>
              <span className="jp-AIAssistant-code-line-content">{newLines[j]}</span>
            </div>
          );
          j++;
        }
      }
    }

    return elements;
  }, [originalCode, code, diffView]);

  // Memoized syntax highlighting
  const highlightedCode = useMemo(() => {
    const rules = languageRules[language] || [];
    const lines = code.split('\n');
    const highlightedLines: JSX.Element[] = [];

    lines.forEach((line, index) => {
      let lineContent = line;
      let highlightedLine: JSX.Element[] = [];

      // Apply highlighting rules for this language
      rules.forEach(rule => {
        lineContent = lineContent.replace(rule.pattern, (match) => {
          highlightedLine.push(
            <span key={`${index}-${match}-${Math.random()}`} className={`jp-AIAssistant-code-${rule.className}`}>{match}</span>
          );
          return ''; // Remove the matched part
        });
      });

      // Add any remaining text without highlights
      if (lineContent) {
        highlightedLine.push(
          <span key={`${index}-text-${Math.random()}`}>{lineContent}</span>
        );
      }

      // Add the processed line
      highlightedLines.push(
        <div key={`line-${index}`} className="jp-AIAssistant-code-line">
          <span className="jp-AIAssistant-code-line-number">{index + 1}</span>
          <span className="jp-AIAssistant-code-line-content">
            {highlightedLine}
          </span>
        </div>
      );
    });

    return highlightedLines;
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="jp-AIAssistant-code-preview">
      <div className="jp-AIAssistant-code-preview-header">
        <div className="jp-AIAssistant-code-preview-title">
          <FontAwesomeIcon icon={faCode} className="fa-icon-sm" />
          <span>{language.toUpperCase()}</span>
        </div>

        <div className="jp-AIAssistant-code-preview-actions">
          {originalCode && (
            <button
              className="jp-AIAssistant-code-preview-button"
              onClick={() => setDiffView(!diffView)}
              title={diffView ? 'Show normal view' : 'Show differences'}
            >
              {diffView ? 'Normal' : 'Diff'}
            </button>
          )}

          {hasHistory && (
            <>
              <button
                className="jp-AIAssistant-code-preview-button"
                onClick={onUndo}
                title="Undo"
              >
                <FontAwesomeIcon icon={faUndo} />
              </button>
              <button
                className="jp-AIAssistant-code-preview-button"
                onClick={onRedo}
                title="Redo"
              >
                <FontAwesomeIcon icon={faRedo} />
              </button>
            </>
          )}

          <button
            className="jp-AIAssistant-code-preview-button"
            onClick={handleCopy}
            title="Copy code"
          >
            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
          </button>

          {onApply && (
            <button
              className="jp-AIAssistant-code-preview-button primary"
              onClick={() => onApply(code)}
              title="Apply code"
            >
              Apply
            </button>
          )}
        </div>
      </div>

      <div className="jp-AIAssistant-code-preview-content">
        {diffView && originalCode ? (
          computeDiff
        ) : (
          <pre className="jp-AIAssistant-code">
            {highlightedCode}
          </pre>
        )}
      </div>
    </div>
  );
};

// Export a memoized version of the component to prevent unnecessary re-renders
export default React.memo(CodePreview); 