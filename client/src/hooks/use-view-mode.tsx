import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'list' | 'calendar';

interface ViewModeContextProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextProps | undefined>(undefined);

interface ViewModeProviderProps {
  children: React.ReactNode;
}

export function ViewModeProvider({ children }: ViewModeProviderProps) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Try to get from localStorage first
    const savedMode = localStorage.getItem('plantDaddyViewMode');
    if (savedMode && ['grid', 'list', 'calendar'].includes(savedMode)) {
      return savedMode as ViewMode;
    }
    return 'grid'; // Default to grid view
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('plantDaddyViewMode', viewMode);
  }, [viewMode]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}