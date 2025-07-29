import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import AgentsList from './components/Agents/AgentsList';
import ChatInterface from './components/Chat/ChatInterface';
import StatisticsPage from './components/Statistics/StatisticsPage';
import ProfilePage from './components/Profile/ProfilePage';
import SettingsPage from './components/Settings/SettingsPage';
import TeamManagementPage from './components/TeamManagement/TeamManagementPage';
import PermissionGuard from './components/Guards/PermissionGuard';
import { canAccessPage, getLandingPageForUser } from './utils/permissions';
import './App.css';

const AppContent = () => {
  const { user, loading, profileLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('agents'); // Start with agents as highlighted in sidebar
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isRegister, setIsRegister] = useState(false);

  // Set the active tab to the user's landing page when they log in
  useEffect(() => {
    if (user) {
      const landingPage = getLandingPageForUser(user);
      console.log('User logged in, setting landing page to:', landingPage);
      setActiveTab(landingPage);
    }
  }, [user]);

  // Redirect user if they try to access a page they don't have permission for
  useEffect(() => {
    if (user && !canAccessPage(user, activeTab)) {
      console.log('User does not have access to:', activeTab, 'redirecting...');
      const landingPage = getLandingPageForUser(user);
      setActiveTab(landingPage);
    }
  }, [activeTab, user]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {profileLoading ? 'Loading user profile...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm isRegister={isRegister} setIsRegister={setIsRegister} />;
  }

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
  };

  const handleBackToAgents = () => {
    setSelectedAgent(null);
  };

  const renderContent = () => {
    if (selectedAgent) {
      return <ChatInterface agent={selectedAgent} onBack={handleBackToAgents} />;
    }

    switch (activeTab) {
      case 'agents':
        return <AgentsList onAgentSelect={handleAgentSelect} setActiveTab={setActiveTab} />;
      case 'statistics':
        return <StatisticsPage setActiveTab={setActiveTab} />;
      case 'profile':
        return <ProfilePage setActiveTab={setActiveTab} />;
      case 'settings':
        return <SettingsPage setActiveTab={setActiveTab} />;
      case 'team-management':
        return (
          <PermissionGuard 
            requires="canViewTeamManagement" 
            fallback={<AccessDenied message="You don't have permission to access the Team Management page." />}
          >
            <TeamManagementPage setActiveTab={setActiveTab} />
          </PermissionGuard>
        );
      default:
        return <AgentsList onAgentSelect={handleAgentSelect} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
};

// Access Denied component
const AccessDenied = ({ message }) => (
  <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
    <div className="text-center max-w-md px-4">
      <div className="text-red-500 text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {message || "You don't have permission to access this page. Please contact your administrator if you believe this is an error."}
      </p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="app-container">
            <AppContent />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;