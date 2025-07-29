import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';

const { FiChevronDown } = FiIcons;

const Topbar = ({ title, subtitle, setActiveTab, activeTab, teams, activeTeam, setActiveTeam }) => {
  const { user } = useAuth();
  const t = useTranslation(user?.language);

  // Handle navigation function
  const handleNavigation = (tab) => {
    if (setActiveTab && typeof setActiveTab === 'function') {
      setActiveTab(tab);
    }
  };

  return (
    <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Page title if available */}
      <div className="flex items-center space-x-2">
        {title && (
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: Navigation Tabs, Team Selector and User Avatar */}
      <div className="flex items-center space-x-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 mr-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNavigation('agents')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'agents' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            AI Agents
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNavigation('statistics')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'statistics' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Analytics
          </motion.button>
        </div>

        {/* Team Selector */}
        {teams && teams.length > 0 && (
          <div className="relative">
            <select
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none min-w-32"
              value={activeTeam?.id || ''}
              onChange={(e) => {
                const selectedTeam = teams.find(team => team.id === e.target.value);
                setActiveTeam && setActiveTeam(selectedTeam || null);
              }}
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <SafeIcon 
              icon={FiChevronDown} 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" 
            />
          </div>
        )}

        {/* User Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNavigation('profile')}
          className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 cursor-pointer"
        >
          <img
            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=007ee5&color=fff`}
            alt={user?.fullName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=007ee5&color=fff`;
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Topbar;