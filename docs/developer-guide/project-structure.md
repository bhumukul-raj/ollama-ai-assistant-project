# Project Structure

This document explains the directory and file structure of the Ollama JupyterLab AI Assistant project.

## Root Directory

```
ollama-ai-assistant-project/
├── docs/                       # Documentation files
├── ollama_jupyter_ai/          # Main Python package
│   ├── __init__.py             # Package initialization
│   ├── static/                 # Built JS files for the extension
│   └── labextension/           # TypeScript/React source code
├── MANIFEST.in                 # Manifest file for Python packaging
├── package.json                # NPM package configuration
├── pyproject.toml              # Python project configuration
├── README.md                   # Project README
├── setup.py                    # Python setup script
└── tsconfig.json               # TypeScript configuration
```

## Python Package

The `ollama_jupyter_ai` directory contains the Python package for the extension:

```
ollama_jupyter_ai/
├── __init__.py                 # Package initialization and extension path registration
├── static/                     # Built JavaScript files (generated)
│   ├── package.json            # Generated package info
│   ├── remoteEntry.*.js        # JupyterLab module federation entry
│   └── static/                 # Static assets
└── labextension/               # TypeScript source code
```

## TypeScript/React Source Code

The `ollama_jupyter_ai/labextension` directory contains the TypeScript/React source code:

```
labextension/
├── src/                        # Source code
│   ├── components/             # React components
│   │   ├── AIAssistantPanel.tsx     # Main panel component
│   │   ├── InputArea.tsx            # Input area component
│   │   ├── MessageList.tsx          # Message list component
│   │   ├── ModelSelector.tsx        # Model selector component
│   │   └── TabNavigation.tsx        # Tab navigation component
│   ├── context/                # React context
│   │   └── AIAssistantContext.tsx   # Context provider
│   ├── hooks/                  # Custom React hooks
│   │   ├── useNotebookContent.ts    # Hook for notebook content
│   │   └── useOllamaApi.ts          # Hook for Ollama API
│   ├── services/               # Service classes
│   │   ├── NotebookService.ts       # Service for notebook operations
│   │   └── OllamaService.ts         # Service for Ollama API
│   ├── types/                  # Type definitions
│   │   └── lucide-react.d.ts        # Type definitions for Lucide icons
│   ├── utils/                  # Utility functions
│   │   └── formatUtils.tsx          # Message formatting utilities
│   ├── index.ts                # Extension entry point
│   ├── notebook-extension.ts   # Notebook extension specifics
│   └── widget.tsx              # JupyterLab widget implementation
├── style/                      # CSS styles
│   ├── base.css                # Base styles
│   └── index.css               # CSS entry point
├── package.json                # NPM package configuration
├── schemas/                    # JSON schemas
│   └── tsconfig.schema.json    # TypeScript config schema
└── tsconfig.json               # TypeScript configuration
```

## Component Structure

The React components follow a hierarchical structure:

```
AIAssistantPanel (main container)
├── ModelSelector (model dropdown)
├── TabNavigation (tab selector)
└── content based on active tab:
    ├── Chat Tab
    │   ├── MessageList (conversation)
    │   └── InputArea (message input)
    ├── Analyze Tab
    │   ├── MessageList (analysis results)
    │   └── AnalyzeButton
    └── Improve Tab
        ├── MessageList (improvement suggestions)
        └── ImproveButton
```

## State Management

The state management is centralized in the `AIAssistantContext.tsx` file, which uses React Context to provide state and actions to all components.

## Style Organization

The CSS styles are organized in the `style` directory:

```
style/
├── base.css                    # Core styles for the extension
└── index.css                   # Main CSS entry point
```

The CSS follows a component-based approach with classes prefixed with `jp-AIAssistant-`.

## Build System

The project uses:

- `jupyter_packaging` for Python packaging
- `typescript` for TypeScript compilation
- `jupyterlab` for extension bundling

The build process is configured in:

- `pyproject.toml`: Python build configuration
- `tsconfig.json`: TypeScript configuration
- `package.json`: NPM scripts

## Documentation

The documentation is organized in the `docs` directory:

```
docs/
├── api-reference/             # API reference documentation
├── developer-guide/           # Developer documentation
├── images/                    # Images used in documentation
├── tutorials/                 # Step-by-step tutorials
├── user-guide/                # User documentation
└── README.md                  # Documentation overview
```

## Generated Files

During the build process, several files are generated:

- `ollama_jupyter_ai/static/`: Contains the built JavaScript files
- `lib/`: Temporary TypeScript output directory
- `*.egg-info/`: Python package metadata

These directories should not be manually edited as they are generated during the build process.

## Components

The `src/components` directory contains React components used in the extension:

- `AIAssistantPanel.tsx`: Main panel component that hosts the chat interface
- `MessageList.tsx`: Displays chat messages and handles message interactions
- `InputArea.tsx`: Text input area for user messages
- `ModelSelector.tsx`: Component for selecting and managing Ollama models
- `ConversationList.tsx`: Manages saved conversations 