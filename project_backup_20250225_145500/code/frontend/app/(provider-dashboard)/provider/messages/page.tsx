'use client';

import React, { useState } from 'react';
import { Search, Send, Paperclip, ChevronRight, MessageSquare, Phone, Video } from 'lucide-react';
import Image from 'next/image';

// Mock conversation data (would come from API in production)
const mockConversations = [
  {
    id: 'conv1',
    customerName: 'John Smith',
    customerAvatar: '/images/avatar-placeholder.jpg',
    lastMessage: 'Thanks for the quote. When can you start?',
    timestamp: '10:30 AM',
    unread: true,
    property: '123 Main St',
    service: 'Lawn Mowing'
  },
  {
    id: 'conv2',
    customerName: 'Sarah Johnson',
    customerAvatar: '/images/avatar-placeholder.jpg',
    lastMessage: 'I need to reschedule our appointment.',
    timestamp: 'Yesterday',
    unread: false,
    property: '456 Elm St',
    service: 'Garden Cleanup'
  },
  {
    id: 'conv3',
    customerName: 'Mike Wilson',
    customerAvatar: '/images/avatar-placeholder.jpg',
    lastMessage: 'The service was great, thank you!',
    timestamp: 'Jul 18',
    unread: false,
    property: '789 Oak Ave',
    service: 'Hedge Trimming'
  },
  {
    id: 'conv4',
    customerName: 'Amanda Brown',
    customerAvatar: '/images/avatar-placeholder.jpg',
    lastMessage: 'Is the quote still valid?',
    timestamp: 'Jul 15',
    unread: false,
    property: '234 Pine St',
    service: 'Sprinkler Repair'
  }
];

// Mock messages for the first conversation
const mockMessages = [
  {
    id: 'msg1',
    senderId: 'provider',
    text: 'Hi John, I can provide lawn mowing services for your property. Based on the size you provided (2,500 sq ft), I can quote $45 per session. How does that sound?',
    timestamp: 'Jul 20, 9:15 AM',
    read: true
  },
  {
    id: 'msg2',
    senderId: 'customer',
    text: 'That sounds reasonable. How often would you recommend mowing?',
    timestamp: 'Jul 20, 9:30 AM',
    read: true
  },
  {
    id: 'msg3',
    senderId: 'provider',
    text: 'For this time of year, I recommend weekly mowing to keep your lawn healthy. We can adjust to bi-weekly during slower growth periods.',
    timestamp: 'Jul 20, 9:45 AM',
    read: true
  },
  {
    id: 'msg4',
    senderId: 'customer',
    text: 'Perfect. Let\'s go with weekly for now. When can you start?',
    timestamp: 'Jul 20, 10:30 AM',
    read: true
  },
  {
    id: 'msg5',
    senderId: 'provider',
    text: 'I have availability this Thursday morning, or I could come next Monday afternoon. Would either of those work for you?',
    timestamp: 'Jul 20, 10:45 AM',
    read: true
  },
  {
    id: 'msg6',
    senderId: 'customer',
    text: 'Thanks for the quote. When can you start?',
    timestamp: 'Today, 10:30 AM',
    read: false
  }
];

export default function ProviderMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageText, setMessageText] = useState('');
  const [conversations, setConversations] = useState(mockConversations);
  const [messages, setMessages] = useState(mockMessages);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    const newMessage = {
      id: `msg${messages.length + 1}`,
      senderId: 'provider',
      text: messageText,
      timestamp: 'Just now',
      read: true
    };
    
    setMessages([...messages, newMessage]);
    setMessageText('');
    
    // Update last message in conversations list
    const updatedConversations = conversations.map(conv => 
      conv.id === selectedConversation.id 
        ? { ...conv, lastMessage: messageText, timestamp: 'Just now' }
        : conv
    );
    
    setConversations(updatedConversations);
  };
  
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    
    // Mark as read when selected
    const updatedConversations = conversations.map(conv => 
      conv.id === conversation.id 
        ? { ...conv, unread: false }
        : conv
    );
    
    setConversations(updatedConversations);
  };
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex h-full bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Search conversations"
                className="w-full px-3 py-2 pl-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`cursor-pointer hover:bg-gray-50 p-3 border-b ${
                  selectedConversation.id === conversation.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      <Image 
                        src={conversation.customerAvatar} 
                        alt={conversation.customerName}
                        width={40}
                        height={40}
                      />
                    </div>
                    {conversation.unread && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold">{conversation.customerName}</span>
                      <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                    </div>
                    <div className="text-sm text-gray-600 truncate">{conversation.lastMessage}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {conversation.property} • {conversation.service}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Message Thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Conversation Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                  <Image 
                    src={selectedConversation.customerAvatar} 
                    alt={selectedConversation.customerName}
                    width={40}
                    height={40}
                  />
                </div>
                <div>
                  <div className="font-semibold">{selectedConversation.customerName}</div>
                  <div className="text-xs text-gray-600">
                    {selectedConversation.property} • {selectedConversation.service}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="Start phone call"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="Start video call"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="View customer details"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`flex ${message.senderId === 'provider' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderId === 'provider'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div>{message.text}</div>
                    <div className={`text-xs mt-1 ${
                      message.senderId === 'provider' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <button 
                  type="button"
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  aria-label="Send message"
                  disabled={!messageText.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700">No Conversation Selected</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 