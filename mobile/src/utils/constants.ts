/**
 * ServiceFlow Mobile - Configuration Constants
 */

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'https://tech-workflow-app.preview.emergentagent.com/api/v2'
  : 'https://your-production-url.com/api/v2';

// App Theme Colors (matches web app)
export const COLORS = {
  // Primary palette
  primary: '#d4af37',       // Gold
  primaryDark: '#b8962e',   // Darker gold
  secondary: '#1a365d',     // Navy blue
  background: '#0f0f1a',    // Dark background
  surface: '#1a1a2e',       // Card background
  
  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  
  // Border colors
  border: 'rgba(255, 255, 255, 0.1)',
  borderActive: '#d4af37',
};

// Project Status Labels
export const PROJECT_STATUS = {
  pending: { label: 'En attente', color: COLORS.warning },
  in_progress: { label: 'En cours', color: COLORS.info },
  completed: { label: 'Terminé', color: COLORS.success },
  on_hold: { label: 'En pause', color: COLORS.textMuted },
  cancelled: { label: 'Annulé', color: COLORS.error },
};

// Task Status Labels
export const TASK_STATUS = {
  pending: { label: 'À faire', color: COLORS.warning },
  in_progress: { label: 'En cours', color: COLORS.info },
  completed: { label: 'Fait', color: COLORS.success },
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@serviceflow_access_token',
  REFRESH_TOKEN: '@serviceflow_refresh_token',
  USER_DATA: '@serviceflow_user_data',
  OFFLINE_PROJECTS: '@serviceflow_offline_projects',
};

// Animation durations
export const ANIMATION = {
  fast: 150,
  medium: 300,
  slow: 500,
};
