# Ollama JupyterLab AI Assistant

A powerful AI-powered assistant extension for JupyterLab that uses Ollama for local LLM integration. This extension enhances your notebook experience with intelligent code generation, natural language editing, and context-aware assistance.

## Features

- **Natural Language Code Editing**: Write code using natural language instructions
- **Smart Cell Generation**: Generate code cells based on text descriptions
- **Automatic Error Handling**: Get suggestions for fixing code errors
- **Context-Aware Chat Interface**: AI understands the context of your current notebook
- **Local AI Processing**: Uses Ollama for private, local LLM capabilities
- **Modern, Responsive UI**: Clean interface that works well with JupyterLab's design
- **Dark/Light Theme Support**: Adapts to your JupyterLab theme preferences

## New Features in Version 1.1.0

### Architecture Improvements
- **Modular Component Architecture**: Completely refactored the codebase using modern React patterns
- **Structured State Management**: Added context-based state management for better data flow
- **Custom Hooks**: Dedicated hooks for API interactions and notebook operations
- **Code Organization**: Split code into smaller, focused components for better maintainability

### Enhanced AI Capabilities
- **Token-by-Token Streaming**: More natural streaming response generation
- **Improved Caching**: Advanced caching system with persistent storage between sessions
- **Better Error Handling**: More robust error recovery with detailed error messages
- **Typing Indicators**: Visual indicators when the AI is generating a response

### Session Management
- **Save & Load Conversations**: Save conversations and load them later
- **Export & Import**: Export conversations as JSON, Markdown, or Jupyter notebooks
- **History Management**: Browse and manage previous conversations

### Notebook Integration
- **Enhanced Cell Analysis**: More detailed code analysis with suggestions
- **Code Execution**: Run generated code directly from the assistant
- **Cell Management**: Create new cells with assistant-generated code

### UI/UX Improvements
- **Accessibility Enhancements**: Better keyboard navigation, screen reader support
- **High Contrast Mode**: Improved readability for users with visual impairments
- **Expanded Input Area**: Resizable input area for longer prompts
- **Keyboard Shortcuts**: Added keyboard shortcuts for common actions
- **Tooltips**: Added helpful tooltips throughout the interface

### Performance Optimizations
- **LRU Cache**: Least-Recently-Used cache eviction policy
- **Persistent Cache**: Cache is preserved between sessions using local storage
- **Lazy Loading**: Components and resources are loaded only when needed
- **Memory Management**: Better handling of large response histories

### Configuration
- **User Preferences**: Customizable settings for appearance and behavior
- **Model Selection**: Easily switch between different Ollama models
- **Theme Support**: Follows JupyterLab theme settings

## Prerequisites

- JupyterLab >= 4.0.0
- Python >= 3.8
- Ollama (for local AI Processing)

## Installation

### Installing from PyPI (Recommended)

```bash
# Install the extension
pip install ollama-jupyter-ai

# Start JupyterLab
jupyter lab
```

### Installing from TestPyPI

If you want to try the latest development version:

```bash
pip install -i https://test.pypi.org/simple/ ollama-jupyter-ai
jupyter lab
```

### Setting up Ollama

After installing the extension, you need to install and start Ollama:

```bash
# Install Ollama (visit https://ollama.ai for installation instructions)
# Pull a compatible model (like mistral )
ollama pull mistral

# Start the Ollama service
ollama serve
```

### Installing from GitHub

You can also install directly from the GitHub repository:

```bash
pip install git+https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
jupyter lab
```

### Developer Installation

If you want to develop or modify the extension:

1. Clone the repository:
```bash
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install in development mode:
```bash
pip install -e .
jupyter labextension develop --overwrite .
jupyter lab build
```

4. Run JupyterLab:
```bash
jupyter lab
```

## Complete Development Environment Setup

If you're setting up a development environment from scratch, follow these detailed steps:

### Required Python Packages

The following Python packages are required for development:

- **jupyter_packaging**: Handles packaging of Jupyter extensions
- **jupyterlab**: The JupyterLab framework (version 4.0.0 or later)
- Other dependencies will be installed automatically

### Required Node.js Packages

The extension uses several Node.js packages that are specified in the `package.json` file:

- **React and React DOM**: For the UI components
- **@jupyterlab** packages: For integrating with JupyterLab
- **@fortawesome**: For icons
- **axios**: For API requests to Ollama
- **Development tools**: TypeScript, ESLint, etc.

### Complete Setup Process

1. **System Prerequisites**:
   - Python 3.8 or later
   - Node.js 20 or later
   - npm or yarn

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
   cd ollama-ai-assistant-project
   ```

3. **Create a Python Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. **Install Python Dependencies**:
   ```bash
   pip install jupyter_packaging jupyterlab~=4.0.0
   
   ```

5. **Install Node.js Dependencies**:
   ```bash
   yarn install
   # OR
   npm install
   ```

6. **Build the Extension**:
   ```bash
   # Clean any previous builds first
   yarn clean:all  
   # OR
   npm run clean:all

   # Build the extension
   yarn build:prod
   # OR
   npm run build:prod
   ```

7. **Install the Extension in Development Mode**:
   ```bash
   jupyter labextension develop --overwrite .
   jupyter lab build
   ```

8. **Verify Installation**:
   ```bash
   jupyter labextension list | grep ollama-jupyter-ai
   ```

9. **Start JupyterLab**:
   ```bash
   jupyter lab
   ```

### Rebuild After Changes

When you make changes to the TypeScript code, you need to rebuild:

```bash
# For changes to TypeScript files
yarn build:prod  # or npm run build:prod
jupyter lab build

# For complete rebuild (recommended if you have issues)
yarn clean:all && yarn build:prod  # or npm run clean:all && npm run build:prod
pip uninstall ollama-jupyter-ai -y
pip install -e .
jupyter lab clean && jupyter lab build
```

## Troubleshooting

### Extension Not Appearing in JupyterLab

If the extension doesn't appear after standard installation:

1. Check if the extension is listed:
```bash
jupyter labextension list
```

2. If it's not listed, try manual installation steps above.

3. Check browser console for errors (F12 or right-click > Inspect > Console)

### Directory Structure Issues

The extension relies on a specific directory structure. If you encounter build errors:

1. Check `outputDir` settings in package.json files to avoid recursive nesting:
   - Root package.json should point to appropriate output location
   - labextension/package.json should have `"outputDir": "dist"`

2. Ensure proper Python package registration in `__init__.py`:
   - `_jupyter_labextension_paths()` should return the correct path

3. Manually copy the built extension to JupyterLab's extension directory (as in installation step 6)

### Dependency Version Conflicts

If you encounter version conflicts:

1. Update @jupyterlab/services in package.json:
```
"@jupyterlab/services": "^7.0.0"
```

2. Rebuild with compatible versions.

## Usage Guide

### Working with the Assistant

1. **Opening the Assistant**:
   - The assistant panel will appear in the right sidebar of JupyterLab
   - If it doesn't appear, click on the "Ollama AI Assistant" icon in the right sidebar

2. **Asking Questions**:
   - Type your question in the input box at the bottom of the panel
   - Press Enter or click the send button
   - The AI will analyze your current notebook context and provide a response

3. **Code Generation**:
   - Ask for code examples like "Generate a function to calculate the Fibonacci sequence"
   - The assistant will provide code that you can copy into your notebook

4. **Notebook Analysis**:
   - Ask "What does this notebook do?" to get an overview of your current notebook
   - The assistant can analyze variables, imports, and the flow of your code
   - Simply paste your code with a prompt like "Explain this code" or "What does this do?"

5. **Code Improvement**:
   - Ask for improvements by pasting your code with a prompt like "Improve this code" or "Optimize this function"
   - The assistant will suggest optimizations, better practices, or alternative approaches

6. **Error Help**:
   - Paste error messages to get troubleshooting assistance
   - The assistant can suggest fixes for common Python and data science errors

7. **Data Analysis Help**:
   - Ask for help with data manipulation, visualization, or statistical analysis
   - Get suggestions for the best libraries and approaches for your specific task

### Configuration Options

The extension uses default settings that can be adjusted in the source code:

- **Ollama Model**: Change the default model in `OllamaService.ts` (default is mistral)
- **Ollama URL**: Modify the base URL if Ollama is running on a different port or host
- **AI Parameters**: Adjust temperature, max tokens, and other generation parameters

## Development Guide

### Project Structure

```
project-ollama/
├── ollama_jupyter_ai/           # Main Python package
│   ├── __init__.py              # Package initialization and extension path registration
│   └── labextension/            # JupyterLab extension directory
│       ├── src/                 # TypeScript source code
│       │   ├── components/      # React components
│       │   │   └── AIAssistantPanel.tsx  # Main chat interface component
│       │   │   └── Icons.tsx    # FontAwesome icon components
│       │   ├── services/        # Service modules
│       │   │   ├── OllamaService.ts      # Ollama API integration
│       │   │   └── NotebookService.ts    # Notebook manipulation service
│       │   ├── types/           # TypeScript type definitions
│       │   ├── index.ts         # Extension entry point
│       │   └── widget.tsx       # JupyterLab widget implementation
│       ├── style/               # CSS styling
│       ├── package.json         # Node.js package configuration
│       └── tsconfig.json        # TypeScript configuration
├── setup.py                     # Python package setup script
├── pyproject.toml               # Python build system configuration
├── install.json                 # JupyterLab extension metadata
└── README.md                    # This documentation file
```

### Development Tips

1. **Clean Before Rebuilding**: Always clean before rebuilding to avoid stale files:
```bash
cd ollama_jupyter_ai/labextension
yarn clean:all
```

2. **Check Directory Paths**: When making changes, verify all directory paths are consistent

3. **Monitor Build Output**: Check build logs for any errors that might prevent proper installation

4. **Browser Dev Tools**: Use browser developer tools to check for console errors

5. **Useful Development Commands**:

```bash
# Install rimraf for better cleanup (if not already in devDependencies)
yarn add rimraf --dev

# Clean all build artifacts and build production version
yarn clean:all && yarn build:prod

# Uninstall the extension package completely
pip uninstall ollama-jupyter-ai -y

# Reinstall in development mode
pip install -e .

# Clean JupyterLab and rebuild
jupyter lab clean && jupyter lab build

# Check installed extensions
jupyter labextension list

# Run JupyterLab in debug mode
jupyter lab --debug
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.