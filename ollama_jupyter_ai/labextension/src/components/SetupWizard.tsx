/**
 * @file SetupWizard.tsx
 * @description A guided setup wizard component that helps users configure their Ollama AI Assistant.
 * 
 * This component provides a step-by-step interface to verify Ollama installation, check for available
 * models, and test API connectivity. It guides new users through the setup process with clear
 * instructions and visual feedback for each step.
 * 
 * The wizard supports:
 * - Automatic verification of Ollama installation status
 * - Checking for available language models
 * - Testing API connectivity
 * - Error handling with actionable guidance
 * - Skip functionality for experienced users
 * 
 * The component uses the OllamaHealthService to perform connection checks and
 * provides visual feedback on the progress of each setup step.
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faTimes,
  faSpinner,
  faDownload,
  faPlay,
  faRobot
} from '@fortawesome/free-solid-svg-icons';
import { OllamaHealthService } from '../services/OllamaHealthService';

/**
 * Props for the SetupWizard component
 * 
 * @interface SetupWizardProps
 * @property {Function} onComplete - Callback function triggered when all setup steps are successfully completed
 * @property {Function} onSkip - Callback function triggered when the user chooses to skip the setup process
 */
interface SetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Interface defining the structure of a setup wizard step
 * 
 * @interface SetupStep
 * @property {string} title - Display title for the step
 * @property {string} description - Detailed description explaining the step's purpose
 * @property {Function} [action] - Optional async function that performs the actual verification logic
 * @property {boolean} isComplete - Whether the step has been successfully completed
 * @property {boolean} isLoading - Whether the step is currently being processed
 * @property {string} [error] - Optional error message if the step failed
 */
interface SetupStep {
  title: string;
  description: string;
  action?: () => Promise<void>;
  isComplete: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * SetupWizard component that guides users through configuring Ollama AI Assistant
 * 
 * This component handles a multi-step wizard that:
 * 1. Verifies Ollama installation and running status
 * 2. Checks for available language models
 * 3. Tests API connectivity and responsiveness
 * 
 * Each step provides visual feedback on its status and offers guidance 
 * if issues are encountered.
 * 
 * @component
 * @param {SetupWizardProps} props - Component properties
 * @returns {JSX.Element} The rendered setup wizard interface
 */
export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const healthService = new OllamaHealthService();

  useEffect(() => {
    /**
     * Initialize the setup steps with their configuration
     * 
     * This function creates the step definitions with their titles,
     * descriptions, and validation logic.
     */
    const initializeSteps = async () => {
      const initialSteps: SetupStep[] = [
        {
          title: 'Check Ollama Installation',
          description: 'Verifying if Ollama is installed and running...',
          action: async () => {
            const result = await healthService.testConnection();
            if (!result.isConnected) {
              throw new Error(result.error || 'Ollama is not running');
            }
          },
          isComplete: false,
          isLoading: false
        },
        {
          title: 'Check Available Models',
          description: 'Checking for available Ollama models...',
          action: async () => {
            const result = await healthService.testConnection();
            if (!result.details?.models?.length) {
              throw new Error('No models found. Please pull a model first.');
            }
          },
          isComplete: false,
          isLoading: false
        },
        {
          title: 'Verify API Connection',
          description: 'Testing connection to Ollama API...',
          action: async () => {
            await healthService.waitForHealthy(5000);
          },
          isComplete: false,
          isLoading: false
        }
      ];

      setSteps(initialSteps);
    };

    initializeSteps();
  }, []);

  /**
   * Execute a specific setup step
   * 
   * This function runs the validation logic for a step, updates its status based on
   * the result, and moves to the next step if successful. If an error occurs, it
   * updates the step with error information.
   * 
   * @param {number} index - Index of the step to execute
   */
  const executeStep = async (index: number) => {
    if (!steps[index]?.action) return;

    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, isLoading: true, error: undefined } : step
    ));

    try {
      await steps[index].action!();
      setSteps(prev => prev.map((step, i) =>
        i === index ? { ...step, isComplete: true, isLoading: false } : step
      ));

      if (index < steps.length - 1) {
        setCurrentStep(index + 1);
      } else {
        onComplete();
      }
    } catch (error) {
      setSteps(prev => prev.map((step, i) =>
        i === index ? {
          ...step,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : step
      ));
    }
  };

  /**
   * Render the status indicator for a step
   * 
   * This function returns the appropriate icon based on the step's current status:
   * - A spinning loader for in-progress steps
   * - A checkmark for completed steps
   * - An error indicator for failed steps
   * 
   * @param {SetupStep} step - The step whose status needs to be rendered
   * @returns {JSX.Element|null} The status indicator component
   */
  const renderStepStatus = (step: SetupStep) => {
    if (step.isLoading) {
      return <FontAwesomeIcon icon={faSpinner} spin className="fa-icon-md" />;
    }
    if (step.isComplete) {
      return <FontAwesomeIcon icon={faCheck} className="fa-icon-md text-success" />;
    }
    if (step.error) {
      return <FontAwesomeIcon icon={faTimes} className="fa-icon-md text-error" />;
    }
    return null;
  };

  return (
    <div className="jp-AIAssistant-setup-wizard">
      <div className="jp-AIAssistant-setup-wizard-header">
        <FontAwesomeIcon icon={faRobot} className="fa-icon-lg" />
        <h2>Welcome to Ollama AI Assistant</h2>
        <p>Let's get you set up with Ollama</p>
      </div>

      <div className="jp-AIAssistant-setup-wizard-steps">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`jp-AIAssistant-setup-wizard-step ${index === currentStep ? 'active' : ''
              } ${step.isComplete ? 'complete' : ''}`}
          >
            <div className="jp-AIAssistant-setup-wizard-step-header">
              <h3>{step.title}</h3>
              {renderStepStatus(step)}
            </div>

            <p>{step.description}</p>

            {step.error && (
              <div className="jp-AIAssistant-setup-wizard-error">
                <FontAwesomeIcon icon={faTimes} className="fa-icon-sm" />
                {step.error}
              </div>
            )}

            {index === currentStep && !step.isComplete && (
              <div className="jp-AIAssistant-setup-wizard-actions">
                <button
                  className="jp-AIAssistant-setup-wizard-button"
                  onClick={() => executeStep(index)}
                  disabled={step.isLoading}
                >
                  {step.isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Checking...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlay} />
                      Start Check
                    </>
                  )}
                </button>

                {step.error && (
                  <button
                    className="jp-AIAssistant-setup-wizard-button secondary"
                    onClick={() => window.open('https://ollama.ai', '_blank')}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Install Ollama
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="jp-AIAssistant-setup-wizard-footer">
        <button
          className="jp-AIAssistant-setup-wizard-button secondary"
          onClick={onSkip}
        >
          Skip Setup
        </button>

        <button
          className="jp-AIAssistant-setup-wizard-button"
          onClick={() => executeStep(currentStep)}
          disabled={currentStep >= steps.length}
        >
          {currentStep >= steps.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}; 