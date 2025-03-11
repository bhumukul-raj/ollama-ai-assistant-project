# Getting Started

This guide will help you get started with the Ollama JupyterLab AI Assistant. It covers the basics of using the extension and introduces its main features.

## Opening the AI Assistant

1. Start JupyterLab.
2. Look for the "Ollama AI Assistant" icon in the right sidebar. It looks like a robot icon.
3. Click on the icon to open the assistant panel.

If you don't see the icon, make sure the extension is properly installed. See the [Installation Guide](installation.md) for more details.

## The User Interface

The AI Assistant panel consists of several components:

![AI Assistant Interface](../images/ai-assistant-interface.png)

1. **Header**: Contains the title and model selector dropdown.
2. **Conversation Area**: Where messages are displayed.
3. **Input Area**: Where you type your messages.
4. **Toolbar**: Contains buttons for actions like saving, exporting, and importing conversations.

## Selecting a Model

Before you start chatting with the AI Assistant, you should select a model:

1. Click on the model dropdown in the header.
2. Select a model from the list of available models.
3. If you don't see any models, make sure Ollama is running and has at least one model downloaded.

The default model is "mistral", which is a good general-purpose model. For more coding-specific tasks, you might want to try "codellama" if available.

## Using the Chat Interface

The Chat interface allows you to have a conversation with the AI:

1. Type a message in the input area at the bottom of the panel.
2. Press Enter or click the Send button.
3. Wait for the AI to generate a response.
4. You can continue the conversation by sending more messages.

Example questions to try:
- "How do I read CSV files in pandas?"
- "Can you explain principal component analysis?"
- "Write a function to calculate Fibonacci numbers in Python."

## Analyzing and Improving Code

You can use the Chat interface to analyze and improve your code:

1. Copy the code from your notebook cell.
2. Paste it into the chat with a prompt like "Explain this code" or "Improve this code".
3. The AI will analyze the code and provide explanations or suggestions for improvement.

Example prompts:
- "What does this code do? [paste code]"
- "Can you optimize this function? [paste code]"
- "Explain this algorithm: [paste code]"
- "Add error handling to this code: [paste code]"

## Managing Conversations

You can manage your conversations with the AI Assistant:

- **Clear**: Click the trash icon to clear the current conversation.
- **Save**: Click the save icon to save the current conversation.
- **Export**: Click the download icon to export the conversation as JSON.
- **Import**: Click the upload icon to import a previously exported conversation.

## Next Steps

Now that you're familiar with the basics, you might want to explore:

- [Enhanced User Experience](enhanced-user-experience.md) for more advanced features
- [Configuration](configuration.md) for customizing the AI Assistant 