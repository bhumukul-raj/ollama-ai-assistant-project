/**
 * @file ConversationList.tsx
 * @description This file contains the ConversationList component which provides a user interface
 * for managing saved conversations with the AI assistant. It displays a list of conversations
 * with options to search, filter by tags, sort, select, delete, export, and import conversations.
 * The component supports multiple export formats and offers a rich filtering system.
 */
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faDownload,
  faFileExport,
  faFileImport,
  faPlus,
  faSearch,
  faTimes,
  faSort,
  faTag,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { SavedConversation } from '../services/ConversationStorageService';
import { useAIAssistant } from '../context/AIAssistantContext';

/**
 * Props for the ConversationList component.
 * 
 * @interface ConversationListProps
 * @property {SavedConversation[]} conversations - Array of saved conversations to display
 * @property {(id: string) => void} onSelect - Callback when a conversation is selected
 * @property {(id: string) => void} onDelete - Callback when a conversation is deleted
 * @property {(id: string, format: 'json' | 'markdown' | 'notebook') => void} onExport - Callback when a conversation is exported
 * @property {() => void} onImport - Callback when the import button is clicked
 * @property {() => void} onNew - Callback when the new conversation button is clicked
 * @property {boolean} isVisible - Whether the conversation list is currently visible
 * @property {() => void} onBack - Callback when the back button is clicked
 */
interface ConversationListProps {
  conversations: SavedConversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, format: 'json' | 'markdown' | 'notebook') => void;
  onImport: () => void;
  onNew: () => void;
  isVisible: boolean;
  onBack: () => void;
}

/**
 * Component that displays a list of saved conversations with search, filter, and management capabilities.
 * 
 * Features:
 * - Search conversations by title and content
 * - Filter conversations by tags
 * - Sort conversations by date or alphabetically
 * - Select conversations to load
 * - Delete conversations
 * - Export conversations in different formats (JSON, Markdown, Notebook)
 * - Import conversations from files
 * - Create new conversations
 * 
 * @param {ConversationListProps} props - Component properties
 * @returns {JSX.Element} The rendered component
 */
export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
  onDelete,
  onExport,
  onImport,
  onNew,
  isVisible,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Extract all unique tags from conversations
  useEffect(() => {
    const tags = new Set<string>();
    conversations.forEach(conversation => {
      if (conversation.metadata?.tags) {
        conversation.metadata.tags.forEach(tag => tags.add(tag));
      }
    });
    setAllTags(Array.from(tags).sort());
  }, [conversations]);

  // Filter conversations based on search query and tag filter
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = searchQuery === '' ||
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.messages.some(message =>
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesTag = filterTag === null ||
      (conversation.metadata?.tags && conversation.metadata.tags.includes(filterTag));

    return matchesSearch && matchesTag;
  });

  // Sort conversations based on sort order
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    switch (sortOrder) {
      case 'newest':
        return b.updatedAt - a.updatedAt;
      case 'oldest':
        return a.updatedAt - b.updatedAt;
      case 'az':
        return a.title.localeCompare(b.title);
      case 'za':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Format date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Clear search, filter, and reset sort order
  const resetFilters = () => {
    setSearchQuery('');
    setFilterTag(null);
    setSortOrder('newest');
  };

  // Handle file input change for importing conversations
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const content = event.target.result as string;
        onImport();
      }
    };
    reader.readAsText(file);
  };

  // Display tag as pill with color based on tag name
  const renderTag = (tag: string) => {
    // Generate color based on tag name (consistent for same tag)
    const hash = tag.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    const backgroundColor = `hsl(${hue}, 70%, 80%)`;
    const textColor = hue > 200 && hue < 320 ? '#000' : '#333';

    return (
      <span
        key={tag}
        className="jp-AIAssistant-conversation-tag"
        style={{ backgroundColor, color: textColor }}
        onClick={() => setFilterTag(tag === filterTag ? null : tag)}
      >
        {tag}
        {tag === filterTag && (
          <FontAwesomeIcon
            icon={faTimes}
            className="jp-AIAssistant-conversation-tag-remove"
          />
        )}
      </span>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="jp-AIAssistant-conversations">
      <div className="jp-AIAssistant-conversations-header">
        <div className="jp-AIAssistant-conversations-header-left">
          <button
            className="jp-AIAssistant-button-small"
            onClick={onBack}
            title="Back to chat"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h3>Saved Conversations</h3>
        </div>
        <div className="jp-AIAssistant-conversations-actions">
          <button
            className="jp-AIAssistant-button-small"
            onClick={onNew}
            title="New conversation"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button
            className="jp-AIAssistant-button-small"
            onClick={() => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = '.json,.md,.ipynb';
              fileInput.onchange = handleFileUpload as any;
              fileInput.click();
            }}
            title="Import conversation"
          >
            <FontAwesomeIcon icon={faFileImport} />
          </button>
        </div>
      </div>

      <div className="jp-AIAssistant-conversations-filters">
        <div className="jp-AIAssistant-conversations-search">
          <FontAwesomeIcon icon={faSearch} className="jp-AIAssistant-search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="jp-AIAssistant-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <div className="jp-AIAssistant-conversations-sort">
          <button
            className="jp-AIAssistant-button-small"
            onClick={() => {
              const orders: Array<'newest' | 'oldest' | 'az' | 'za'> = ['newest', 'oldest', 'az', 'za'];
              const currentIndex = orders.indexOf(sortOrder);
              const nextIndex = (currentIndex + 1) % orders.length;
              setSortOrder(orders[nextIndex]);
            }}
            title={`Sorted by: ${sortOrder}`}
          >
            <FontAwesomeIcon icon={faSort} />
            <span>
              {sortOrder === 'newest' && 'Newest'}
              {sortOrder === 'oldest' && 'Oldest'}
              {sortOrder === 'az' && 'A-Z'}
              {sortOrder === 'za' && 'Z-A'}
            </span>
          </button>

          {(filterTag || searchQuery) && (
            <button
              className="jp-AIAssistant-button-small jp-AIAssistant-button-clear-filters"
              onClick={resetFilters}
              title="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="jp-AIAssistant-conversations-tags">
            <FontAwesomeIcon icon={faTag} className="jp-AIAssistant-tag-icon" />
            <div className="jp-AIAssistant-tag-list">
              {allTags.map(tag => renderTag(tag))}
            </div>
          </div>
        )}
      </div>

      <div className="jp-AIAssistant-conversations-list">
        {sortedConversations.length === 0 ? (
          <div className="jp-AIAssistant-no-conversations">
            {conversations.length === 0 ? (
              <p>No saved conversations yet.</p>
            ) : (
              <p>No conversations match your search.</p>
            )}
          </div>
        ) : (
          sortedConversations.map(conversation => (
            <div
              key={conversation.id}
              className="jp-AIAssistant-conversation-item"
              onClick={() => onSelect(conversation.id)}
            >
              <div className="jp-AIAssistant-conversation-content">
                <h4 className="jp-AIAssistant-conversation-title">
                  {conversation.title || 'Untitled Conversation'}
                </h4>
                <div className="jp-AIAssistant-conversation-meta">
                  <span className="jp-AIAssistant-conversation-date">
                    {formatDate(conversation.updatedAt)}
                  </span>
                  <span className="jp-AIAssistant-conversation-model">
                    {conversation.modelName}
                  </span>
                  <span className="jp-AIAssistant-conversation-count">
                    {conversation.messages.length} messages
                  </span>
                </div>

                {conversation.metadata?.tags && conversation.metadata.tags.length > 0 && (
                  <div className="jp-AIAssistant-conversation-tags">
                    {conversation.metadata.tags.map(tag => renderTag(tag))}
                  </div>
                )}

                <p className="jp-AIAssistant-conversation-preview">
                  {conversation.messages[0]?.content.substring(0, 100)}
                  {conversation.messages[0]?.content.length > 100 ? '...' : ''}
                </p>
              </div>

              <div className="jp-AIAssistant-conversation-actions">
                <button
                  className="jp-AIAssistant-button-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(conversation.id, 'json');
                  }}
                  title="Export as JSON"
                >
                  <FontAwesomeIcon icon={faDownload} />
                </button>
                <button
                  className="jp-AIAssistant-button-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conversation.id);
                  }}
                  title="Delete conversation"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList; 