/**
 * @file ErrorBoundary.tsx
 * @description This file contains an error boundary component that catches and handles errors
 * in the component tree. It prevents the entire UI from crashing when an error occurs in a component,
 * and provides a way to display a fallback UI, log errors, and reset the application state.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faRotateRight } from '@fortawesome/free-solid-svg-icons';

/**
 * Props for the ErrorBoundary component.
 * @interface ErrorBoundaryProps
 * @property {ReactNode} children - Child components to be rendered and monitored for errors.
 * @property {ReactNode} [fallback] - Optional custom UI to display when an error occurs.
 * @property {() => void} [onReset] - Optional callback function to run when the error boundary is reset.
 * @property {(error: Error, errorInfo: ErrorInfo) => void} [onError] - Optional callback for custom error handling.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State for the ErrorBoundary component.
 * @interface ErrorBoundaryState
 * @property {boolean} hasError - Indicates whether an error has been caught.
 * @property {Error | null} error - The error object that was caught, if any.
 * @property {ErrorInfo | null} errorInfo - Information about the component stack where the error occurred.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in the child component tree.
 * It displays a fallback UI instead of crashing the entire component tree.
 * 
 * Usage example:
 * ```tsx
 * <ErrorBoundary onError={(error, info) => logErrorToService(error, info)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * React lifecycle method that's called when an error is thrown in a descendant component.
   * Updates component state to indicate an error occurred.
   * 
   * @param {Error} error - The error that was thrown
   * @returns {Partial<ErrorBoundaryState>} New state to set
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * React lifecycle method called after an error is caught.
   * Logs the error and calls the optional onError callback.
   * 
   * @param {Error} error - The caught error
   * @param {ErrorInfo} errorInfo - Information about the component stack
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call optional onError handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error boundary to its initial state and calls the optional onReset callback.
   * This can be used to recover from errors.
   */
  resetErrorBoundary = (): void => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional onReset handler
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * Renders either the children (if no error) or a fallback UI (if error occurred).
   * 
   * @returns {ReactNode} The rendered component
   */
  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      // Render custom fallback UI if provided, otherwise render default error UI
      if (fallback) {
        return fallback;
      }

      return (
        <div className="jp-AIAssistant-error-boundary">
          <div className="jp-AIAssistant-error-content">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="jp-AIAssistant-error-icon"
            />
            <h3>Something went wrong</h3>
            <p>An error occurred in the AI Assistant.</p>
            {error && (
              <div className="jp-AIAssistant-error-details">
                <p className="jp-AIAssistant-error-message">{error.toString()}</p>
              </div>
            )}
            <button
              className="jp-AIAssistant-error-button"
              onClick={this.resetErrorBoundary}
            >
              <FontAwesomeIcon icon={faRotateRight} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary.
 * Useful for adding error handling to components without modifying their implementation.
 * 
 * Usage example:
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   onError: (error, info) => logErrorToService(error, info)
 * });
 * ```
 * 
 * @template P - The props type of the component to wrap
 * @param {React.ComponentType<P>} Component - The component to wrap with error boundary
 * @param {Omit<ErrorBoundaryProps, 'children'>} [errorBoundaryProps={}] - Props to pass to the ErrorBoundary
 * @returns {React.FC<P>} A new component wrapped with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  // Set display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}

export default ErrorBoundary; 