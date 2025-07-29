import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../utils/translations';
import { useAuth } from '../../context/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import supabase from '../../lib/supabase';

const { FiArrowRight } = FiIcons;

const AgentCard = ({ agent, onClick }) => {
  const { user } = useAuth();
  const t = useTranslation(user?.language);
  const [agentImage, setAgentImage] = useState(null);

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
          if (error.code !== 'PGRST116') { // PGRST116 is "not found" error, which is expected if no image exists
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_images_a1b2c3d4e5',
        filter: `agent_id=eq.${agent.id}`
      }, (payload) => {
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

  const colorClasses = {
    'bg-blue-500': 'from-blue-500 to-blue-600',
    'bg-green-500': 'from-green-500 to-green-600',
    'bg-purple-500': 'from-purple-500 to-purple-600',
    'bg-orange-500': 'from-orange-500 to-orange-600',
    'bg-red-500': 'from-red-500 to-red-600'
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(agent)}
      className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${
          agentImage ? 'bg-white' : `bg-gradient-to-br ${colorClasses[agent.color] || 'from-blue-500 to-blue-600'}`
        } flex items-center justify-center text-white text-xl shadow-lg overflow-hidden`}>
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
        <motion.div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          whileHover={{ x: 4 }}
        >
          <SafeIcon icon={FiArrowRight} className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </motion.div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {t(agent.nameKey)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {t(agent.descriptionKey)}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            AI Assistant
          </span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Online
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AgentCard;