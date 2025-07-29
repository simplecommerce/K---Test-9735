import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AgentCard from './AgentCard';
import { AI_AGENTS } from '../../utils/agents';
import { useTranslation } from '../../utils/translations';
import { useAuth } from '../../context/AuthContext';
import Topbar from '../Layout/Topbar';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import supabase from '../../lib/supabase';

const { FiMessageSquare } = FiIcons;

const AgentsList = ({ onAgentSelect, setActiveTab }) => {
  const { user } = useAuth();
  const t = useTranslation(user?.language);
  const [activeTeam, setActiveTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allowedAgents, setAllowedAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch teams and allowed agents
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Get teams the user is a member of
        const { data: teamMemberships, error: membershipError } = await supabase
          .from('team_members_a1b2c3d4e5')
          .select('team_id')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        if (teamMemberships && teamMemberships.length > 0) {
          const teamIds = teamMemberships.map(tm => tm.team_id);

          // Get team details
          const { data: userTeams, error: teamsError } = await supabase
            .from('teams_a1b2c3d4e5')
            .select('*')
            .in('id', teamIds);

          if (teamsError) throw teamsError;

          setTeams(userTeams || []);

          // Set active team to the first one if none is selected
          if (userTeams && userTeams.length > 0 && !activeTeam) {
            setActiveTeam(userTeams[0]);

            // Get allowed agents for this team
            const { data: allowedAgentsData, error: agentsError } = await supabase
              .from('team_allowed_agents_a1b2c3d4e5')
              .select('agent_id')
              .eq('team_id', userTeams[0].id);

            if (agentsError) throw agentsError;

            setAllowedAgents(allowedAgentsData?.map(a => a.agent_id) || []);
          }
        } else {
          // If user is an administrator, they can see all agents
          if (user.role === 'Administrator') {
            setAllowedAgents(Object.keys(AI_AGENTS));
          }
        }
      } catch (error) {
        console.error('Error fetching teams and agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Handle team change
  const handleTeamChange = async (teamId) => {
    const selectedTeam = teams.find(t => t.id === teamId);
    setActiveTeam(selectedTeam);

    if (selectedTeam) {
      try {
        // Get allowed agents for this team
        const { data: allowedAgentsData, error: agentsError } = await supabase
          .from('team_allowed_agents_a1b2c3d4e5')
          .select('agent_id')
          .eq('team_id', selectedTeam.id);

        if (agentsError) throw agentsError;

        setAllowedAgents(allowedAgentsData?.map(a => a.agent_id) || []);
      } catch (error) {
        console.error('Error fetching allowed agents:', error);
      }
    }
  };

  // Filter agents based on team permissions
  const filteredAgents = Object.values(AI_AGENTS).filter(agent => {
    // Administrators can see all agents
    if (user.role === 'Administrator' && allowedAgents.length === 0) {
      return true;
    }
    // Team members can only see allowed agents
    return allowedAgents.includes(agent.id);
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <Topbar 
        title="AI Agents" 
        subtitle="Choose an AI agent to start a conversation" 
        setActiveTab={setActiveTab}
        activeTab="agents"
        teams={teams}
        activeTeam={activeTeam}
        setActiveTeam={handleTeamChange}
      />
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiMessageSquare} className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No AI agents available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No AI agents are available for this team. Contact your administrator to get access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AgentCard agent={agent} onClick={onAgentSelect} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentsList;