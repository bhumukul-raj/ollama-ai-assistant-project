# Architecture Overview

This document provides an overview of the Ollama JupyterLab AI Assistant's architecture, explaining the major components and how they interact.

## High-Level Architecture

The extension follows a modern React-based architecture with a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      JupyterLab Extension                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       React Application                      │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │  UI Components  │◄────┤ Context Provider │                │
│  └─────────────────┘     └────────┬────────┘                │
│                                   │                          │
│  ┌─────────────────┐     ┌────────▼────────┐                │
│  │  React Hooks    │◄────┤   Service Layer  │                │
│  └─────────────────┘     └────────┬────────┘                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                         Ollama API                           │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. JupyterLab Extension Integration

- **index.ts**: The entry point for the extension, registers with JupyterLab
- **widget.tsx**: Creates the React widget that hosts the application
- **notebook-extension.ts**: Handles notebook-specific functionality

### 2. React Application

#### UI Components
- **AIAssistantPanel.tsx**: The main container component
- **MessageList.tsx**: Displays the conversation messages
- **InputArea.tsx**: Handles user input
- **ModelSelector.tsx**: Manages model selection
- **ConversationList.tsx**: Manages saved conversations

#### Context Provider
- **AIAssistantContext.tsx**: Manages application state and business logic
- Provides a context API for components to consume

#### Hooks
- **useOllamaApi.ts**: Manages communication with Ollama API
- **useNotebookContent.ts**: Manages notebook content access

#### Services
- **OllamaService.ts**: Handles communication with Ollama API
- **NotebookService.ts**: Interacts with JupyterLab notebooks

#### Utilities
- **formatUtils.tsx**: Formats messages and code blocks

### 3. External APIs

- **Ollama API**: Provides access to language models
- **JupyterLab Notebook API**: Access to notebook content and operations

## Data Flow

1. **User Interaction** → The user interacts with a component (e.g., sends a message)
2. **Component Event** → The component calls a context method
3. **Context Processing** → The context processes the event and calls service methods
4. **Service API Call** → The service makes API calls to Ollama
5. **Response Processing** → The response is processed by the service and returned to the context
6. **State Update** → The context updates the state
7. **UI Update** → Components re-render with the updated state

## State Management

The application uses React Context for state management:

- **AIAssistantContext**: Manages the main application state
- State includes:
  - Current messages
  - Loading states
  - User preferences
  - Model information

## Responsive Design

The UI is designed to be responsive with:

- CSS media queries for different screen sizes
- Compact mode for smaller viewport widths
- Flexible layouts using CSS flexbox

## Key Capabilities

1. **Message Streaming**: Real-time streaming of AI responses
2. **Context Awareness**: Understanding of notebook content
3. **Persistence**: Local storage for saving conversations and preferences
4. **Code Handling**: Special treatment for code blocks with syntax highlighting

## Extensibility Points

The architecture allows for easy extension in these areas:

1. **Additional Features**: Add new specialized functionality
2. **Additional Models**: Support for more Ollama models
3. **Enhanced Formatting**: Extend message and code formatting
4. **New Service Integrations**: Add additional AI services beyond Ollama

## Further Details

For more detailed information about specific components, see:

- [Component Reference](component-reference.md)
- [State Management](state-management.md)
- [API Integration](api-integration.md) 