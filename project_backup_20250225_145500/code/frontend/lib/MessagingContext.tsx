'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '../components/ui/Messaging';
import { useNotifications } from './NotificationContext';
import safeStorage from './utils/storage';

interface MessagingContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  selectedConversationId: string | null;
  selectConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, text: string, attachments?: File[]) => void;
  startNewConversation: (
    recipientId: string, 
    recipientName: string, 
    recipientAvatar: string, 
    recipientType: 'homeowner' | 'provider',
    initialMessage?: string,
    serviceId?: string,
    serviceName?: string
  ) => string;
  markMessagesAsRead: (conversationId: string) => void;
  hasUnreadMessages: boolean;
  unreadConversationCount: number;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

interface MessagingProviderProps {
  children: React.ReactNode;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  currentUserType: 'homeowner' | 'provider';
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({
  children,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserType
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  const { addNotification } = useNotifications();

  // Load conversations from storage on initial render
  useEffect(() => {
    // In a real application, this would fetch from an API
    // For demo purposes, we'll use storage to persist data
    
    try {
      const storedConversations = safeStorage.getItem(`messaging_conversations_${currentUserId}`);
      const storedMessages = safeStorage.getItem(`messaging_messages_${currentUserId}`);
      
      if (storedConversations && storedMessages) {
        // Parse dates in conversations
        const parsedConversations = JSON.parse(storedConversations);
        parsedConversations.forEach((conv: any) => {
          if (conv.lastMessage && conv.lastMessage.timestamp) {
            conv.lastMessage.timestamp = new Date(conv.lastMessage.timestamp);
          }
        });
        setConversations(parsedConversations);
        
        // Parse dates in messages
        const parsedMessages = JSON.parse(storedMessages);
        Object.keys(parsedMessages).forEach(convId => {
          parsedMessages[convId] = parsedMessages[convId].map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        });
        
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Error loading messaging data:', error);
    }
  }, [currentUserId]);

  // Save conversations and messages to storage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      safeStorage.setItem(`messaging_conversations_${currentUserId}`, JSON.stringify(conversations));
    }
  }, [conversations, currentUserId]);

  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      safeStorage.setItem(`messaging_messages_${currentUserId}`, JSON.stringify(messages));
    }
  }, [messages, currentUserId]);

  // First, define markMessagesAsRead with proper dependencies
  const markMessagesAsRead = useCallback((conversationId: string) => {
    // Mark messages as read
    setMessages(prevMessages => {
      if (!prevMessages[conversationId]) return prevMessages;
      
      const updatedConversationMessages = prevMessages[conversationId].map(message => 
        message.senderId !== currentUserId && !message.isRead 
          ? { ...message, isRead: true } 
          : message
      );
      
      return {
        ...prevMessages,
        [conversationId]: updatedConversationMessages
      };
    });
    
    // Update unread count in conversation
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
  }, [currentUserId]);

  // Then, define selectConversation with markMessagesAsRead as a dependency
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    markMessagesAsRead(conversationId);
  }, [markMessagesAsRead]);

  const sendMessage = useCallback((conversationId: string, text: string, attachments?: File[]) => {
    const now = new Date();
    
    // Create new message
    const newMessage: Message = {
      id: uuidv4(),
      senderId: currentUserId,
      text,
      timestamp: now,
      isRead: false
    };
    
    // Update messages
    setMessages(prevMessages => {
      const conversationMessages = prevMessages[conversationId] || [];
      return {
        ...prevMessages,
        [conversationId]: [...conversationMessages, newMessage]
      };
    });
    
    // Update conversation's last message
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              lastMessage: {
                text,
                timestamp: now,
                senderId: currentUserId,
                isRead: false
              }
            } 
          : conv
      )
    );
    
    // In a real application, this would make an API call to send the message
    console.log('Message sent:', { conversationId, text, attachments });
  }, [currentUserId]);

  const startNewConversation = useCallback((
    recipientId: string, 
    recipientName: string, 
    recipientAvatar: string, 
    recipientType: 'homeowner' | 'provider',
    initialMessage?: string,
    serviceId?: string,
    serviceName?: string
  ) => {
    // Check if conversation already exists
    let existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.id === recipientId)
    );
    
    if (existingConversation) {
      if (initialMessage) {
        sendMessage(existingConversation.id, initialMessage);
      }
      return existingConversation.id;
    }
    
    // Create new conversation
    const newConversationId = uuidv4();
    const newConversation: Conversation = {
      id: newConversationId,
      participants: [
        {
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          type: currentUserType
        },
        {
          id: recipientId,
          name: recipientName,
          avatar: recipientAvatar,
          type: recipientType
        }
      ],
      unreadCount: 0,
      relatedServiceId: serviceId,
      relatedServiceName: serviceName
    };
    
    // Add new conversation
    setConversations(prev => [newConversation, ...prev]);
    
    // Send initial message if provided
    if (initialMessage) {
      sendMessage(newConversationId, initialMessage);
    }
    
    return newConversationId;
  }, [conversations, currentUserId, currentUserName, currentUserAvatar, currentUserType, sendMessage]);

  // Calculate if there are any unread messages
  const hasUnreadMessages = conversations.some(conv => conv.unreadCount > 0);
  const unreadConversationCount = conversations.reduce((count, conv) => count + (conv.unreadCount > 0 ? 1 : 0), 0);

  // Simulated message receiver for demo purposes
  useEffect(() => {
    // This effect simulates receiving messages in a real application
    // In a production app, this would be replaced with WebSocket or polling logic
    
    const simulateIncomingMessage = () => {
      if (conversations.length === 0) return;
      
      // Choose a random conversation to receive a message on
      const randomIndex = Math.floor(Math.random() * conversations.length);
      const randomConversation = conversations[randomIndex];
      
      // Don't simulate messages if the conversation is currently selected (for demo purposes)
      if (randomConversation.id === selectedConversationId) return;
      
      // Find the other participant
      const otherParticipant = randomConversation.participants.find(p => p.id !== currentUserId);
      if (!otherParticipant) return;
      
      // Generate a random message
      const randomMessages = [
        "Hi there, how are you?",
        "Just checking in on the service request.",
        "When would be a good time to meet?",
        "I've finished the job at your property.",
        "Could you please clarify the details?",
        "I'm available next Tuesday if that works for you.",
        "Thank you for your quick response!"
      ];
      
      const text = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      const now = new Date();
      
      // Create new message
      const newMessage: Message = {
        id: uuidv4(),
        senderId: otherParticipant.id,
        text,
        timestamp: now,
        isRead: false
      };
      
      // Update messages
      setMessages(prevMessages => {
        const conversationMessages = prevMessages[randomConversation.id] || [];
        return {
          ...prevMessages,
          [randomConversation.id]: [...conversationMessages, newMessage]
        };
      });
      
      // Update conversation
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === randomConversation.id 
            ? { 
                ...conv, 
                lastMessage: {
                  text,
                  timestamp: now,
                  senderId: otherParticipant.id,
                  isRead: false
                },
                unreadCount: conv.unreadCount + 1
              } 
            : conv
        )
      );
      
      // Send notification
      addNotification(
        `New message from ${otherParticipant.name}`,
        text,
        'info',
        `/dashboard/messages?conversation=${randomConversation.id}`
      );
    };
    
    // Set up message simulation interval
    // This is just for demo purposes - a real app would use WebSockets
    const interval = setInterval(() => {
      // 10% chance of receiving a message every 30-60 seconds
      if (Math.random() < 0.1) {
        simulateIncomingMessage();
      }
    }, 30000 + Math.random() * 30000);
    
    return () => clearInterval(interval);
  }, [conversations, currentUserId, selectedConversationId, addNotification]);

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        messages,
        selectedConversationId: selectedConversationId,
        selectConversation,
        sendMessage,
        startNewConversation,
        markMessagesAsRead,
        hasUnreadMessages,
        unreadConversationCount
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}; 