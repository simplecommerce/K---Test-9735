import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import { hasPermission } from '../../utils/permissions';
import supabase from '../../lib/supabase';

const { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUpload, FiLoader, FiSettings, FiImage } = FiIcons;

const AgentManagementPage = () => {
  const { user } = useAuth();
  const t = useTranslation(user?.language);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [agentForm, setAgentForm] = useState({
    id: '',
    name: '',
    description: '',
    webhook: '',
    color: 'bg-blue-500',
    icon: '🤖',
    image_url: ''
  });

  const isAdmin = hasPermission(user, 'canEditAgents');

  // Color options for agents
  const colorOptions = [
    { value: 'bg-blue-500', label: 'Blue', class: 'bg-blue-500' },
    { value: 'bg-green-500', label: 'Green', class: 'bg-green-500' },
    { value: 'bg-purple-500', label: 'Purple', class: 'bg-purple-500' },
    { value: 'bg-orange-500', label: 'Orange', class: 'bg-orange-500' },
    { value: 'bg-red-500', label: 'Red', class: 'bg-red-500' },
    { value: 'bg-indigo-500', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'bg-pink-500', label: 'Pink', class: 'bg-pink-500' },
    { value: 'bg-teal-500', label: 'Teal', class: 'bg-teal-500' }
  ];

  // Fetch agents from custom agents table
  useEffect(() => {
    if (isAdmin) {
      fetchAgents();
    }
  }, [isAdmin]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_agents_a1b2c3d4e5')
        .select('*')
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setMessage('Error loading agents: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/i)) {
      setMessage('Please select a valid image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be less than 5MB');
      return;
    }

    setImageFile(file);

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadAgentImage = async () => {
    if (!imageFile) return null;
    
    setImageUploading(true);
    try {
      // Generate a unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `agents/${agentForm.id || 'new'}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading agent image:', error);
      throw error;
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!agentForm.name || !agentForm.webhook) {
      setMessage('Name and webhook URL are required');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Upload image if selected
      let imageUrl = agentForm.image_url;
      if (imageFile) {
        imageUrl = await uploadAgentImage();
      }

      const agentId = agentForm.id || agentForm.name.toLowerCase().replace(/\s+/g, '-');
      
      // Create agent record
      const newAgent = {
        id: agentId,
        name: agentForm.name,
        description: agentForm.description,
        webhook: agentForm.webhook,
        color: agentForm.color,
        icon: agentForm.icon,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        created_by: user.id
      };

      const { error } = await supabase
        .from('custom_agents_a1b2c3d4e5')
        .insert([newAgent]);

      if (error) throw error;

      setMessage('Agent created successfully');
      setIsCreating(false);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      setMessage('Error creating agent: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setLoading(true);
    setMessage('');

    try {
      // Upload image if selected
      let imageUrl = agentForm.image_url;
      if (imageFile) {
        imageUrl = await uploadAgentImage();
      }

      // Update agent record
      const { error } = await supabase
        .from('custom_agents_a1b2c3d4e5')
        .update({
          name: agentForm.name,
          description: agentForm.description,
          webhook: agentForm.webhook,
          color: agentForm.color,
          icon: agentForm.icon,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAgent.id);

      if (error) throw error;

      // Update agent image association
      if (imageUrl) {
        const { data: existingImage, error: checkError } = await supabase
          .from('agent_images_a1b2c3d4e5')
          .select('id')
          .eq('agent_id', selectedAgent.id)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existingImage) {
          // Update existing image record
          const { error: updateImageError } = await supabase
            .from('agent_images_a1b2c3d4e5')
            .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
            .eq('agent_id', selectedAgent.id);
          
          if (updateImageError) throw updateImageError;
        } else {
          // Create new image record
          const { error: insertImageError } = await supabase
            .from('agent_images_a1b2c3d4e5')
            .insert([{ agent_id: selectedAgent.id, image_url: imageUrl }]);
          
          if (insertImageError) throw insertImageError;
        }
      }

      setMessage('Agent updated successfully');
      setIsEditing(false);
      setSelectedAgent(null);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error('Error updating agent:', error);
      setMessage('Error updating agent: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Delete agent record
      const { error } = await supabase
        .from('custom_agents_a1b2c3d4e5')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      // Delete agent image association
      const { error: imageError } = await supabase
        .from('agent_images_a1b2c3d4e5')
        .delete()
        .eq('agent_id', agentId);
      
      // We don't throw on image deletion error as it's not critical
      if (imageError) console.warn('Error deleting agent image association:', imageError);

      setMessage('Agent deleted successfully');
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      setMessage('Error deleting agent: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setAgentForm({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      webhook: agent.webhook,
      color: agent.color,
      icon: agent.icon,
      image_url: agent.image_url || ''
    });
    setPreviewUrl(agent.image_url || '');
    setIsEditing(true);
    setIsCreating(false);
  };

  const resetForm = () => {
    setAgentForm({
      id: '',
      name: '',
      description: '',
      webhook: '',
      color: 'bg-blue-500',
      icon: '🤖',
      image_url: ''
    });
    setSelectedAgent(null);
    setIsCreating(false);
    setIsEditing(false);
    setImageFile(null);
    setPreviewUrl('');
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage AI agents.</p>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Agent Management
          </h1>
          <p className="text-gray-600">
            Create, edit, and manage custom AI agents for your organization
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Custom Agents</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(false);
                  setSelectedAgent(null);
                  resetForm();
                }}
                className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
              </motion.button>
            </div>

            {loading && agents.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">No custom agents created yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {agents.map(agent => (
                  <li key={agent.id}>
                    <div className={`p-4 rounded-lg border transition-colors ${
                      selectedAgent?.id === agent.id 
                        ? 'bg-primary-50 border-primary-200' 
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center text-white overflow-hidden`}>
                            {agent.image_url ? (
                              <img src={agent.image_url} alt={agent.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <span>{agent.icon}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{agent.name}</div>
                            {agent.description && (
                              <div className="text-sm text-gray-500 truncate max-w-[180px]">{agent.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAgent(agent)}
                            className="p-1 text-gray-400 hover:text-blue-500"
                          >
                            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Agent Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {isCreating || isEditing ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isCreating ? 'Create New Agent' : 'Edit Agent'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={isCreating ? handleCreateAgent : handleUpdateAgent}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agent ID
                      </label>
                      <input
                        type="text"
                        value={agentForm.id}
                        onChange={(e) => setAgentForm({ ...agentForm, id: e.target.value })}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                        placeholder="agent-id (auto-generated from name if empty)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unique identifier for the agent. Cannot be changed after creation.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agent Name *
                      </label>
                      <input
                        type="text"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Marketing Assistant"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={agentForm.description}
                        onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows="3"
                        placeholder="Helps with marketing campaigns and content creation"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL *
                      </label>
                      <input
                        type="url"
                        value={agentForm.webhook}
                        onChange={(e) => setAgentForm({ ...agentForm, webhook: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="https://your-webhook-endpoint.com/agent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color Theme
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setAgentForm({ ...agentForm, color: color.value })}
                            className={`w-8 h-8 rounded-lg ${color.class} border-2 ${
                              agentForm.color === color.value ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon (Emoji)
                      </label>
                      <input
                        type="text"
                        value={agentForm.icon}
                        onChange={(e) => setAgentForm({ ...agentForm, icon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="🤖"
                        maxLength="2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agent Image
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-lg ${agentForm.color} flex items-center justify-center text-white overflow-hidden border border-gray-200`}>
                            {previewUrl ? (
                              <img 
                                src={previewUrl} 
                                alt="Agent preview" 
                                className="w-full h-full object-cover" 
                                onError={() => setPreviewUrl('')}
                              />
                            ) : (
                              <span className="text-2xl">{agentForm.icon}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              id="agent-image"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                            <label
                              htmlFor="agent-image"
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                            >
                              <SafeIcon icon={FiUpload} className="w-4 h-4" />
                              <span>Upload Image</span>
                            </label>
                            {imageFile && (
                              <p className="text-xs text-gray-500 mt-1">
                                {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {!imageFile && agentForm.image_url && (
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={agentForm.image_url}
                              onChange={(e) => setAgentForm({ ...agentForm, image_url: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="https://example.com/agent-image.png"
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload an image or provide a URL. The image will override the emoji icon.
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview
                      </label>
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className={`w-12 h-12 rounded-lg ${agentForm.color} flex items-center justify-center text-white overflow-hidden`}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Agent preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{agentForm.icon}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {agentForm.name || 'Agent Name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agentForm.description || 'Agent description'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || imageUploading}
                      className="flex items-center space-x-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading || imageUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{imageUploading ? 'Uploading Image...' : 'Saving...'}</span>
                        </>
                      ) : (
                        <>
                          <SafeIcon icon={FiSave} className="w-5 h-5" />
                          <span>{isCreating ? 'Create Agent' : 'Update Agent'}</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SafeIcon icon={FiSettings} className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI Agent Management
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Create and manage custom AI agents for your organization. Each agent can have its own webhook endpoint, appearance, and functionality.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  <SafeIcon icon={FiPlus} className="w-5 h-5" />
                  <span>Create New Agent</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentManagementPage;