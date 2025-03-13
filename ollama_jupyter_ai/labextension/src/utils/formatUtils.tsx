/**
 * @file formatUtils.tsx
 * @description This file provides utilities for formatting and rendering text content with 
 * Markdown-like formatting and syntax highlighting for code blocks. These utilities are used
 * to transform plain text responses from the AI model into rich, formatted content with
 * proper styling, code highlighting, and interactive elements.
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faClipboard
} from '@fortawesome/free-solid-svg-icons';

/**
 * Applies syntax highlighting to code blocks.
 * 
 * This function parses code and applies CSS classes to different syntax elements
 * to create a visually formatted code block with language identification and
 * a copy button. It handles various programming languages with a focus on Python,
 * JavaScript, and TypeScript syntax elements.
 * 
 * @param {string} code - The raw code to highlight
 * @param {string} language - The programming language identifier (e.g., 'python', 'javascript')
 * @returns {JSX.Element} A React element containing the formatted code block
 */
export const applySyntaxHighlighting = (code: string, language: string): JSX.Element => {
  // Simple tokenization for basic syntax highlighting
  // For a production app, consider using a proper syntax highlighter like Prism or Highlight.js

  // Replace HTML special characters
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Simple regex-based tokenization
  let highlightedCode = escapedCode;

  // Highlight JavaScript/TypeScript/Python keywords
  const keywordRegex = /\b(const|let|var|function|return|if|else|for|while|class|import|from|export|async|await|def|import|from|None|True|False|class|try|except|finally|and|or|not|is|in|with|as|pass|break|continue|raise|yield|global|nonlocal|lambda|del|assert|elif|else|if|try|except|finally|for|while|break|continue|return|yield|import|from|as|class|def|global|nonlocal|pass|raise|assert|with|lambda)\b/g;
  highlightedCode = highlightedCode.replace(keywordRegex, '<span class="jp-AIAssistant-code-keyword">$1</span>');

  // Highlight Python built-in functions
  const builtinRegex = /\b(abs|all|any|ascii|bin|bool|breakpoint|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip|__import__)\b/g;
  highlightedCode = highlightedCode.replace(builtinRegex, '<span class="jp-AIAssistant-code-builtin">$1</span>');

  // Highlight strings
  const stringRegex = /(["'`])(.*?)\1/g;
  highlightedCode = highlightedCode.replace(stringRegex, '<span class="jp-AIAssistant-code-string">$1$2$1</span>');

  // Highlight comments
  const commentRegex = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm;
  highlightedCode = highlightedCode.replace(commentRegex, '<span class="jp-AIAssistant-code-comment">$1</span>');

  // Highlight numbers
  const numberRegex = /\b(\d+\.?\d*)\b/g;
  highlightedCode = highlightedCode.replace(numberRegex, '<span class="jp-AIAssistant-code-number">$1</span>');

  // Highlight function names
  const functionRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  highlightedCode = highlightedCode.replace(functionRegex, '<span class="jp-AIAssistant-code-function">$1</span>(');

  // Highlight operators
  const operatorRegex = /(\+|-|\*|\/|%|\*\*|\/\/|==|!=|>|<|>=|<=|and|or|not|is|is not|in|not in)\b/g;
  highlightedCode = highlightedCode.replace(operatorRegex, '<span class="jp-AIAssistant-code-operator">$1</span>');

  // Highlight decorators
  const decoratorRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
  highlightedCode = highlightedCode.replace(decoratorRegex, '<span class="jp-AIAssistant-code-decorator">@$1</span>');

  // Highlight self parameter
  const selfRegex = /\b(self|cls)\b/g;
  highlightedCode = highlightedCode.replace(selfRegex, '<span class="jp-AIAssistant-code-self">$1</span>');

  return (
    <div className="jp-AIAssistant-code-block">
      <div className="jp-AIAssistant-code-header">
        <span className="jp-AIAssistant-code-language">{language}</span>
        <button
          className="jp-AIAssistant-message-control-button"
          onClick={() => navigator.clipboard.writeText(code)}
          title="Copy code to clipboard"
        >
          <FontAwesomeIcon icon={faClipboard} className="fa-icon-sm" />
        </button>
      </div>
      <pre className="jp-AIAssistant-code">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};

/**
 * Formats message content by parsing and rendering code blocks with syntax highlighting
 * and processing regular text with Markdown-like formatting.
 * 
 * This function identifies code blocks in the message (denoted by triple backticks ```),
 * applies syntax highlighting to them, and formats the remaining text with Markdown rules.
 * 
 * @param {string} content - The raw message content to format
 * @returns {JSX.Element} A React element containing the formatted message
 */
export const formatMessageWithCodeBlocks = (content: string): JSX.Element => {
  // Split the message by code blocks
  const parts = content.split(/(```[a-z]*\n[\s\S]*?\n```)/g);

  return (
    <div className="jp-AIAssistant-formatted-content">
      {parts.map((part, index) => {
        // Check if this part is a code block
        const codeBlockMatch = part.match(/```([a-z]*)\n([\s\S]*?)\n```/);

        if (codeBlockMatch) {
          const language = codeBlockMatch[1] || 'text';
          const code = codeBlockMatch[2];
          return (
            <React.Fragment key={index}>
              {applySyntaxHighlighting(code, language)}
            </React.Fragment>
          );
        }

        // Handle normal text with paragraph breaks
        return (
          <React.Fragment key={index}>
            {formatText(part)}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Formats plain text using Markdown-like rules to create rich text formatting.
 * 
 * This function processes text to identify and render:
 * - Headers (# Header)
 * - Unordered lists (-, *, +)
 * - Ordered lists (1., 2., etc)
 * - Blockquotes (> text)
 * - Paragraphs with proper spacing
 * 
 * Within each text block, it also processes inline formatting.
 * 
 * @param {string} text - The text to format with Markdown-like rules
 * @returns {JSX.Element[]} An array of React elements representing the formatted content
 */
export const formatText = (text: string): JSX.Element[] => {
  // Normalize line breaks and trim excess whitespace
  const normalizedText = text.replace(/\r\n/g, '\n').trim();

  // Split by paragraphs (treating double newlines as paragraph separators)
  const paragraphs = normalizedText.split(/\n\s*\n/);

  return paragraphs
    .filter(para => para.trim().length > 0) // Remove empty paragraphs
    .map((paragraph, i) => {
      // Check for headers (# Header)
      const headerMatch = paragraph.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeaderTag key={i}>{processInlineFormatting(content)}</HeaderTag>;
      }

      // Check for unordered lists
      if (paragraph.match(/^[-*+]\s+/m)) {
        const items = paragraph.split(/\n/).filter(line => line.trim());
        return (
          <ul key={i}>
            {items.map((item, j) => {
              const content = item.replace(/^[-*+]\s+/, '');
              return <li key={j}>{processInlineFormatting(content)}</li>;
            })}
          </ul>
        );
      }

      // Check for ordered lists
      if (paragraph.match(/^\d+\.\s+/m)) {
        const items = paragraph.split(/\n/).filter(line => line.trim());
        return (
          <ol key={i}>
            {items.map((item, j) => {
              const content = item.replace(/^\d+\.\s+/, '');
              return <li key={j}>{processInlineFormatting(content)}</li>;
            })}
          </ol>
        );
      }

      // Check for blockquotes
      if (paragraph.startsWith('>')) {
        const content = paragraph.replace(/^>\s+/gm, '').replace(/^>/gm, '');
        return <blockquote key={i}>{processInlineFormatting(content)}</blockquote>;
      }

      // Regular paragraph with inline formatting
      return <p key={i}>{processInlineFormatting(paragraph)}</p>;
    });
};

/**
 * Processes inline text formatting elements like code snippets, links, bold, and italic text.
 * 
 * This function first identifies and extracts inline code (surrounded by backticks),
 * then processes the remaining text for other formatting elements.
 * 
 * @param {string} text - The text to process for inline formatting
 * @returns {(string | JSX.Element)[]} Array of strings and React elements representing the formatted content
 * @private
 */
const processInlineFormatting = (text: string): (string | JSX.Element)[] => {
  const pieces: (string | JSX.Element)[] = [];
  let currentText = text;
  let index = 0;

  // Process inline code first (backticks)
  const codeRegex = /`([^`]+)`/g;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    // Add text before the code
    if (match.index > index) {
      pieces.push(processEmphasis(text.substring(index, match.index)));
    }

    // Add the code element
    pieces.push(<code key={`code-${match.index}`}>{match[1]}</code>);

    // Update index
    index = match.index + match[0].length;
  }

  // Add remaining text
  if (index < text.length) {
    pieces.push(processEmphasis(text.substring(index)));
  }

  return pieces.length ? pieces : [text];
};

/**
 * Processes emphasis formatting (bold, italic) and links in text.
 * 
 * This function converts:
 * - Markdown links [text](url) to HTML anchor tags
 * - Bold text (**text** or __text__) to <strong> elements
 * - Italic text (*text* or _text_) to <em> elements
 * 
 * @param {string} text - The text to process for emphasis formatting
 * @returns {string | JSX.Element} Either the original text or a React element with HTML formatting
 * @private
 */
const processEmphasis = (text: string): string | JSX.Element => {
  // Process bold and italic
  let processed = text;

  // Convert Markdown links: [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Convert bold: **text** or __text__
  processed = processed.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Convert italic: *text* or _text_
  processed = processed.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // If we made any replacements, render as HTML
  if (processed !== text) {
    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  }

  return text;
}; 