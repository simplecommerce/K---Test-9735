/**
 * Role-based access control system for the AI Chat application
 */

// Define permission levels for different roles
export const ROLES = {
  ADMINISTRATOR: 'Administrator',
  TEAM_MEMBER: 'Team Member',
};

// Define permission matrix - what each role can access
export const PERMISSIONS = {
  [ROLES.ADMINISTRATOR]: {
    // Full access for administrators
    canManageTeams: true,
    canManageUsers: true,
    canInviteUsers: true,
    canAssignAgents: true,
    canRemoveUsers: true,
    canViewAllUsers: true,
    canViewTeamManagement: true,
    canViewSystemSettings: true,
    canViewAnalytics: true,
    canEditUserRoles: true,
    canDeleteTeams: true,
    canModifyUserTeams: true,
    canAccessAllAgents: true, // Administrators can access all agents regardless of team restrictions
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: true,
  },
  [ROLES.TEAM_MEMBER]: {
    // Limited access for team members
    canManageTeams: false,
    canManageUsers: false,
    canInviteUsers: false,
    canAssignAgents: false,
    canRemoveUsers: false,
    canViewAllUsers: false,
    canViewTeamManagement: false,
    canViewSystemSettings: false,
    canViewAnalytics: true,
    canEditUserRoles: false,
    canDeleteTeams: false,
    canModifyUserTeams: false,
    canAccessAllAgents: false, // Team members are restricted by team agent permissions
    canCreateAgents: false,
    canEditAgents: false,
    canDeleteAgents: false,
  },
};

// Default landing page per role - Statistics is now the main dashboard
export const ROLE_LANDING_PAGES = {
  [ROLES.ADMINISTRATOR]: 'statistics', // Dashboard/Statistics as main page
  [ROLES.TEAM_MEMBER]: 'statistics',   // Dashboard/Statistics as main page
};

/**
 * Check if a user has a specific permission
 * @param {Object} user - The user object
 * @param {String} permission - The permission to check
 * @returns {Boolean} - Whether the user has the permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  // Always use the role from user_profiles_a1b2c3d4e5
  const userRole = user.role;
  const rolePermissions = PERMISSIONS[userRole] || {};
  
  return !!rolePermissions[permission];
};

/**
 * Check if user is an administrator
 * @param {Object} user - The user object
 * @returns {Boolean} - Whether the user is an administrator
 */
export const isAdministrator = (user) => {
  return user && user.role === ROLES.ADMINISTRATOR;
};

/**
 * Get all permissions for a user based on their role
 * @param {Object} user - The user object
 * @returns {Object} - Object containing all permissions for the user
 */
export const getUserPermissions = (user) => {
  if (!user || !user.role) return {};
  return PERMISSIONS[user.role] || {};
};

/**
 * Get the landing page for a user based on their role
 * @param {Object} user - The user object
 * @returns {String} - The landing page route
 */
export const getLandingPageForUser = (user) => {
  if (!user || !user.role) return 'statistics';
  return ROLE_LANDING_PAGES[user.role] || 'statistics';
};

/**
 * Verify if a user can access a specific page/route
 * @param {Object} user - The user object
 * @param {String} page - The page/route to check
 * @returns {Boolean} - Whether the user can access the page
 */
export const canAccessPage = (user, page) => {
  if (!user || !user.role) return false;

  // Define page access rules
  const pageAccessRules = {
    'statistics': () => true,                                        // Everyone can access the dashboard
    'agents': () => true,                                            // Everyone can access agents
    'profile': () => true,                                           // Everyone can access their profile
    'settings': () => true,                                          // Everyone can access settings
    'team-management': () => hasPermission(user, 'canViewTeamManagement'), // Only users with specific permission
    'agent-management': () => hasPermission(user, 'canEditAgents'),  // Only users with specific permission
  };

  const accessRule = pageAccessRules[page];
  if (!accessRule) return false;
  return accessRule();
};

/**
 * Check if a user can manage another user (edit roles, teams, etc.)
 * @param {Object} currentUser - The user performing the action
 * @param {Object} targetUser - The user being managed
 * @returns {Boolean} - Whether the current user can manage the target user
 */
export const canManageUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;

  // Only administrators can manage other users
  if (!isAdministrator(currentUser)) return false;

  // Users cannot manage themselves through this interface (use profile page instead)
  if (currentUser.id === targetUser.id) return false;

  return true;
};

/**
 * Check if a user can access all agents (bypass team restrictions)
 * @param {Object} user - The user object
 * @returns {Boolean} - Whether the user can access all agents
 */
export const canAccessAllAgents = (user) => {
  return hasPermission(user, 'canAccessAllAgents');
};

/**
 * Get available roles that a user can assign to others
 * @param {Object} user - The user object
 * @returns {Array} - Array of role objects that can be assigned
 */
export const getAssignableRoles = (user) => {
  if (!isAdministrator(user)) return [];

  // Administrators can assign any role
  return [
    { value: ROLES.ADMINISTRATOR, label: 'Administrator' },
    { value: ROLES.TEAM_MEMBER, label: 'Team Member' }
  ];
};