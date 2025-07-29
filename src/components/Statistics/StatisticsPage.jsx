import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { database } from '../../utils/database';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import Topbar from '../Layout/Topbar';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import supabase from '../../lib/supabase';

const { FiMessageSquare, FiUsers, FiTrendingUp, FiActivity, FiFilter, FiEye, FiMoreHorizontal, FiDollarSign, FiShoppingCart } = FiIcons;

const COLORS = ['#007ee5', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const StatisticsPage = ({ setActiveTab }) => {
  const { user } = useAuth();
  const t = useTranslation(user?.language);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [timeFilter, setTimeFilter] = useState('weekly');

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

  const stats = useMemo(() => {
    return database.getUserStats(user.id);
  }, [user.id]);

  // Mock data for dashboard cards
  const mockStats = {
    totalRevenue: 45231,
    totalOrders: 1423,
    revenueChange: 12.5,
    ordersChange: 8.2
  };

  // Mock data for charts
  const salesData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 2000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
    { name: 'Jul', sales: 3490 }
  ];

  const recentChats = [
    { id: 1, user: 'John Doe', agent: 'HR Manager', time: '2 min ago', status: 'active' },
    { id: 2, user: 'Sarah Smith', agent: 'SEO Manager', time: '5 min ago', status: 'completed' },
    { id: 3, user: 'Mike Johnson', agent: 'Ads Manager', time: '8 min ago', status: 'active' },
    { id: 4, user: 'Emily Brown', agent: 'HR Manager', time: '12 min ago', status: 'completed' },
    { id: 5, user: 'David Wilson', agent: 'SEO Manager', time: '15 min ago', status: 'active' }
  ];

  const topAgents = [
    { name: 'HR Manager', usage: 85, color: 'bg-blue-500' },
    { name: 'SEO Manager', usage: 72, color: 'bg-green-500' },
    { name: 'Ads Manager', usage: 58, color: 'bg-purple-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Topbar
        title="Dashboard"
        subtitle="Analytics overview"
        setActiveTab={setActiveTab}
        activeTab="statistics"
        teams={teams}
        activeTeam={activeTeam}
        setActiveTeam={setActiveTeam}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4 mb-2 sm:mb-0">
              <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                {['weekly', 'monthly', 'yearly'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      timeFilter === filter
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <SafeIcon icon={FiEye} className="w-4 h-4" />
                <span className="text-sm font-medium">View</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <SafeIcon icon={FiFilter} className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </motion.button>
            </div>
          </div>

          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Revenue */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${mockStats.totalRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <SafeIcon icon={FiTrendingUp} className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">+{mockStats.revenueChange}%</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <SafeIcon icon={FiDollarSign} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </motion.div>

            {/* Total Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockStats.totalOrders.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <SafeIcon icon={FiTrendingUp} className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">+{mockStats.ordersChange}%</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <SafeIcon icon={FiShoppingCart} className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Middle Section - Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#007ee5" 
                      strokeWidth={3} 
                      dot={{ fill: '#007ee5', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, stroke: '#007ee5', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Sales Report Gauge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Report</h3>
              </div>
              <div className="flex items-center justify-center h-64">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">72%</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</div>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-8 border-transparent border-t-blue-500 transform -rotate-45"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">$12.5k</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">This Month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">$8.2k</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Last Month</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Section - Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Chat Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Chat</h3>
              </div>
              <div className="overflow-x-auto allow-x-scroll">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentChats.map((chat) => (
                      <tr key={chat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{chat.user}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{chat.agent}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{chat.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              chat.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                          >
                            {chat.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Top AI Agent Used */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top AI Agent Used</h3>
              </div>
              <div className="space-y-4">
                {topAgents.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center text-white font-medium`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{agent.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{agent.usage}% usage</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${agent.color} transition-all duration-300`}
                          style={{ width: `${agent.usage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{agent.usage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;