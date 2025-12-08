import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useI18n } from '../i18n/i18nContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Observe les changements de classe sur l'élément racine pour savoir si le thème est sombre
    const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('theme-dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // Définir l'état initial
    setIsDark(document.documentElement.classList.contains('theme-dark'));
    
    return () => observer.disconnect();
  }, []);

  // Empêche le rendu côté serveur pour éviter les incohérences d'hydratation
  if (!isMounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9">
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  const menuItems = [
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'system', label: t('theme.auto'), icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('theme.title')} className="w-9 h-9">
          {/* Affiche l'icône correspondant à l'état réel du DOM */}
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="sr-only">{t('theme.title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {menuItems.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
            {theme === value && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}