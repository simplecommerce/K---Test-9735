import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { sendMessageToAgent, getSessionId } from '../../utils/agents';
import { database } from '../../utils/database';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import supabase from '../../lib/supabase';

const { FiSend, FiArrowLeft, FiRefreshCw, FiArrowDown } = FiIcons;

// Function to parse markdown-style bold text
const parseMarkdown = (text) => {
  if (!text) return '';
  // Replace **text** with <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

const ChatInterface = ({ agent, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [agentImage, setAgentImage] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const { user } = useAuth();
  const t = useTranslation(user?.language);

  // Fetch custom agent image if available
  useEffect(() => {
    const fetchAgentImage = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_images_a1b2c3d4e5')
          .select('image_url')
          .eq('agent_id', agent.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error fetching agent image:', error);
          }
          return;
        }

        if (data && data.image_url) {
          setAgentImage(data.image_url);
        }
      } catch (error) {
        console.error('Error in agent image fetch:', error);
      }
    };

    fetchAgentImage();

    // Set up subscription for real-time updates
    const channel = supabase
      .channel(`agent_image_${agent.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agent_images_a1b2c3d4e5', filter: `agent_id=eq.${agent.id}` },
        (payload) => {
          if (payload.new && payload.new.image_url) {
            setAgentImage(payload.new.image_url);
          } else if (payload.eventType === 'DELETE') {
            setAgentImage(null);
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agent.id]);

  // Improved scroll to bottom function with proper behavior
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current && (autoScroll || force)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Enhanced scroll handler with debouncing
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce the scroll handling
    scrollTimeoutRef.current = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 50; // 50px threshold
      
      // Update auto-scroll state
      setAutoScroll(isNearBottom);
      
      // Show/hide scroll button based on distance from bottom
      setShowScrollButton(distanceFromBottom > 100);
      
      // Track if user has manually scrolled
      if (!isNearBottom) {
        setUserHasScrolled(true);
      } else if (isNearBottom) {
        setUserHasScrolled(false);
      }
    }, 100);
  };

  // Clean up scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll when new messages arrive, but respect user scroll position
  useEffect(() => {
    if (!userHasScrolled || (messages.length > 0 && messages[messages.length - 1]?.sender === 'user')) {
      scrollToBottom();
    }
  }, [messages, isTyping, userHasScrolled]);

  useEffect(() => {
    // Initialize or retrieve the session ID
    const currentSessionId = getSessionId(user.id, agent.id);
    setSessionId(currentSessionId);

    // Load previous messages for this agent from session storage
    const sessionKey = `chat_${agent.id}_${user.id}`;
    const savedMessages = sessionStorage.getItem(sessionKey);
    
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      setMessages(parsedMessages);
      
      // Scroll to bottom after loading messages, with a slight delay to ensure rendering
      setTimeout(() => scrollToBottom(true), 100);
    } else {
      // Add a welcome message if this is a new conversation
      const welcomeMessage = {
        id: Date.now(),
        text: `${t('welcome')} ${t(agent.nameKey)}! ${t('howCanIHelp')}`,
        sender: 'agent',
        timestamp: new Date().toISOString()
      };
      
      setMessages([welcomeMessage]);
      sessionStorage.setItem(sessionKey, JSON.stringify([welcomeMessage]));
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [agent.id, user.id, agent.nameKey, t]);

  const saveMessagesToSession = (newMessages) => {
    const sessionKey = `chat_${agent.id}_${user.id}`;
    sessionStorage.setItem(sessionKey, JSON.stringify(newMessages));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessagesToSession(newMessages);
    setInputValue('');
    setLoading(true);
    setIsTyping(true);

    // Enable auto-scroll when user sends a message
    setAutoScroll(true);
    setUserHasScrolled(false);

    // Save interaction to database
    database.saveInteraction({
      userId: user.id,
      agentName: agent.name,
      message: userMessage.text,
      messageLength: userMessage.text.length,
      category: 'user_message'
    });

    try {
      // Prepare the payload according to the strict requirements
      const payload = {
        chatInput: userMessage.text,
        sessionId: sessionId,
        userId: user.id,
        userName: user.fullName,
        lang: user.language || 'fr'
      };

      // Send request to webhook
      const response = await fetch(agent.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Webhook response:', data);

      // Extract the output value from the response
      let responseText;

      // Handle both array format and direct object format
      if (Array.isArray(data)) {
        // If it's an array, try to find the first item with an output property
        const outputItem = data.find(item => item.output !== undefined);
        if (outputItem) {
          responseText = outputItem.output;
        } else {
          // If no item has an output property, check if any item is a string
          const stringItem = data.find(item => typeof item === 'string');
          if (stringItem) {
            responseText = stringItem;
          } else {
            // If all else fails, stringify the first item
            responseText = JSON.stringify(data[0]);
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        // Handle object response
        responseText = data.output || data.response || data.message || JSON.stringify(data);
      } else if (typeof data === 'string') {
        // Handle direct string response
        responseText = data;
      } else {
        // Fallback
        responseText = 'Received a response that could not be processed.';
      }

      // Create agent message with the response
      const agentMessage = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'agent',
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, agentMessage];
      setMessages(updatedMessages);
      saveMessagesToSession(updatedMessages);
      setRetryCount(0); // Reset retry count on successful response

      // Save agent response to database
      database.saveInteraction({
        userId: user.id,
        agentName: agent.name,
        message: agentMessage.text,
        messageLength: agentMessage.text.length,
        category: 'agent_response'
      });
    } catch (error) {
      console.error('Error in chat response:', error);

      // Implement retry logic (max 2 retries)
      if (retryCount < 2) {
        setRetryCount(retryCount + 1);
        const retryMessage = {
          id: Date.now() + 1,
          text: "Tentative de reconnexion...",
          sender: 'system',
          timestamp: new Date().toISOString(),
        };
        setMessages([...newMessages, retryMessage]);

        // Retry after a short delay
        setTimeout(() => {
          handleSendMessage();
        }, 2000);
        return;
      }

      // After max retries, show error message
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.',
        sender: 'agent',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveMessagesToSession(updatedMessages);
      setRetryCount(0); // Reset retry count
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const resetConversation = () => {
    // Generate a new session ID
    const newSessionId = getSessionId(user.id, agent.id);
    setSessionId(newSessionId);
    
    // Clear the messages
    const welcomeMessage = {
      id: Date.now(),
      text: `${t('welcome')} ${t(agent.nameKey)}! ${t('howCanIHelp')}`,
      sender: 'agent',
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
    saveMessagesToSession([welcomeMessage]);
    
    // Store the new session ID
    localStorage.setItem(`session_${user.id}_${agent.id}`, newSessionId);
    
    // Reset scroll states
    setAutoScroll(true);
    setUserHasScrolled(false);
    
    // Scroll to bottom after reset
    setTimeout(() => scrollToBottom(true), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manual scroll to bottom function for the button
  const handleScrollToBottom = () => {
    setAutoScroll(true);
    setUserHasScrolled(false);
    scrollToBottom(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <SafeIcon icon={FiArrowLeft} className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div className={`w-10 h-10 rounded-lg ${agentImage ? 'bg-white' : agent.color} flex items-center justify-center text-white overflow-hidden`}>
              {agentImage ? (
                <img
                  src={agentImage}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    setAgentImage(null);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                agent.icon
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t(agent.nameKey)}
              </h2>
              <p className="text-sm text-gray-500">
                {isTyping ? t('typing') : 'En ligne'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetConversation}
              className="flex items-center space-x-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title={t('resetConversation')}
            >
              <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
              <span className="text-sm">{t('reset')}</span>
            </motion.button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400 px-2">
          Session ID: {sessionId}
        </div>
      </div>

      {/* Messages Container - Fixed scrolling behavior */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-primary-500 text-white'
                    : message.sender === 'system'
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : message.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {message.sender === 'agent' ? (
                  <p
                    className="text-sm whitespace-pre-wrap markdown-message break-words"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-primary-100'
                      : message.sender === 'system'
                      ? 'text-yellow-500'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor point */}
        <div ref={messagesEndRef} style={{ height: '1px', margin: 0, padding: 0 }} />
      </div>

      {/* Scroll to bottom button - Only show when needed */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleScrollToBottom}
          className="absolute bottom-24 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
          title="Scroll to bottom"
        >
          <SafeIcon icon={FiArrowDown} className="w-5 h-5" />
        </motion.button>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('typeMessage')}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SafeIcon icon={FiSend} className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;