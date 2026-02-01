import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'app-theme';
const ACCESSIBILITY_KEY = 'app-accessibility';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [accessibility, setAccessibilityState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ACCESSIBILITY_KEY);
      return stored ? JSON.parse(stored) : {
        fontSize: 'normal', // 'small', 'normal', 'large', 'xlarge'
        reducedMotion: false,
        highContrast: false
      };
    }
    return { fontSize: 'normal', reducedMotion: false, highContrast: false };
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const setAccessibility = (newSettings) => {
    setAccessibilityState(newSettings);
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(newSettings));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Theme
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Accessibility - Font size
    root.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    const fontSizeClass = {
      small: 'text-sm',
      normal: 'text-base',
      large: 'text-lg',
      xlarge: 'text-xl'
    }[accessibility.fontSize] || 'text-base';
    root.style.fontSize = {
      small: '14px',
      normal: '16px',
      large: '18px',
      xlarge: '20px'
    }[accessibility.fontSize] || '16px';

    // Reduced motion
    if (accessibility.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // High contrast
    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Meta theme-color
    const metaColor = theme === 'dark' ? '#1e293b' : '#ffffff';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor);
  }, [theme, accessibility]);

  const value = {
    theme,
    setTheme,
    accessibility,
    setAccessibility,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      <style>{`
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --card: 0 0% 100%;
          --card-foreground: 222.2 84% 4.9%;
          --popover: 0 0% 100%;
          --popover-foreground: 222.2 84% 4.9%;
          --primary: 221.2 83.2% 53.3%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96.1%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96.1%;
          --muted-foreground: 215.4 16.3% 46.9%;
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --destructive: 0 84.2% 60.2%;
          --destructive-foreground: 210 40% 98%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 221.2 83.2% 53.3%;
        }
        
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;
          --primary: 217.2 91.2% 59.8%;
          --primary-foreground: 222.2 47.4% 11.2%;
          --secondary: 217.2 32.6% 17.5%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;
          --accent: 217.2 32.6% 17.5%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
          --ring: 224.3 76.3% 48%;
        }

        .high-contrast {
          --foreground: 0 0% 0%;
          --card-foreground: 0 0% 0%;
          --popover-foreground: 0 0% 0%;
          --border: 0 0% 0%;
        }

        .high-contrast.dark {
          --foreground: 0 0% 100%;
          --card-foreground: 0 0% 100%;
          --popover-foreground: 0 0% 100%;
          --border: 0 0% 100%;
        }

        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* Touch-friendly styles */
        @media (pointer: coarse) {
          button, [role="button"], a {
            min-height: 44px;
            min-width: 44px;
          }
          
          input, select, textarea {
            min-height: 44px;
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};