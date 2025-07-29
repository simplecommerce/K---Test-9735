export const AI_AGENTS = {
  'hr-manager': {
    id: 'hr-manager',
    name: 'HR Manager',
    nameKey: 'hrManager',
    descriptionKey: 'hrManagerDesc',
    webhook: 'https://prosomoinc.app.n8n.cloud/webhook/58d9cd50-b83b-49d9-a2ce-1d3f6dd03a0b',
    color: 'bg-blue-500',
    icon: '👥'
  },
  'seo-manager': {
    id: 'seo-manager',
    name: 'SEO Manager',
    nameKey: 'seoManager',
    descriptionKey: 'seoManagerDesc',
    webhook: 'https://prosomoinc.app.n8n.cloud/webhook/5097393d-57b4-4f7c-aa1c-8ae6602293f8',
    color: 'bg-green-500',
    icon: '📈'
  },
  'ads-manager': {
    id: 'ads-manager',
    name: 'Ads Manager',
    nameKey: 'adsManager',
    descriptionKey: 'adsManagerDesc',
    webhook: 'https://prosomoinc.app.n8n.cloud/webhook/7121011b-5b40-4d97-9cc9-727080db3956',
    color: 'bg-purple-500',
    icon: '📱'
  }
};

// Helper to generate session IDs based on user and agent
export const generateSessionId = (userId, agentId) => {
  return `${userId}-${agentId}-${Date.now()}`;
};

// Helper to retrieve the session ID for a specific user and agent
export const getSessionId = (userId, agentId) => {
  const key = `session_${userId}_${agentId}`;
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = generateSessionId(userId, agentId);
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

export const sendMessageToAgent = async (agentId, message, user) => {
  const agent = AI_AGENTS[agentId];
  if (!agent) throw new Error('Agent not found');

  // Get or create session ID for this user-agent pair
  const sessionId = getSessionId(user.id, agentId);

  // Flat payload structure without any nesting - exactly as required by the specifications
  const payload = {
    chatInput: message,
    sessionId: sessionId,
    userId: user.id,
    userName: user.fullName,
    lang: user.language || 'fr'
  };

  try {
    console.log('Sending to webhook:', agent.webhook);
    console.log('Payload:', payload);
    
    const response = await fetch(agent.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Webhook response:', data);
    
    // Extract the output from the response array format
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      return data[0].output;
    } else if (data.output) {
      // Handle case where response might not be in array
      return data.output;
    } else {
      console.warn('Unexpected response format:', data);
      return 'Received a response but could not parse it correctly.';
    }
  } catch (error) {
    console.error('Error sending message to agent:', error);
    throw error;
  }
};