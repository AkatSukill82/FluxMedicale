import React from 'react';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { I18nProvider } from './components/i18n/i18nContext';
import AppShell from './components/AppShell';
import { Toaster } from "@/components/ui/sonner";
import OfflineIndicator from './components/OfflineIndicator';

export default function RootLayout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppShell currentPageName={currentPageName}>
          {children}
        </AppShell>
        <Toaster position="bottom-right" richColors />
        <OfflineIndicator />
      </I18nProvider>
    </ThemeProvider>
  );
}