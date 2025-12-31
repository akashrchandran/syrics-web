/**
 * Runtime Configuration
 * 
 * This module provides runtime configuration for the application.
 * In development, it reads from Vite's import.meta.env.
 * In production (Docker), it reads from window.__RUNTIME_CONFIG__ 
 * which is injected at container startup.
 */

// Type definition for runtime config
interface RuntimeConfig {
  VITE_SPOTIFY_CLIENT_ID: string;
  VITE_LYRICS_API_BASE: string;
}

// Extend Window interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
  }
}

/**
 * Get a configuration value with fallback to Vite env vars
 */
export const getConfig = (key: keyof RuntimeConfig): string => {
  // First check runtime config (for Docker/production)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.[key]) {
    return window.__RUNTIME_CONFIG__[key] || '';
  }
  
  // Fallback to Vite environment variables (for development)
  return import.meta.env[key] || '';
};

/**
 * Get all configuration values
 */
export const getAllConfig = (): RuntimeConfig => ({
  VITE_SPOTIFY_CLIENT_ID: getConfig('VITE_SPOTIFY_CLIENT_ID'),
  VITE_LYRICS_API_BASE: getConfig('VITE_LYRICS_API_BASE'),
});
