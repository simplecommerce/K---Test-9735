import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import { AI_AGENTS } from '../../utils/agents';
import supabase from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const { FiPlus, FiEdit2, FiTrash2, FiUsers, FiUserPlus, FiSave, FiX, FiCheck, FiMail, FiUser, FiLoader, FiShield, FiEdit3, FiRefreshCw } = FiIcons;

const TeamManagementPage = () => {
  const { user, refreshUserProfile, updateUserRole } = useAuth();
  const t = useTranslation(user?.language);
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // All users for administrators
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [userUpdateLoading, setUserUpdateLoading] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    allowedAgents: []
  });
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'Team Member',
    teamIds: []
  });
  const [userEditForm, setUserEditForm] = useState({
    fullName: '',
    email: '',
    role: 'Team Member',
    teamIds: []
  });

  // Check if user is admin - this is the key check that should always use the profile role
  const isAdmin = user?.role === 'Administrator';

  console.log('TeamManagementPage - User role:', user?.role, 'isAdmin:', isAdmin);

  // Function to generate a unique UUID that doesn't exist in the database
  const generateUniqueInvitationId = async () => {
    let isUnique = false;
    let invitationId = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      invitationId = uuidv4();
      attempts++;

      try {
        // Check if this UUID exists in user_profiles table
        const { data: existingProfile, error: profileError } = await supabase
          .from('user_profiles_a1b2c3d4e5')
          .select('id')
          .eq('id', invitationId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking profile uniqueness:', profileError);
          continue;
        }

        // Check if this UUID exists in team_members table
        const { data: existingMember, error: memberError } = await supabase
          .from('team_members_a1b2c3d4e5')
          .select('user_id')
          .eq('user_id', invitationId)
          .maybeSingle();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error('Error checking member uniqueness:', memberError);
          continue;
        }

        // Check if this UUID exists in teams table
        const { data: existingTeam, error: teamError } = await supabase
          .from('teams_a1b2c3d4e5')
          .select('id')
          .eq('id', invitationId)
          .maybeSingle();

        if (teamError && teamError.code !== 'PGRST116') {
          console.error('Error checking team uniqueness:', teamError);
          continue;
        }

        // If none of the queries returned data, the UUID is unique
        if (!existingProfile && !existingMember && !existingTeam) {
          isUnique = true;
        }
      } catch (error) {
        console.error('Error during UUID uniqueness check:', error);
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique invitation ID after multiple attempts');
    }

    return invitationId;
  };

  // Fetch teams and users data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams_a1b2c3d4e5')
          .select('*');

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Fetch all users if admin
        if (isAdmin) {
          console.log('Fetching all users for admin...');
          const { data: allUsersData, error: allUsersError } = await supabase
            .from('user_profiles_a1b2c3d4e5')
            .select('*')
            .order('full_name');

          if (allUsersError) throw allUsersError;
          setAllUsers(allUsersData || []);
          console.log('Fetched', allUsersData?.length || 0, 'users');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Error loading data: ' + (error.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [isAdmin, user]);

  // Refresh all data when needed
  const refreshAllData = async () => {
    setRefreshingData(true);
    try {
      // Refresh user profile first to ensure correct role
      await refreshUserProfile();
      
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams_a1b2c3d4e5')
        .select('*');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch all users if admin
      if (user?.role === 'Administrator') {
        const { data: allUsersData, error: allUsersError } = await supabase
          .from('user_profiles_a1b2c3d4e5')
          .select('*')
          .order('full_name');

        if (allUsersError) throw allUsersError;
        setAllUsers(allUsersData || []);
      }

      setMessage('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setMessage('Error refreshing data: ' + (error.message || 'Unknown error'));
    } finally {
      setRefreshingData(false);
    }
  };

  // Handle team selection
  const handleSelectTeam = async (team) => {
    setSelectedTeam(team);
    try {
      // Fetch allowed agents for this team
      const { data: allowedAgents, error } = await supabase
        .from('team_allowed_agents_a1b2c3d4e5')
        .select('agent_id')
        .eq('team_id', team.id);

      if (error) throw error;

      // Update team form with current data
      setTeamForm({
        name: team.name,
        description: team.description || '',
        allowedAgents: allowedAgents?.map(a => a.agent_id) || []
      });
    } catch (error) {
      console.error('Error fetching team details:', error);
      setMessage('Error loading team details: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle user selection for editing
  const handleSelectUser = async (selectedUser) => {
    setSelectedUser(selectedUser);
    try {
      // Get user's current team memberships
      const { data: userTeams, error: teamsError } = await supabase
        .from('team_members_a1b2c3d4e5')
        .select('team_id')
        .eq('user_id', selectedUser.id);

      if (teamsError) throw teamsError;

      setUserEditForm({
        fullName: selectedUser.full_name || '',
        email: selectedUser.email || '',
        role: selectedUser.role || 'Team Member',
        teamIds: userTeams?.map(t => t.team_id) || []
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      setMessage('Error loading user details: ' + (error.message || 'Unknown error'));
    }
  };

  // Update user details and team memberships
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setUserUpdateLoading(true);
    setMessage('');

    try {
      // Check if role is being changed
      const isRoleChanged = userEditForm.role !== selectedUser.role;
      
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles_a1b2c3d4e5')
        .update({
          full_name: userEditForm.fullName,
          role: userEditForm.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update team memberships
      // First, remove all existing memberships
      const { error: removeError } = await supabase
        .from('team_members_a1b2c3d4e5')
        .delete()
        .eq('user_id', selectedUser.id);

      if (removeError) throw removeError;

      // Then add new memberships
      if (userEditForm.teamIds.length > 0) {
        const memberships = userEditForm.teamIds.map(teamId => ({
          team_id: teamId,
          user_id: selectedUser.id
        }));

        const { error: membershipError } = await supabase
          .from('team_members_a1b2c3d4e5')
          .insert(memberships);

        if (membershipError) throw membershipError;
      }

      // Refresh users list
      const { data: updatedUsers, error: usersError } = await supabase
        .from('user_profiles_a1b2c3d4e5')
        .select('*')
        .order('full_name');

      if (usersError) throw usersError;
      setAllUsers(updatedUsers || []);

      // Update selected user
      const updatedUser = updatedUsers?.find(u => u.id === selectedUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }

      // If the user updated is the current user and role changed, refresh profile
      if (selectedUser.id === user.id && isRoleChanged) {
        console.log('Updated own role, refreshing profile context...');
        await refreshUserProfile();
      }

      setMessage('User updated successfully');
      setIsEditingUser(false);
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage('Error updating user: ' + (error.message || 'Unknown error'));
    } finally {
      setUserUpdateLoading(false);
    }
  };

  // Create new team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Create team record
      const { data: team, error: teamError } = await supabase
        .from('teams_a1b2c3d4e5')
        .insert([
          { name: teamForm.name, description: teamForm.description }
        ])
        .select();

      if (teamError) throw teamError;

      if (team && team.length > 0) {
        // Add allowed agents
        if (teamForm.allowedAgents.length > 0) {
          const agentRecords = teamForm.allowedAgents.map(agentId => ({
            team_id: team[0].id,
            agent_id: agentId
          }));

          const { error: agentsError } = await supabase
            .from('team_allowed_agents_a1b2c3d4e5')
            .insert(agentRecords);

          if (agentsError) throw agentsError;
        }

        // Add current user as team member
        const { error: memberError } = await supabase
          .from('team_members_a1b2c3d4e5')
          .insert([
            { team_id: team[0].id, user_id: user.id }
          ]);

        if (memberError) throw memberError;

        // Refresh teams list
        const { data: teamsData } = await supabase
          .from('teams_a1b2c3d4e5')
          .select('*');

        setTeams(teamsData || []);
        setMessage('Team created successfully');
        setIsCreatingTeam(false);
        setTeamForm({ name: '', description: '', allowedAgents: [] });
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setMessage('Error creating team: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing team
  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setIsLoading(true);
    setMessage('');

    try {
      // Update team record
      const { error: teamError } = await supabase
        .from('teams_a1b2c3d4e5')
        .update({ name: teamForm.name, description: teamForm.description })
        .eq('id', selectedTeam.id);

      if (teamError) throw teamError;

      // Delete existing agent permissions
      const { error: deleteError } = await supabase
        .from('team_allowed_agents_a1b2c3d4e5')
        .delete()
        .eq('team_id', selectedTeam.id);

      if (deleteError) throw deleteError;

      // Add new agent permissions
      if (teamForm.allowedAgents.length > 0) {
        const agentRecords = teamForm.allowedAgents.map(agentId => ({
          team_id: selectedTeam.id,
          agent_id: agentId
        }));

        const { error: agentsError } = await supabase
          .from('team_allowed_agents_a1b2c3d4e5')
          .insert(agentRecords);

        if (agentsError) throw agentsError;
      }

      // Refresh teams list
      const { data: teamsData } = await supabase
        .from('teams_a1b2c3d4e5')
        .select('*');

      setTeams(teamsData || []);

      // Update selected team
      const updatedTeam = teamsData?.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }

      setMessage('Team updated successfully');
    } catch (error) {
      console.error('Error updating team:', error);
      setMessage('Error updating team: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Delete team (cascade will remove members and agent permissions)
      const { error } = await supabase
        .from('teams_a1b2c3d4e5')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      // Refresh teams list
      const { data: teamsData } = await supabase
        .from('teams_a1b2c3d4e5')
        .select('*');

      setTeams(teamsData || []);

      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }

      setMessage('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      setMessage('Error deleting team: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Invite user function using n8n webhook with unique UUID generation
  const handleInviteUser = async (e) => {
    e.preventDefault();

    if (!inviteForm.fullName.trim() || !inviteForm.email || inviteForm.teamIds.length === 0) {
      setMessage('Please fill out all required fields');
      return;
    }

    setInvitationLoading(true);
    setMessage('');

    try {
      console.log('🔄 Starting invitation process for:', inviteForm.email);

      // Generate a unique UUID for this invitation
      const uniqueInvitationId = await generateUniqueInvitationId();
      console.log('✅ Generated unique invitation ID:', uniqueInvitationId);

      // Get team names for the selected team IDs
      const selectedTeamNames = teams
        .filter(team => inviteForm.teamIds.includes(team.id))
        .map(team => team.name);

      // Prepare comprehensive payload for n8n webhook
      const webhookPayload = {
        // User invitation details
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
        invitationId: uniqueInvitationId,

        // Team assignment information
        teamIds: inviteForm.teamIds,
        teamNames: selectedTeamNames,

        // Inviter information
        invitedBy: user.fullName,
        invitedByEmail: user.email,
        invitedById: user.id,

        // Metadata
        timestamp: new Date().toISOString(),
        source: 'team-management-app',

        // Application configuration
        appUrl: window.location.origin,
        supabaseUrl: 'https://yswjmkygdqjrzgwqeuse.supabase.co'
      };

      console.log('📤 Sending invitation payload to webhook:', {
        fullName: webhookPayload.fullName,
        email: webhookPayload.email,
        invitationId: webhookPayload.invitationId,
        teamCount: webhookPayload.teamIds.length,
        teamNames: webhookPayload.teamNames
      });

      // Send request to n8n webhook endpoint
      const response = await fetch('https://prosomoinc.app.n8n.cloud/webhook/b1c39304-4d69-4e5c-8db1-089341eae38e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('📨 Webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Webhook error response:', errorText);
        throw new Error(`Invitation service failed with status ${response.status}: ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ Webhook response data:', result);
      } catch (parseError) {
        console.warn('⚠️ Could not parse webhook response as JSON, treating as success');
        result = { success: true, message: 'Invitation sent successfully' };
      }

      // Handle webhook response
      if (result.success === false) {
        throw new Error(result.message || result.error || 'Invitation service reported failure');
      }

      // Success handling
      const successMessage = `✅ Invitation sent successfully to ${inviteForm.fullName} (${inviteForm.email})! 📧 The user will receive an email with:

• Login instructions for the platform
• Access to ${selectedTeamNames.length} team${selectedTeamNames.length > 1 ? 's' : ''}: ${selectedTeamNames.join(', ')}
• Role assignment: ${inviteForm.role}

The user account will be created automatically when they accept the invitation.`;

      setMessage(successMessage);

      // Reset form and close modal
      setIsInvitingUser(false);
      setInviteForm({
        fullName: '',
        email: '',
        role: 'Team Member',
        teamIds: []
      });

      console.log('✅ Invitation process completed successfully');
    } catch (error) {
      console.error('❌ Error in invitation process:', error);

      let errorMessage = 'Failed to send invitation. ';
      if (error.message.includes('Failed to generate unique invitation ID')) {
        errorMessage += 'Could not generate a unique invitation ID. Please try again.';
      } else if (error.message.includes('fetch')) {
        errorMessage += 'Network error occurred. Please check your connection and try again.';
      } else if (error.message.includes('status')) {
        errorMessage += 'The invitation service is temporarily unavailable. Please try again later.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }

      setMessage(errorMessage);
    } finally {
      setInvitationLoading(false);
    }
  };

  // Remove user from team
  const handleRemoveFromTeam = async (teamId, userId) => {
    if (!confirm('Are you sure you want to remove this user from the team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members_a1b2c3d4e5')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh team view
      if (selectedTeam?.id === teamId) {
        handleSelectTeam(selectedTeam);
      }

      setMessage('User removed from team successfully');
    } catch (error) {
      console.error('Error removing user from team:', error);
      setMessage('Error removing user from team: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle checkbox changes for agent selection
  const handleAgentCheckbox = (agentId) => {
    setTeamForm(prev => {
      const allowedAgents = [...prev.allowedAgents];
      if (allowedAgents.includes(agentId)) {
        return { ...prev, allowedAgents: allowedAgents.filter(id => id !== agentId) };
      } else {
        return { ...prev, allowedAgents: [...allowedAgents, agentId] };
      }
    });
  };

  // Handle checkbox changes for team selection in invitation
  const handleTeamCheckbox = (teamId) => {
    setInviteForm(prev => {
      const teamIds = [...prev.teamIds];
      if (teamIds.includes(teamId)) {
        return { ...prev, teamIds: teamIds.filter(id => id !== teamId) };
      } else {
        return { ...prev, teamIds: [...teamIds, teamId] };
      }
    });
  };

  // Handle checkbox changes for team selection in user edit
  const handleUserTeamCheckbox = (teamId) => {
    setUserEditForm(prev => {
      const teamIds = [...prev.teamIds];
      if (teamIds.includes(teamId)) {
        return { ...prev, teamIds: teamIds.filter(id => id !== teamId) };
      } else {
        return { ...prev, teamIds: [...teamIds, teamId] };
      }
    });
  };

  // If not admin, show access denied with refresh option
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the Team Management page. Only users with the Administrator role can access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Current role: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.role || 'Unknown'}</span>
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshUserProfile}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <SafeIcon icon={FiRefreshCw} className="w-5 h-5" />
            <span>Refresh Permissions</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Team Management
            </h1>
            <p className="text-gray-600">
              Create and manage teams, assign users, and control agent access
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshAllData}
            disabled={refreshingData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SafeIcon 
              icon={refreshingData ? FiLoader : FiRefreshCw} 
              className={`w-4 h-4 ${refreshingData ? 'animate-spin' : ''}`} 
            />
            <span>{refreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
          </motion.button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg whitespace-pre-line ${
            message.includes('successfully') || message.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsCreatingTeam(true);
                  setSelectedTeam(null);
                  setSelectedUser(null);
                  setTeamForm({ name: '', description: '', allowedAgents: [] });
                }}
                className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
              </motion.button>
            </div>

            {isLoading && teams.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">Loading teams...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">No teams created yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {teams.map(team => (
                  <li key={team.id}>
                    <button
                      onClick={() => {
                        handleSelectTeam(team);
                        setSelectedUser(null);
                        setIsEditingUser(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex justify-between items-center ${
                        selectedTeam?.id === team.id 
                          ? 'bg-primary-50 border border-primary-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{team.name}</div>
                        {team.description && (
                          <div className="text-sm text-gray-500">{team.description}</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
            {isCreatingTeam ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Create New Team</h2>
                  <button
                    onClick={() => setIsCreatingTeam(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTeam}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={teamForm.description}
                        onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows="3"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed AI Agents
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                        {Object.values(AI_AGENTS).map(agent => (
                          <label
                            key={agent.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={teamForm.allowedAgents.includes(agent.id)}
                              onChange={() => handleAgentCheckbox(agent.id)}
                              className="text-primary-500 focus:ring-primary-500"
                            />
                            <div className="flex items-center space-x-2">
                              <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-white`}>
                                {agent.icon}
                              </div>
                              <span>{agent.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <SafeIcon icon={FiSave} className="w-5 h-5" />
                      )}
                      <span>Create Team</span>
                    </motion.button>
                  </div>
                </form>
              </div>
            ) : isInvitingUser ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Invite a new user</h2>
                  <button
                    onClick={() => setIsInvitingUser(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleInviteUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={inviteForm.fullName}
                          onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                          required
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="John Doe"
                        />
                        <SafeIcon icon={FiUser} className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          required
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="john.doe@example.com"
                        />
                        <SafeIcon icon={FiMail} className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="Team Member">Team Member</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to Teams * (Select at least one)
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                        {teams.map(team => (
                          <label
                            key={team.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={inviteForm.teamIds.includes(team.id)}
                              onChange={() => handleTeamCheckbox(team.id)}
                              className="text-primary-500 focus:ring-primary-500"
                            />
                            <span className="font-medium">{team.name}</span>
                            {team.description && (
                              <span className="text-sm text-gray-500">- {team.description}</span>
                            )}
                          </label>
                        ))}
                      </div>
                      {teams.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">
                          ⚠️ You need to create at least one team before inviting users
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={invitationLoading || inviteForm.teamIds.length === 0 || !inviteForm.email.trim() || !inviteForm.fullName.trim()}
                      className="flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {invitationLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending invitation...</span>
                        </>
                      ) : (
                        <>
                          <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            ) : isEditingUser && selectedUser ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Edit User: {selectedUser.full_name}</h2>
                  <button
                    onClick={() => {
                      setIsEditingUser(false);
                      setSelectedUser(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={userEditForm.fullName}
                        onChange={(e) => setUserEditForm({ ...userEditForm, fullName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={userEditForm.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={userEditForm.role}
                        onChange={(e) => setUserEditForm({ ...userEditForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="Team Member">Team Member</option>
                      </select>
                      {selectedUser.id === user.id && userEditForm.role !== selectedUser.role && (
                        <p className="text-xs text-yellow-500 mt-1">
                          ⚠️ Changing your own role may affect your access to certain features
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team Memberships
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                        {teams.map(team => (
                          <label
                            key={team.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={userEditForm.teamIds.includes(team.id)}
                              onChange={() => handleUserTeamCheckbox(team.id)}
                              className="text-primary-500 focus:ring-primary-500"
                            />
                            <span className="font-medium">{team.name}</span>
                            {team.description && (
                              <span className="text-sm text-gray-500">- {team.description}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingUser(false);
                        setSelectedUser(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={userUpdateLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {userUpdateLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <SafeIcon icon={FiSave} className="w-5 h-5" />
                      )}
                      <span>Update User</span>
                    </motion.button>
                  </div>
                </form>
              </div>
            ) : selectedTeam ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedTeam.name}</h2>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsInvitingUser(true)}
                      className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600"
                      title="Invite User"
                    >
                      <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <form onSubmit={handleUpdateTeam}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={teamForm.description}
                        onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows="3"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed AI Agents
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                        {Object.values(AI_AGENTS).map(agent => (
                          <label
                            key={agent.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={teamForm.allowedAgents.includes(agent.id)}
                              onChange={() => handleAgentCheckbox(agent.id)}
                              className="text-primary-500 focus:ring-primary-500"
                            />
                            <div className="flex items-center space-x-2">
                              <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-white`}>
                                {agent.icon}
                              </div>
                              <span>{agent.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <SafeIcon icon={FiSave} className="w-5 h-5" />
                        )}
                        <span>Update Team</span>
                      </motion.button>
                    </div>
                  </div>
                </form>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
                  <TeamMembersList teamId={selectedTeam.id} onRemoveMember={handleRemoveFromTeam} />
                </div>
              </div>
            ) : selectedUser ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">User Details: {selectedUser.full_name}</h2>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsEditingUser(true)}
                      className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600"
                      title="Edit User"
                    >
                      <SafeIcon icon={FiEdit3} className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <UserDetailsView user={selectedUser} teams={teams} />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SafeIcon icon={FiUsers} className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Team Management
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Create a new team or select an existing one to manage members and settings.
                  As an administrator, you can also manage all users and their roles.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsCreatingTeam(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    <SafeIcon icon={FiPlus} className="w-5 h-5" />
                    <span>Create New Team</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsInvitingUser(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
                    <span>Invite User</span>
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Users Section - Only for Administrators */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <SafeIcon icon={FiShield} className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
                  <p className="text-sm text-gray-500">Manage all users in the system</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsInvitingUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
                <span>Invite New User</span>
              </motion.button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allUsers.map(userItem => (
                    <UserRow 
                      key={userItem.id} 
                      user={userItem} 
                      teams={teams} 
                      onSelectUser={handleSelectUser}
                      isSelected={selectedUser?.id === userItem.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// User Row component for the users table
const UserRow = ({ user, teams, onSelectUser, isSelected }) => {
  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        const { data: memberships, error } = await supabase
          .from('team_members_a1b2c3d4e5')
          .select('team_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const userTeamIds = memberships?.map(m => m.team_id) || [];
        const userTeamNames = teams.filter(t => userTeamIds.includes(t.id)).map(t => t.name);
        setUserTeams(userTeamNames);
      } catch (error) {
        console.error('Error fetching user teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTeams();
  }, [user.id, teams]);

  return (
    <tr 
      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      onClick={() => onSelectUser(user)}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            <img
              src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0ea5e9&color=fff`}
              alt={user.full_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0ea5e9&color=fff`;
              }}
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          user.role === 'Administrator' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : userTeams.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {userTeams.map((teamName, index) => (
              <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {teamName}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No teams</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectUser(user);
          }}
          className="text-primary-600 hover:text-primary-900"
        >
          View Details
        </button>
      </td>
    </tr>
  );
};

// User Details View component
const UserDetailsView = ({ user, teams }) => {
  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        const { data: memberships, error } = await supabase
          .from('team_members_a1b2c3d4e5')
          .select('team_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const userTeamIds = memberships?.map(m => m.team_id) || [];
        const userTeamObjects = teams.filter(t => userTeamIds.includes(t.id));
        setUserTeams(userTeamObjects);
      } catch (error) {
        console.error('Error fetching user teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTeams();
  }, [user.id, teams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
          <img
            src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0ea5e9&color=fff`}
            alt={user.full_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0ea5e9&color=fff`;
            }}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{user.full_name}</h3>
          <p className="text-gray-600">{user.email}</p>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
            user.role === 'Administrator' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Account Information</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-gray-900">{user.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-gray-900">{user.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Language</label>
              <p className="text-gray-900">{user.language === 'fr' ? 'Français' : 'English'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Team Memberships</h4>
          {loading ? (
            <div className="text-sm text-gray-500">Loading teams...</div>
          ) : userTeams.length > 0 ? (
            <div className="space-y-2">
              {userTeams.map(team => (
                <div key={team.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{team.name}</div>
                  {team.description && (
                    <div className="text-sm text-gray-500">{team.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Not a member of any teams</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Team Members List component (used within the page)
const TeamMembersList = ({ teamId, onRemoveMember }) => {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        // Get team memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('team_members_a1b2c3d4e5')
          .select('user_id')
          .eq('team_id', teamId);

        if (membershipError) throw membershipError;

        if (memberships && memberships.length > 0) {
          const userIds = memberships.map(m => m.user_id);

          // Get user profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles_a1b2c3d4e5')
            .select('*')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          setMembers(profiles || []);
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [teamId]);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-500">Loading team members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No members in this team</p>
        <p className="text-sm text-gray-400 mt-1">Use the invite button above to add users</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto">
      {members.map(member => (
        <li key={member.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
              <img
                src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || 'User')}&background=0ea5e9&color=fff`}
                alt={member.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || 'User')}&background=0ea5e9&color=fff`;
                }}
              />
            </div>
            <div>
              <div className="font-medium text-gray-900">{member.full_name}</div>
              <div className="text-sm text-gray-500">{member.role}</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onRemoveMember(teamId, member.id)}
            className="p-2 text-gray-400 hover:text-red-500"
            title="Remove from team"
          >
            <SafeIcon icon={FiX} className="w-4 h-4" />
          </motion.button>
        </li>
      ))}
    </ul>
  );
};

export default TeamManagementPage;