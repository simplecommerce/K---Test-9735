import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import { AI_AGENTS } from '../../utils/agents';
import Topbar from '../Layout/Topbar';
import supabase from '../../lib/supabase';

const { 
  FiGlobe, 
  FiSave, 
  FiUpload, 
  FiImage, 
  FiCheck, 
  FiX, 
  FiLoader, 
  FiSettings, 
  FiServer,
  FiAlertTriangle
} = FiIcons;

// Constants for storage
const STORAGE_BUCKETS = {
  ASSETS: 'assets',
  APP_IMAGES: 'app_images',
  AGENT_IMAGES: 'agent_images'
};

const FILE_PATHS = {
  LOGOS: 'logos',
  AGENTS: 'agents'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SettingsPage = ({ setActiveTab }) => {
  const { user, updateUser } = useAuth();
  const [language, setLanguage] = useState(user?.language || 'fr');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);

  // Platform Management States
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');
  const [agentImages, setAgentImages] = useState({});
  const [agentLoading, setAgentLoading] = useState({});
  const [agentMessage, setAgentMessage] = useState('');
  const [bucketStatus, setBucketStatus] = useState({ checked: false, exists: false });
  
  // File input refs
  const logoFileInputRef = useRef(null);
  const agentFileInputRefs = useRef({});

  const t = useTranslation(language); // Use the current language state instead of user.language

  // Check if user is admin
  useEffect(() => {
    if (user && user.role === 'Administrator') {
      setIsAdmin(true);
    }
  }, [user]);

  // Initialize language from user settings
  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
    }
  }, [user]);

  // Fetch teams
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

  // Check if required buckets exist and create them if needed
  useEffect(() => {
    const checkAndCreateBuckets = async () => {
      if (!isAdmin) return;
      
      try {
        // First, check if buckets exist
        const { data: buckets, error } = await supabase
          .storage
          .listBuckets();
        
        if (error) {
          console.error('Error checking buckets:', error);
          return;
        }
        
        const bucketsToCheck = [
          STORAGE_BUCKETS.ASSETS,
          STORAGE_BUCKETS.APP_IMAGES,
          STORAGE_BUCKETS.AGENT_IMAGES
        ];
        
        const missingBuckets = bucketsToCheck.filter(
          bucketName => !buckets.some(bucket => bucket.name === bucketName)
        );
        
        // Create missing buckets
        for (const bucketName of missingBuckets) {
          try {
            const { error: createError } = await supabase.storage
              .createBucket(bucketName, { public: true });
            
            if (createError) {
              console.error(`Error creating bucket ${bucketName}:`, createError);
            } else {
              console.log(`Created bucket: ${bucketName}`);
            }
          } catch (bucketError) {
            console.error(`Failed to create bucket ${bucketName}:`, bucketError);
          }
        }
        
        setBucketStatus({ checked: true, exists: true });
      } catch (checkError) {
        console.error('Error in bucket check/creation process:', checkError);
        setBucketStatus({ checked: true, exists: false });
      }
    };
    
    if (isAdmin && !bucketStatus.checked) {
      checkAndCreateBuckets();
    }
  }, [isAdmin, bucketStatus.checked]);

  // Fetch app logo and agent images if user is admin
  useEffect(() => {
    if (isAdmin) {
      fetchAppLogo();
      fetchAgentImages();
    }
  }, [isAdmin]);

  const fetchAppLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings_a1b2c3d4e5')
        .select('value')
        .eq('key', 'app_logo')
        .single();
      
      if (error) throw error;
      if (data && data.value) {
        setLogoUrl(data.value);
      }
    } catch (error) {
      console.error('Error fetching app logo:', error);
    }
  };

  const fetchAgentImages = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_images_a1b2c3d4e5')
        .select('agent_id, image_url');
      
      if (error) throw error;
      
      const imagesMap = {};
      if (data) {
        data.forEach(item => {
          imagesMap[item.agent_id] = item.image_url;
        });
      }
      
      setAgentImages(imagesMap);
    } catch (error) {
      console.error('Error fetching agent images:', error);
    }
  };

  const handleSaveLanguage = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await updateUser({ language });
      setMessage(t('success') + ': ' + t('profileUpdated'));
    } catch (error) {
      setMessage(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file, setMessageFn) => {
    // Check file type
    if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/i)) {
      setMessageFn('Please select an image file (PNG, JPG, GIF, or WebP)');
      return false;
    }
    
    // Check file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      setMessageFn('Image must be less than 5MB');
      return false;
    }
    
    return true;
  };

  const uploadToStorage = async (file, bucketName, path) => {
    // Generate a unique filename to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }
    
    return publicUrlData.publicUrl;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!validateFile(file, setLogoMessage)) {
      return;
    }
    
    setLogoLoading(true);
    setLogoMessage('');
    
    try {
      // Upload to the assets bucket under the logos path
      const publicUrl = await uploadToStorage(
        file, 
        STORAGE_BUCKETS.ASSETS, 
        FILE_PATHS.LOGOS
      );
      
      // Update in settings table
      const { error: updateError } = await supabase
        .from('app_settings_a1b2c3d4e5')
        .update({ 
          value: publicUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('key', 'app_logo');
      
      if (updateError) throw updateError;
      
      // Update local state with new URL
      setLogoUrl(publicUrl);
      setLogoMessage('Logo updated successfully!');
      
      // Clear file input
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setLogoMessage(`Error uploading logo: ${error.message || 'Unknown error'}`);
    } finally {
      setLogoLoading(false);
    }
  };

  const handleAgentImageUpload = async (agentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!validateFile(file, setAgentMessage)) {
      return;
    }
    
    setAgentLoading(prev => ({ ...prev, [agentId]: true }));
    setAgentMessage('');
    
    try {
      // Upload to the assets bucket under the agents path
      const publicUrl = await uploadToStorage(
        file,
        STORAGE_BUCKETS.ASSETS,
        `${FILE_PATHS.AGENTS}/${agentId}`
      );
      
      // Update or insert in agent_images table
      const { data: existingImage } = await supabase
        .from('agent_images_a1b2c3d4e5')
        .select('id')
        .eq('agent_id', agentId)
        .maybeSingle();
      
      if (existingImage) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('agent_images_a1b2c3d4e5')
          .update({ 
            image_url: publicUrl, 
            updated_at: new Date().toISOString() 
          })
          .eq('agent_id', agentId);
          
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('agent_images_a1b2c3d4e5')
          .insert([{ agent_id: agentId, image_url: publicUrl }]);
          
        if (insertError) throw insertError;
      }
      
      // Update local state
      setAgentImages(prev => ({ ...prev, [agentId]: publicUrl }));
      setAgentMessage(`Image for ${AI_AGENTS[agentId].name} updated successfully!`);
      
      // Clear file input
      if (agentFileInputRefs.current[agentId]) {
        agentFileInputRefs.current[agentId].value = '';
      }
    } catch (error) {
      console.error('Error uploading agent image:', error);
      setAgentMessage(`Error uploading image: ${error.message || 'Unknown error'}`);
    } finally {
      setAgentLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <Topbar 
        title={t('settings')} 
        subtitle="Personnalisez votre expérience" 
        setActiveTab={setActiveTab}
        activeTab="settings"
        teams={teams}
        activeTeam={activeTeam}
        setActiveTeam={setActiveTeam}
      />
      
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* General Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <SafeIcon icon={FiSettings} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Préférences générales
              </h2>
            </div>
            
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                message.includes('succès') || message.includes('success') || message.includes('updated') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
            
            <div className="space-y-6">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiGlobe} className="w-4 h-4" />
                    <span>{t('language')}</span>
                  </div>
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="language" 
                      value="fr" 
                      checked={language === 'fr'} 
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇫🇷</span>
                      <span className="font-medium text-gray-900">{t('french')}</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="language" 
                      value="en" 
                      checked={language === 'en'} 
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇺🇸</span>
                      <span className="font-medium text-gray-900">{t('english')}</span>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Save Button */}
              {language !== user?.language && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4 border-t border-gray-200"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveLanguage}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <SafeIcon icon={loading ? FiLoader : FiSave} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? t('loading') : t('save')}</span>
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Platform Management - Admin Only */}
          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <SafeIcon icon={FiServer} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Platform Management
                </h2>
              </div>

              {!bucketStatus.exists && bucketStatus.checked && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center space-x-2">
                  <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 flex-shrink-0" />
                  <span>Storage buckets are not configured properly. Some image upload features may not work.</span>
                </div>
              )}
              
              <div className="space-y-8">
                {/* App Logo Management */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Application Logo
                  </h3>
                  
                  {logoMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                      logoMessage.includes('successfully') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {logoMessage}
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-6">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="App Logo" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://ui-avatars.com/api/?name=AI&background=007ee5&color=fff&size=200&bold=true";
                          }}
                        />
                      ) : (
                        <SafeIcon icon={FiImage} className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Update the application logo that appears in the sidebar and throughout the platform. 
                        For best results, use a square image (1:1 ratio) with dimensions of at least 200x200 pixels.
                      </p>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          ref={logoFileInputRef}
                          className="hidden"
                          id="logo-upload"
                        />
                        <motion.label
                          htmlFor="logo-upload"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                        >
                          <SafeIcon 
                            icon={logoLoading ? FiLoader : FiUpload} 
                            className={`w-4 h-4 ${logoLoading ? 'animate-spin' : ''}`} 
                          />
                          <span>{logoLoading ? 'Uploading...' : 'Upload New Logo'}</span>
                        </motion.label>
                        
                        {logoUrl && (
                          <p className="text-xs text-gray-500">
                            Changes will apply immediately after upload
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* AI Agent Images Management */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    AI Agent Images
                  </h3>
                  
                  {agentMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                      agentMessage.includes('successfully') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {agentMessage}
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    {Object.entries(AI_AGENTS).map(([agentId, agent]) => (
                      <div key={agentId} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                          {agentImages[agentId] ? (
                            <img 
                              src={agentImages[agentId]} 
                              alt={agent.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=007ee5&color=fff&size=200&bold=true`;
                              }}
                            />
                          ) : (
                            <div className={`w-full h-full ${agent.color} flex items-center justify-center text-white text-xl`}>
                              {agent.icon}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {agent.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {t(agent.descriptionKey)}
                          </p>
                          
                          <div className="flex items-center space-x-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAgentImageUpload(agentId, e)}
                              ref={(el) => agentFileInputRefs.current[agentId] = el}
                              className="hidden"
                              id={`agent-upload-${agentId}`}
                            />
                            <motion.label
                              htmlFor={`agent-upload-${agentId}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                            >
                              <SafeIcon 
                                icon={agentLoading[agentId] ? FiLoader : FiUpload} 
                                className={`w-4 h-4 ${agentLoading[agentId] ? 'animate-spin' : ''}`} 
                              />
                              <span>{agentLoading[agentId] ? 'Uploading...' : 'Change Image'}</span>
                            </motion.label>
                          </div>
                        </div>
                        
                        {agentImages[agentId] && (
                          <div className="flex items-center">
                            <SafeIcon 
                              icon={FiCheck} 
                              className="w-5 h-5 text-green-500" 
                              title="Custom image set"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* App Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              À propos de l'application
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Version: 1.0.0</p>
              <p>Plateforme IA interne pour employés</p>
              <p>Développé avec React & Vite</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;