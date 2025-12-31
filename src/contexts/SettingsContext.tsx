import { createContext, useContext, useState, ReactNode } from 'react';
import { LyricsSettings, LyricsFormat } from '@/types/spotify';

interface SettingsContextType {
  settings: LyricsSettings;
  updateSettings: (settings: LyricsSettings) => void;
}

const validFormats: LyricsFormat[] = ['lrc', 'srt', 'raw'];

const defaultSettings: LyricsSettings = {
  lyricsType: 'lrc',
  fileNameFormat: ['{track_number}', '.', ' ', '{track_name}'],
  lyricsApiBase: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<LyricsSettings>(() => {
    try {
      const saved = localStorage.getItem('lyrics-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate required fields exist and lyricsType is valid
        if (parsed.lyricsType && Array.isArray(parsed.fileNameFormat)) {
          // Migrate old 'txt' type to 'raw'
          if (parsed.lyricsType === 'txt') {
            parsed.lyricsType = 'raw';
          }
          // Validate lyricsType is one of the valid formats
          if (!validFormats.includes(parsed.lyricsType)) {
            parsed.lyricsType = defaultSettings.lyricsType;
          }
          return { ...defaultSettings, ...parsed };
        }
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: LyricsSettings) => {
    setSettings(newSettings);
    localStorage.setItem('lyrics-settings', JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
