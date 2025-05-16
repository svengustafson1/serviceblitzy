'use client';

import React, { useEffect, useState } from 'react';
import { Messaging } from '../../../../components/ui/Messaging';
import { MessagingProvider, useMessaging } from '../../../../lib/MessagingContext';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, PlusCircle } from 'lucide-react';

// Mock user data for demo purposes
const currentUser = {
  id: 'user-1',
  name: 'John Doe',
  avatar: '/images/avatar-placeholder.jpg',
  type: 'homeowner' as const
};

// Sample service providers for demo purposes
const serviceProviders = [
  {
    id: 'provider-1',
    name: 'Alex Johnson',
    avatar: '/images/provider-avatar-1.jpg',
    type: 'provider' as const,
    services: ['Lawn Care', 'Gardening']
  },
  {
    id: 'provider-2',
    name: 'Sarah Wilson',
    avatar: '/images/provider-avatar-2.jpg',
    type: 'provider' as const,
    services: ['Plumbing', 'Electrical']
  },
  {
    id: 'provider-3',
    name: 'Mike Thompson',
    avatar: '/images/provider-avatar-3.jpg',
    type: 'provider' as const,
    services: ['House Cleaning', 'Window Washing']
  }
];

// Wrapper component to use the messaging context
function MessagesPageContent() {
  const {
    conversations,
    messages,
    selectedConversationId,
    selectConversation,
    sendMessage,
    startNewConversation
  } = useMessaging();

  const searchParams = useSearchParams();
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Check for conversation ID in URL parameters
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversationId !== selectedConversationId) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        selectConversation(conversationId);
      }
    }
  }, [conversations, searchParams, selectConversation, selectedConversationId]);

  const handleSendMessage = (conversationId: string, text: string, attachments?: File[]) => {
    sendMessage(conversationId, text, attachments);
  };

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
    
    // Update URL with conversation ID for sharing/bookmarking
    const url = new URL(window.location.href);
    url.searchParams.set('conversation', conversationId);
    window.history.pushState({}, '', url);
  };

  const handleStartNewConversation = () => {
    if (!selectedProvider || !newMessageText.trim()) return;
    
    const provider = serviceProviders.find(p => p.id === selectedProvider);
    if (!provider) return;
    
    const conversationId = startNewConversation(
      provider.id,
      provider.name,
      provider.avatar,
      'provider',
      newMessageText
    );
    
    // Close modal and reset fields
    setShowNewMessageModal(false);
    setNewMessageText('');
    setSelectedProvider('');
    
    // Select the new conversation
    selectConversation(conversationId);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('conversation', conversationId);
    window.history.pushState({}, '', url);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center">
          <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
          Messages
        </h1>
        <button
          onClick={() => setShowNewMessageModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          New Message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl shadow-sm p-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Messages Yet</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Start a conversation with a service provider to coordinate services or ask questions.
          </p>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Start a Conversation
          </button>
        </div>
      ) : (
        <Messaging
          currentUserId={currentUser.id}
          conversations={conversations}
          selectedConversationId={selectedConversationId || undefined}
          onSelectConversation={handleSelectConversation}
          onSendMessage={handleSendMessage}
          messages={messages}
          isMobile={false}
        />
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Message</h3>
            
            <div className="mb-4">
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                Select Service Provider
              </label>
              <select
                id="provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a provider</option>
                {serviceProviders.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} ({provider.services.join(', ')})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your message here..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewConversation}
                disabled={!selectedProvider || !newMessageText.trim()}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                  selectedProvider && newMessageText.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Page component with provider wrapper
export default function MessagesPage() {
  return (
    <MessagingProvider
      currentUserId={currentUser.id}
      currentUserName={currentUser.name}
      currentUserAvatar={currentUser.avatar}
      currentUserType={currentUser.type}
    >
      <MessagesPageContent />
    </MessagingProvider>
  );
}

// Helper Component
function CustomMessageSquare(props: React.SVGProps<SVGSVGElement>) {
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