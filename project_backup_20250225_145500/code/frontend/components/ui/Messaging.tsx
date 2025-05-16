import React, { useState } from 'react';
import { Send, Search, ChevronLeft, Phone, Video, MoreHorizontal, Paperclip, Smile, User } from 'lucide-react';
import Image from 'next/image';

// Types
export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: {
    id: string;
    type: 'image' | 'document';
    url: string;
    name: string;
    size?: number;
  }[];
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar: string;
    type: 'homeowner' | 'provider';
  }[];
  lastMessage?: {
    text: string;
    timestamp: Date;
    senderId: string;
    isRead: boolean;
  };
  relatedServiceId?: string;
  relatedServiceName?: string;
  unreadCount: number;
}

// Message Bubble Component
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  avatar?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwnMessage,
  showAvatar = true,
  avatar
}) => {
  return (
    <div className={`flex items-end space-x-2 mb-4 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {showAvatar ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
          {avatar ? (
            <Image src={avatar} alt="User avatar" width={32} height={32} className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-8 flex-shrink-0"></div> // Placeholder for alignment
      )}
      
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
        isOwnMessage 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-gray-200 text-gray-900 rounded-tl-none'
      }`}>
        <p>{message.text}</p>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map(attachment => (
              <div key={attachment.id} className="rounded overflow-hidden">
                {attachment.type === 'image' && (
                  <div className="relative h-48 w-full">
                    <Image 
                      src={attachment.url} 
                      alt={attachment.name} 
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {attachment.type === 'document' && (
                  <a 
                    href={attachment.url} 
                    className="flex items-center p-2 bg-white bg-opacity-20 rounded"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="flex-1 truncate">
                      <div className="font-medium">{attachment.name}</div>
                      <div className="text-xs opacity-80">{formatFileSize(attachment.size || 0)}</div>
                    </div>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatMessageTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

// Conversation List Item Component
interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: (conversationId: string) => void;
  currentUserId: string;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  onClick,
  currentUserId
}) => {
  // Get the other participant (not the current user)
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  if (!otherParticipant) return null;
  
  const hasUnread = conversation.unreadCount > 0;
  
  return (
    <div 
      className={`flex items-center p-3 cursor-pointer transition-colors ${
        isActive 
          ? 'bg-blue-50' 
          : 'hover:bg-gray-50'
      } ${hasUnread ? 'font-medium' : ''}`}
      onClick={() => onClick(conversation.id)}
    >
      <div className="relative flex-shrink-0 mr-3">
        <div className="w-12 h-12 rounded-full overflow-hidden">
          {otherParticipant.avatar ? (
            <Image 
              src={otherParticipant.avatar} 
              alt={otherParticipant.name} 
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600">
              <User className="h-6 w-6" />
            </div>
          )}
        </div>
        {hasUnread && (
          <div className="absolute top-0 right-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            {conversation.unreadCount}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <h4 className="text-sm font-medium truncate">{otherParticipant.name}</h4>
          {conversation.lastMessage && (
            <span className="text-xs text-gray-500">
              {formatMessageTime(conversation.lastMessage.timestamp, true)}
            </span>
          )}
        </div>
        
        {conversation.relatedServiceName && (
          <div className="text-xs text-blue-600 truncate mt-0.5">
            RE: {conversation.relatedServiceName}
          </div>
        )}
        
        {conversation.lastMessage && (
          <p className="text-sm text-gray-600 truncate mt-1">
            {conversation.lastMessage.senderId === currentUserId ? 'You: ' : ''}
            {conversation.lastMessage.text}
          </p>
        )}
      </div>
    </div>
  );
};

// Message Thread Component
interface MessageThreadProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (text: string, attachments?: File[]) => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  isMobile = false
}) => {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 border-l">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <MessageSquare className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No conversation selected</h3>
          <p className="text-gray-600 mt-1">Choose a conversation or start a new one</p>
        </div>
      </div>
    );
  }
  
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText, attachments);
      setMessageText('');
      setAttachments([]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };
  
  return (
    <div className="flex flex-col h-full border-l">
      {/* Conversation Header */}
      <div className="flex items-center p-3 border-b bg-white">
        {isMobile && onBack && (
          <button 
            onClick={onBack} 
            className="mr-2 p-1 rounded-full hover:bg-gray-100"
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        
        <div className="flex-shrink-0 mr-3">
          {otherParticipant?.avatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <Image 
                src={otherParticipant.avatar} 
                alt={otherParticipant.name} 
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium">{otherParticipant?.name}</h3>
          {conversation.relatedServiceName && (
            <p className="text-xs text-blue-600 truncate">
              RE: {conversation.relatedServiceName}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Call">
            <Phone className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Video call">
            <Video className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100" aria-label="More options">
            <MoreHorizontal className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUserId;
              const showAvatar = index === 0 || 
                messages[index - 1].senderId !== message.senderId ||
                new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 5 * 60 * 1000;
              
              return (
                <MessageBubble 
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showAvatar={showAvatar}
                  avatar={isOwnMessage 
                    ? conversation.participants.find(p => p.id === currentUserId)?.avatar
                    : otherParticipant?.avatar
                  }
                />
              );
            })}
          </div>
        )}
      </div>
      
      {/* Message Input */}
      <div className="border-t bg-white p-3">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-none">
            <label htmlFor="attach-file" className="p-2 rounded-full hover:bg-gray-100 inline-block cursor-pointer">
              <Paperclip className="h-5 w-5 text-gray-600" />
              <input 
                type="file" 
                id="attach-file" 
                className="sr-only" 
                onChange={handleFileChange}
                multiple
              />
            </label>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="relative">
              <textarea
                id="message-input"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[42px] max-h-40"
                rows={1}
                aria-label="Message text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messageText.trim()) {
                      handleSendMessage(e);
                    }
                  }
                }}
              />
              <label htmlFor="message-input" className="sr-only">Type a message</label>
              <button 
                type="button"
                className="absolute right-3 bottom-2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Add emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 rounded px-2 py-1 text-xs flex items-center"
                  >
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        const newFiles = [...attachments];
                        newFiles.splice(index, 1);
                        setAttachments(newFiles);
                      }}
                      aria-label={`Remove file ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex-none">
            <button 
              type="submit" 
              className={`p-2 rounded-full ${
                messageText.trim() 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!messageText.trim()}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Messaging Component
interface MessagingProps {
  currentUserId: string;
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: (conversationId: string, text: string, attachments?: File[]) => void;
  messages: Record<string, Message[]>;
  onSearchConversations?: (query: string) => void;
  isMobile?: boolean;
}

export const Messaging: React.FC<MessagingProps> = ({
  currentUserId,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onSendMessage,
  messages,
  onSearchConversations,
  isMobile = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationList, setShowConversationList] = useState(!selectedConversationId || !isMobile);
  
  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId) || null
    : null;
  
  const selectedMessages = (selectedConversationId && messages[selectedConversationId]) || [];
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearchConversations) {
      onSearchConversations(query);
    }
  };
  
  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    }
  };
  
  const handleBack = () => {
    setShowConversationList(true);
  };
  
  const handleSendMessage = (text: string, attachments?: File[]) => {
    if (selectedConversationId) {
      onSendMessage(selectedConversationId, text, attachments);
    }
  };
  
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {showConversationList ? (
          // Conversation List for Mobile
          <div className="flex flex-col h-full">
            <div className="p-3 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={handleSearch}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p>No conversations yet</p>
                  </div>
                </div>
              ) : (
                conversations.map(conversation => (
                  <ConversationListItem 
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === selectedConversationId}
                    onClick={handleSelectConversation}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          // Message Thread for Mobile
          <MessageThread 
            conversation={selectedConversation}
            messages={selectedMessages}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            onBack={handleBack}
            isMobile={true}
          />
        )}
      </div>
    );
  }
  
  // Desktop layout
  return (
    <div className="h-full flex rounded-lg overflow-hidden border bg-white">
      {/* Conversation List */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r">
        <div className="p-3 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={handleSearch}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p>No conversations yet</p>
              </div>
            </div>
          ) : (
            conversations.map(conversation => (
              <ConversationListItem 
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === selectedConversationId}
                onClick={handleSelectConversation}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Message Thread */}
      <div className="flex-1">
        <MessageThread 
          conversation={selectedConversation}
          messages={selectedMessages}
          currentUserId={currentUserId}
          onSendMessage={handleSendMessage}
          isMobile={false}
        />
      </div>
    </div>
  );
};

// Helper Components
function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Helper Functions
function formatMessageTime(dateInput: Date | string | number, shortFormat = false): string {
  // Ensure we have a valid Date object
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (shortFormat) {
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else if (now.getFullYear() === date.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    }
  } else {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
} 