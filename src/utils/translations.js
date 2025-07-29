export const translations = {
  fr: {
    // Authentication
    login: 'Connexion',
    email: 'Email',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    register: 'S\'inscrire',
    fullName: 'Nom complet',
    confirmPassword: 'Confirmer le mot de passe',
    alreadyHaveAccount: 'Déjà un compte ?',
    dontHaveAccount: 'Pas de compte ?',

    // Navigation
    dashboard: 'Tableau de bord',
    chatAgents: 'Agents IA',
    statistics: 'Statistiques',
    profile: 'Profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    teamManagement: 'Gestion des équipes',

    // Agents
    hrManager: 'Gestionnaire RH',
    hrManagerDesc: 'Répond aux questions RH (congés, politiques, intégration)',
    seoManager: 'Gestionnaire SEO',
    seoManagerDesc: 'Fournit des insights SEO, audits, aide à la stratégie de mots-clés',
    adsManager: 'Gestionnaire Publicités',
    adsManagerDesc: 'Aide avec la stratégie publicitaire et l\'optimisation de campagnes',

    // Chat
    typeMessage: 'Tapez votre message...',
    send: 'Envoyer',
    typing: 'En train d\'écrire...',
    resetConversation: 'Réinitialiser la conversation',
    reset: 'Réinitialiser',
    welcome: 'Bienvenue dans',
    howCanIHelp: 'Comment puis-je vous aider aujourd\'hui?',

    // Statistics
    totalMessages: 'Messages totaux',
    messagesByAgent: 'Messages par agent',
    recentActivity: 'Activité récente',

    // Profile & Settings
    editProfile: 'Modifier le profil',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    language: 'Langue',
    french: 'Français',
    english: 'Anglais',
    profilePicture: 'Photo de profil',
    profileUpdated: 'Profil mis à jour avec succès',

    // Teams
    createTeam: 'Créer une équipe',
    updateTeam: 'Mettre à jour l\'équipe',
    deleteTeam: 'Supprimer l\'équipe',
    teamName: 'Nom de l\'équipe',
    teamDescription: 'Description de l\'équipe',
    allowedAgents: 'Agents autorisés',
    teamMembers: 'Membres de l\'équipe',
    inviteUser: 'Inviter un utilisateur',
    selectTeam: 'Sélectionner une équipe',
    noTeams: 'Aucune équipe',
    noMembers: 'Aucun membre',

    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    accessDenied: 'Accès refusé',
  },
  en: {
    // Authentication
    login: 'Login',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    register: 'Register',
    fullName: 'Full Name',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: 'Don\'t have an account?',

    // Navigation
    dashboard: 'Dashboard',
    chatAgents: 'AI Agents',
    statistics: 'Statistics',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    teamManagement: 'Team Management',

    // Agents
    hrManager: 'HR Manager',
    hrManagerDesc: 'Answers HR-related questions (time-off, policies, onboarding)',
    seoManager: 'SEO Manager',
    seoManagerDesc: 'Provides SEO insights, audits, keyword strategy help',
    adsManager: 'Ads Manager',
    adsManagerDesc: 'Helps with paid ad strategy and campaign optimization',

    // Chat
    typeMessage: 'Type your message...',
    send: 'Send',
    typing: 'Typing...',
    resetConversation: 'Reset conversation',
    reset: 'Reset',
    welcome: 'Welcome to',
    howCanIHelp: 'How can I help you today?',

    // Statistics
    totalMessages: 'Total Messages',
    messagesByAgent: 'Messages by Agent',
    recentActivity: 'Recent Activity',

    // Profile & Settings
    editProfile: 'Edit Profile',
    save: 'Save',
    cancel: 'Cancel',
    language: 'Language',
    french: 'French',
    english: 'English',
    profilePicture: 'Profile Picture',
    profileUpdated: 'Profile updated successfully',

    // Teams
    createTeam: 'Create Team',
    updateTeam: 'Update Team',
    deleteTeam: 'Delete Team',
    teamName: 'Team Name',
    teamDescription: 'Team Description',
    allowedAgents: 'Allowed Agents',
    teamMembers: 'Team Members',
    inviteUser: 'Invite User',
    selectTeam: 'Select Team',
    noTeams: 'No teams',
    noMembers: 'No members',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    accessDenied: 'Access denied',
  }
};

export const useTranslation = (language = 'fr') => {
  return (key) => translations[language][key] || key;
};