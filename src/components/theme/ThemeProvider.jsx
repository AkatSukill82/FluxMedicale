import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const ACCESSIBILITY_KEY = 'app-accessibility';

export function ThemeProvider({ children }) {
  const [accessibility, setAccessibilityState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ACCESSIBILITY_KEY);
      return stored ? JSON.parse(stored) : {
        fontSize: 'normal',
        reducedMotion: false,
        highContrast: false
      };
    }
    return { fontSize: 'normal', reducedMotion: false, highContrast: false };
  });

  const setAccessibility = (newSettings) => {
    setAccessibilityState(newSettings);
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(newSettings));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    
    // Accessibility - Font size
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
    
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
  }, [accessibility]);

  const value = {
    theme: 'light',
    setTheme: () => {},
    accessibility,
    setAccessibility,
    isDark: false
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
          --ring: 222.2 84% 4.9%;
        }

        .high-contrast {
          --foreground: 0 0% 0%;
          --card-foreground: 0 0% 0%;
          --popover-foreground: 0 0% 0%;
          --border: 0 0% 0%;
        }

        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        @media (pointer: coarse) {
          button, [role="button"], a {
            min-height: 44px;
            min-width: 44px;
          }
          
          input, select, textarea {
            min-height: 44px;
            font-size: 16px !important;
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