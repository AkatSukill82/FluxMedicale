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
        <style>{`
          @media print {
            /* Hide Base44 branding */
            [data-base44-branding],
            .base44-branding,
            .base44-badge,
            .base44-watermark,
            #base44-badge,
            a[href*="base44"],
            div[class*="base44"],
            span[class*="base44"],
            img[src*="base44"],
            img[alt*="base44"],
            img[alt*="Base44"],
            [data-testid*="base44"] {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              overflow: hidden !important;
              position: absolute !important;
              clip: rect(0, 0, 0, 0) !important;
            }

            /* Hide navigation, sidebar, header, toasts */
            .no-print,
            [data-sidebar],
            [data-sonner-toaster],
            header,
            nav,
            aside,
            [role="navigation"] {
              display: none !important;
            }

            /* Remove fixed/sticky positioning for print */
            body * {
              position: static !important;
            }

            /* Allow print content to flow */
            body, html {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            main, .print-content {
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              height: auto !important;
              width: 100% !important;
            }

            /* Clean print appearance */
            .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
              box-shadow: none !important;
            }

            /* Hide the bottom-right "Powered by" badge */
            body > div:last-child[style*="position: fixed"],
            body > div[style*="z-index"][style*="bottom"] {
              display: none !important;
            }
          }
        `}</style>
        <AppShell currentPageName={currentPageName}>
          {children}
        </AppShell>
        <Toaster position="bottom-right" richColors />
        <OfflineIndicator />
      </I18nProvider>
    </ThemeProvider>
  );
}