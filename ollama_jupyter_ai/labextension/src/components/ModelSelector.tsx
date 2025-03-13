/**
 * @file ModelSelector.tsx
 * @description This file contains the ModelSelector component which provides a dropdown interface
 * for selecting an Ollama AI model to use with the AI Assistant. It allows users to choose from
 * available models and includes a refresh button to update the list of models.
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../hooks/useTheme';

/**
 * Props for the ModelSelector component.
 * @interface ModelSelectorProps
 * @property {string[]} models - Array of available model names to display in the dropdown.
 * @property {string} selectedModel - The currently selected model name.
 * @property {boolean} isLoading - Whether the application is currently loading or processing a request.
 * @property {(e: React.ChangeEvent<HTMLSelectElement>) => void} onModelChange - Handler for model selection changes.
 * @property {() => void} onRefreshModels - Handler for refreshing the list of available models.
 */
interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  isLoading: boolean;
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRefreshModels: () => void;
}

/**
 * The ModelSelector component provides a dropdown menu for selecting an Ollama AI model
 * along with a refresh button to update the available models list.
 * 
 * Features:
 * - Displays a dropdown with all available Ollama models
 * - Shows a loading state when no models are available
 * - Provides a refresh button to update the model list
 * - Disables interaction during loading states
 * - Visual feedback during refresh operations
 * - Adapts to light/dark theme
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  isLoading,
  onModelChange,
  onRefreshModels
}) => {
  // Get current theme
  const { isDarkTheme } = useTheme();

  return (
    <div className={`jp-AIAssistant-modelSelector ${isDarkTheme ? 'jp-AIAssistant-modelSelector-dark' : 'jp-AIAssistant-modelSelector-light'}`}>
      {/* Model selection dropdown */}
      <select
        className="jp-AIAssistant-modelSelect"
        value={selectedModel}
        onChange={onModelChange}
        disabled={isLoading}
        title="Select Ollama model"
      >
        {models.length === 0 ? (
          // Display loading message when no models are available
          <option value="">Loading models...</option>
        ) : (
          // Map available models to option elements
          models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))
        )}
      </select>

      {/* Refresh button to update model list */}
      <button
        className="jp-AIAssistant-message-control-button"
        onClick={onRefreshModels}
        disabled={isLoading}
        title="Refresh model list"
      >
        <FontAwesomeIcon
          icon={faSync}
          className={`fa-icon-sm ${isLoading ? 'fa-spin' : ''}`}
        />
      </button>
    </div>
  );
};

export default ModelSelector; 