import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Simple localStorage-based database simulation
const DB_KEYS = {
  USERS: 'ai_chat_users',
  INTERACTIONS: 'ai_chat_interactions',
  CURRENT_USER: 'ai_chat_current_user',
  SESSIONS: 'ai_chat_sessions',
  TEAMS: 'ai_chat_teams',
  TEAM_MEMBERS: 'ai_chat_team_members',
};

export const database = {
  // User operations
  async createUser(userData) {
    const users = this.getUsers();
    let hashedPassword = userData.password;
    
    // Hash password if it's a string (not already hashed)
    if (typeof userData.password === 'string' && !userData.password.startsWith('$2')) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }
    
    const newUser = {
      id: userData.id || uuidv4(),
      fullName: userData.fullName,
      email: userData.email,
      password: hashedPassword,
      avatarUrl: userData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=0ea5e9&color=fff`,
      language: userData.language || 'fr',
      role: userData.role || 'Team Member', // Default role is Team Member
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    
    return { ...newUser, password: undefined };
  },
  
  // Login user (store in current user)
  loginUser(user) {
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({
      ...user,
      password: undefined
    }));
    return user;
  },
  
  async authenticateUser(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    const userWithoutPassword = { ...user, password: undefined };
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));
    
    return userWithoutPassword;
  },
  
  async updateUser(userId, updates) {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;
    
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    
    const updatedUser = { ...users[userIndex], password: undefined };
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    
    return updatedUser;
  },
  
  getUsers() {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  },
  
  getCurrentUser() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || 'null');
  },
  
  logout() {
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
  },
  
  // Team operations
  createTeam(teamData) {
    const teams = this.getTeams();
    const newTeam = {
      id: uuidv4(),
      name: teamData.name,
      description: teamData.description || '',
      allowedAgents: teamData.allowedAgents || [],
      createdAt: new Date().toISOString(),
      createdBy: teamData.createdBy,
    };
    
    teams.push(newTeam);
    localStorage.setItem(DB_KEYS.TEAMS, JSON.stringify(teams));
    
    return newTeam;
  },
  
  updateTeam(teamId, updates) {
    const teams = this.getTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) return null;
    
    teams[teamIndex] = {
      ...teams[teamIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(DB_KEYS.TEAMS, JSON.stringify(teams));
    return teams[teamIndex];
  },
  
  getTeams() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TEAMS) || '[]');
  },
  
  getTeam(teamId) {
    const teams = this.getTeams();
    return teams.find(t => t.id === teamId) || null;
  },
  
  deleteTeam(teamId) {
    const teams = this.getTeams();
    const filteredTeams = teams.filter(t => t.id !== teamId);
    localStorage.setItem(DB_KEYS.TEAMS, JSON.stringify(filteredTeams));
    
    // Also remove team memberships
    this.removeTeamMembers(teamId);
    
    return { success: true };
  },
  
  // Team membership operations
  addTeamMember(teamId, userId) {
    const memberships = this.getTeamMemberships();
    
    // Check if membership already exists
    if (memberships.some(m => m.teamId === teamId && m.userId === userId)) {
      return { success: false, message: 'User is already a member of this team' };
    }
    
    const newMembership = {
      id: uuidv4(),
      teamId,
      userId,
      createdAt: new Date().toISOString()
    };
    
    memberships.push(newMembership);
    localStorage.setItem(DB_KEYS.TEAM_MEMBERS, JSON.stringify(memberships));
    
    return { success: true, membership: newMembership };
  },
  
  removeTeamMember(teamId, userId) {
    const memberships = this.getTeamMemberships();
    const filteredMemberships = memberships.filter(
      m => !(m.teamId === teamId && m.userId === userId)
    );
    
    localStorage.setItem(DB_KEYS.TEAM_MEMBERS, JSON.stringify(filteredMemberships));
    
    return { success: true };
  },
  
  removeTeamMembers(teamId) {
    const memberships = this.getTeamMemberships();
    const filteredMemberships = memberships.filter(m => m.teamId !== teamId);
    
    localStorage.setItem(DB_KEYS.TEAM_MEMBERS, JSON.stringify(filteredMemberships));
    
    return { success: true };
  },
  
  getTeamMemberships() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TEAM_MEMBERS) || '[]');
  },
  
  getUserTeams(userId) {
    const memberships = this.getTeamMemberships();
    const teams = this.getTeams();
    
    const userTeamIds = memberships
      .filter(m => m.userId === userId)
      .map(m => m.teamId);
      
    return teams.filter(team => userTeamIds.includes(team.id));
  },
  
  getTeamMembers(teamId) {
    const memberships = this.getTeamMemberships();
    const users = this.getUsers();
    
    const memberUserIds = memberships
      .filter(m => m.teamId === teamId)
      .map(m => m.userId);
      
    return users
      .filter(user => memberUserIds.includes(user.id))
      .map(user => ({ ...user, password: undefined }));
  },
  
  // Session management
  saveSession(userId, agentId, sessionId) {
    const sessions = this.getSessions();
    const sessionKey = `${userId}-${agentId}`;
    
    sessions[sessionKey] = {
      sessionId,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(DB_KEYS.SESSIONS, JSON.stringify(sessions));
    return sessionId;
  },
  
  getSession(userId, agentId) {
    const sessions = this.getSessions();
    const sessionKey = `${userId}-${agentId}`;
    return sessions[sessionKey] || null;
  },
  
  getSessions() {
    return JSON.parse(localStorage.getItem(DB_KEYS.SESSIONS) || '{}');
  },
  
  // Interaction operations
  saveInteraction(interaction) {
    const interactions = this.getInteractions();
    
    const newInteraction = {
      id: uuidv4(),
      ...interaction,
      timestamp: new Date().toISOString()
    };
    
    interactions.push(newInteraction);
    localStorage.setItem(DB_KEYS.INTERACTIONS, JSON.stringify(interactions));
    
    return newInteraction;
  },
  
  getInteractions(userId = null) {
    const interactions = JSON.parse(localStorage.getItem(DB_KEYS.INTERACTIONS) || '[]');
    return userId ? interactions.filter(i => i.userId === userId) : interactions;
  },
  
  getUserStats(userId) {
    const interactions = this.getInteractions(userId);
    
    const stats = {
      totalMessages: interactions.length,
      messagesByAgent: {},
      recentActivity: interactions.slice(-10).reverse()
    };
    
    interactions.forEach(interaction => {
      stats.messagesByAgent[interaction.agentName] = (stats.messagesByAgent[interaction.agentName] || 0) + 1;
    });
    
    return stats;
  }
};