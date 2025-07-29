import React, { createContext, useContext, useState, useEffect } from 'react';
import { database } from '../utils/database';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Function to fetch user profile with role from Supabase
  const fetchUserProfile = async (userId) => {
    try {
      setProfileLoading(true);
      console.log('Fetching user profile for:', userId);
      
      const { data: profile, error } = await supabase
        .from('user_profiles_a1b2c3d4e5')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      console.log('User profile fetched:', profile);
      return profile;
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  // Function to refresh user profile data (can be called externally)
  const refreshUserProfile = async () => {
    if (!user?.id) {
      console.warn('Cannot refresh profile: no user ID available');
      return;
    }
    
    try {
      setProfileLoading(true);
      console.log('Refreshing user profile for:', user.id);
      
      const profile = await fetchUserProfile(user.id);
      
      if (profile) {
        // Update user state with refreshed profile data, preserving auth data
        const updatedUser = {
          ...user,
          fullName: profile.full_name || user.fullName,
          role: profile.role || 'Team Member', // Always ensure role is set
          avatarUrl: profile.avatar_url || user.avatarUrl,
          language: profile.language || user.language,
          // Preserve auth-specific data
          id: user.id,
          email: user.email,
        };
        
        console.log('User profile refreshed:', updatedUser);
        setUser(updatedUser);
        
        // Also update localStorage for backward compatibility
        database.loginUser(updatedUser);
        
        return updatedUser;
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Initialize auth state from Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if there's an active session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Active session found, fetching profile...');
          
          // Get user profile from database
          const profile = await fetchUserProfile(session.user.id);

          if (profile) {
            // Set user with combined auth and profile data
            const authenticatedUser = {
              id: session.user.id,
              email: session.user.email,
              fullName: profile.full_name || '',
              role: profile.role || 'Team Member', // Always ensure role is set from profile
              avatarUrl: profile.avatar_url || '',
              language: profile.language || 'fr',
            };
            
            console.log('User authenticated with profile:', authenticatedUser);
            setUser(authenticatedUser);
            
            // Update localStorage for backward compatibility
            database.loginUser(authenticatedUser);
          } else {
            console.warn('No profile found for authenticated user, using fallback');
            // Fallback to basic user info if profile not found
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              fullName: '',
              role: 'Team Member', // Default role
              avatarUrl: '',
              language: 'fr',
            };
            setUser(fallbackUser);
            database.loginUser(fallbackUser);
          }
        } else {
          console.log('No active session, checking localStorage...');
          // Fallback to local storage method (for backward compatibility)
          const currentUser = database.getCurrentUser();
          if (currentUser) {
            console.log('User found in localStorage:', currentUser);
            // If we have a user in localStorage but no active session,
            // we should still try to refresh their profile from Supabase
            if (currentUser.id) {
              const profile = await fetchUserProfile(currentUser.id);
              if (profile) {
                const updatedUser = {
                  ...currentUser,
                  role: profile.role || currentUser.role || 'Team Member',
                  fullName: profile.full_name || currentUser.fullName,
                  avatarUrl: profile.avatar_url || currentUser.avatarUrl,
                  language: profile.language || currentUser.language,
                };
                setUser(updatedUser);
                database.loginUser(updatedUser);
              } else {
                setUser(currentUser);
              }
            } else {
              setUser(currentUser);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Get user profile when signed in
          const profile = await fetchUserProfile(session.user.id);
          
          const authenticatedUser = {
            id: session.user.id,
            email: session.user.email,
            fullName: profile?.full_name || '',
            role: profile?.role || 'Team Member',
            avatarUrl: profile?.avatar_url || '',
            language: profile?.language || 'fr',
          };
          
          console.log('User signed in with profile:', authenticatedUser);
          setUser(authenticatedUser);
          database.loginUser(authenticatedUser);
          
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          database.logout();
          
        } else if (event === 'USER_UPDATED') {
          // Handle user update events to refresh profile data
          if (session?.user) {
            console.log('User updated, refreshing profile...');
            
            // Get updated user profile
            const profile = await fetchUserProfile(session.user.id);
            
            setUser(prev => {
              const updatedUser = {
                ...prev,
                email: session.user.email, // Get email from auth
                fullName: profile?.full_name || prev?.fullName,
                role: profile?.role || prev?.role || 'Team Member',
                avatarUrl: profile?.avatar_url || prev?.avatarUrl,
                language: profile?.language || prev?.language,
              };
              
              console.log('User profile updated:', updatedUser);
              database.loginUser(updatedUser);
              return updatedUser;
            });
          }
        }
      });

      // Cleanup subscription on unmount
      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        console.log('Authentication successful, fetching profile...');
        
        // Get user profile with role information
        const profile = await fetchUserProfile(data.user.id);

        const authenticatedUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || '',
          role: profile?.role || 'Team Member', // Always get role from profile
          avatarUrl: profile?.avatar_url || '',
          language: profile?.language || 'fr',
        };

        console.log('Login successful with profile:', authenticatedUser);

        // For backward compatibility
        database.loginUser(authenticatedUser);
        setUser(authenticatedUser);
        return authenticatedUser;
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('Attempting registration for:', userData.email);
      
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (error) throw error;

      if (data?.user) {
        console.log('Registration successful, creating profile...');
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles_a1b2c3d4e5')
          .insert([
            {
              id: data.user.id,
              full_name: userData.fullName,
              role: userData.role || 'Team Member', // Default role for new registrations
              language: userData.language || 'fr'
            }
          ]);

        if (profileError) throw profileError;

        const newUser = {
          id: data.user.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role || 'Team Member',
          language: userData.language || 'fr',
        };

        console.log('Registration complete with profile:', newUser);

        // For backward compatibility
        database.createUser(newUser);
        setUser(newUser);
        return newUser;
      }

      throw new Error('Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting logout...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local storage data
      database.logout();
      
      // Clear user state
      setUser(null);
      console.log("Logout successful");
      
      // Force page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateUser = async (updates) => {
    if (!user) return null;

    try {
      console.log('Updating user profile:', updates);
      
      // Update user profile in Supabase
      const { error } = await supabase
        .from('user_profiles_a1b2c3d4e5')
        .update({
          full_name: updates.fullName || user.fullName,
          avatar_url: updates.avatarUrl || user.avatarUrl,
          language: updates.language || user.language,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // For backward compatibility
      const updatedUser = await database.updateUser(user.id, updates);
      
      // Update local state with new data
      const newUserData = {
        ...user,
        fullName: updates.fullName || user.fullName,
        avatarUrl: updates.avatarUrl || user.avatarUrl,
        language: updates.language || user.language,
      };
      
      console.log('User profile updated:', newUserData);
      setUser(newUserData);
      return newUserData;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Function to update a user's role (admin only)
  const updateUserRole = async (userId, newRole) => {
    if (!user || user.role !== 'Administrator') {
      throw new Error('Permission denied: Only administrators can update roles');
    }

    try {
      console.log('Updating user role:', userId, newRole);
      
      const { error } = await supabase
        .from('user_profiles_a1b2c3d4e5')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // If updating own role, refresh user state
      if (userId === user.id) {
        console.log('Updated own role, refreshing profile...');
        await refreshUserProfile();
      }

      console.log('User role updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    profileLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUserProfile,
    updateUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};