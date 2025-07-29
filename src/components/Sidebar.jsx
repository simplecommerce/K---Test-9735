import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hasPermission } from '../utils/permissions';
import supabase from '../lib/supabase';

const { 
  FiMessageSquare, FiBarChart2, FiUser, FiSettings, FiUsers, 
  FiHelpCircle, FiMoon, FiSun, FiHeadphones, FiChevronLeft, 
  FiChevronRight, FiLogOut, FiRefreshCw
} = FiIcons;

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout, refreshUserProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const t = useTranslation(user?.language);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appLogo, setAppLogo] = useState('https://ui-avatars.com/api/?name=AI&background=007ee5&color=fff&size=200&bold=true');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Fetch app logo from settings
  useEffect(() => {
    const fetchAppLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings_a1b2c3d4e5')
          .select('value')
          .eq('key', 'app_logo')
          .single();

        if (error) throw error;

        if (data && data.value) {
          setAppLogo(data.value);
        }
      } catch (error) {
        console.error('Error fetching app logo:', error);
      }
    };

    fetchAppLogo();

    // Set up subscription for real-time updates to the app logo
    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_settings_a1b2c3d4e5',
        filter: 'key=eq.app_logo'
      }, (payload) => {
        if (payload.new && payload.new.value) {
          setAppLogo(payload.new.value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch teams that the user belongs to
  useEffect(() => {
    const fetchUserTeams = async () => {
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
          }
        }
      } catch (error) {
        console.error('Error fetching user teams:', error);
      }
    };

    fetchUserTeams();
  }, [user]);

  // Handle refreshing user profile to update permissions
  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserProfile();
      // Success feedback could be added here
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Define menu items with permission checks
  const getMenuItems = () => {
    const items = [
      {
        id: 'agents',
        icon: FiMessageSquare,
        labelKey: 'chatAgents',
        label: 'Agents IA'
      },
      {
        id: 'statistics',
        icon: FiBarChart2,
        labelKey: 'dashboard',
        label: 'Statistiques'
      },
      {
        id: 'profile',
        icon: FiUser,
        labelKey: 'profile',
        label: 'Profil'
      },
      {
        id: 'settings',
        icon: FiSettings,
        labelKey: 'settings',
        label: 'Paramètres'
      }
    ];

    // Add team management for administrators
    if (user && hasPermission(user, 'canViewTeamManagement')) {
      items.push({
        id: 'team-management',
        icon: FiUsers,
        labelKey: 'teamManagement',
        label: 'Gestion des équipes'
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSupportClick = () => {
    window.open('https://prosomo.com', '_blank');
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Toggle Button - Positioned to be always visible */}
      <div className="absolute -right-3 top-6 z-20">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleSidebar}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow"
        >
          <SafeIcon icon={isCollapsed ? FiChevronRight : FiChevronLeft} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </motion.button>
      </div>

      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-center">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={appLogo}
              alt="Prosomo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "https://ui-avatars.com/api/?name=AI&background=007ee5&color=fff&size=200&bold=true";
              }}
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Prosomo
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <SafeIcon
                  icon={item.icon}
                  className={`w-5 h-5 ${
                    activeTab === item.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                {!isCollapsed && (
                  <span className="ml-3 font-medium">
                    {item.label}
                  </span>
                )}
              </motion.button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Help Center Section */}
      <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          {!isCollapsed && (
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Help Center
            </h3>
          )}

          {/* Refresh Profile Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefreshProfile}
            disabled={isRefreshing}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all disabled:opacity-50`}
            title={isCollapsed ? "Refresh Profile" : ''}
          >
            <SafeIcon 
              icon={FiRefreshCw} 
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
            />
            {!isCollapsed && <span className="ml-3 font-medium">Refresh Profile</span>}
          </motion.button>

          {/* Help Center Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all`}
            title={isCollapsed ? "Help Center" : ''}
          >
            <SafeIcon icon={FiHelpCircle} className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {!isCollapsed && <span className="ml-3 font-medium">Help Center</span>}
          </motion.button>

          {/* Dark Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleTheme}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all`}
            title={isCollapsed ? "Dark Mode" : ''}
          >
            <div className="flex items-center">
              <SafeIcon icon={isDark ? FiSun : FiMoon} className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {!isCollapsed && <span className="ml-3 font-medium">Dark Mode</span>}
            </div>
            {!isCollapsed && (
              <div className={`w-11 h-6 rounded-full relative transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            )}
          </motion.button>

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all`}
            title={isCollapsed ? "Logout" : ''}
          >
            <SafeIcon icon={FiLogOut} className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
          </motion.button>

          {/* Support Technique CTA - Only show when not collapsed */}
          {!isCollapsed && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiHeadphones} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Support Technique
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Besoin d'aide?
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSupportClick}
                className="w-full bg-blue-500 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Contacter le support
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;