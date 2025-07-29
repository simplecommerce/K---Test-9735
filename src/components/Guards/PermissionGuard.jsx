import React, { useState, useEffect } from 'react';
import { hasPermission, canAccessPage } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiRefreshCw, FiLoader, FiShield } = FiIcons;

/**
 * Component that conditionally renders children based on user permissions
 *
 * @param {Object} props
 * @param {String} props.requires - Permission key required to view content
 * @param {String} props.page - Page name required to access content
 * @param {ReactNode} props.children - Content to show if permission is granted
 * @param {ReactNode} props.fallback - Content to show if permission is denied
 */
const PermissionGuard = ({ requires, page, children, fallback = null }) => {
  const { user, refreshUserProfile, profileLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check permissions whenever user or required permission changes
  useEffect(() => {
    const checkPermission = () => {
      console.log('Checking permissions for user:', user?.id, 'role:', user?.role);
      
      // Check if user has required permission
      let access = false;
      
      if (requires && user) {
        access = hasPermission(user, requires);
        console.log(`Permission check for "${requires}":`, access);
      } else if (page && user) {
        access = canAccessPage(user, page);
        console.log(`Page access check for "${page}":`, access);
      } else if (!requires && !page) {
        // If no specific permission or page is required, grant access
        access = true;
      }
      
      console.log('Final access decision:', access);
      setHasAccess(access);
      setPermissionChecked(true);
    };

    checkPermission();
  }, [user, requires, page]);

  // Function to refresh user profile and check permissions again
  const handleRefreshPermissions = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing user permissions...');
      await refreshUserProfile();
      // Permissions will be rechecked automatically due to the useEffect dependency on user
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state if permissions haven't been checked yet or profile is loading
  if (!permissionChecked || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If access is granted, render children
  if (hasAccess) {
    return children;
  }

  // If custom fallback is provided, render it
  if (fallback) {
    return fallback;
  }

  // Default access denied message with refresh option
  return (
    <div className="flex items-center justify-center h-full py-12">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <SafeIcon icon={FiShield} className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this content.
        </p>
        {user && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              Current role: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{user.role}</span>
            </p>
            {requires && (
              <p className="text-sm text-gray-500">
                Required permission: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{requires}</span>
              </p>
            )}
            {page && (
              <p className="text-sm text-gray-500">
                Required page access: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{page}</span>
              </p>
            )}
          </div>
        )}
        <button
          onClick={handleRefreshPermissions}
          disabled={isRefreshing}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <SafeIcon icon={isRefreshing ? FiLoader : FiRefreshCw} className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Permissions'}</span>
        </button>
      </div>
    </div>
  );
};

export default PermissionGuard;