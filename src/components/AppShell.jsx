import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Activity,
  Shield,
  LogOut,
  User as UserIcon,
  Stethoscope,
  Users,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Package,
  Upload,
  BarChart3,
  WifiOff,
  Cloud,
  Home,
  Phone,
  BookOpen,
  Pill,
  Bell,
  Route,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import LanguageSelector from './i18n/LanguageSelector';
import { useI18n } from './i18n/i18nContext';
import MedicalAssistant from './agent/MedicalAssistant';
import CommandPalette from './CommandPalette';
import NotificationBell from './notifications/NotificationBell';
import ThinLogoutCollector from './thin/ThinLogoutCollector';
import OfflineModePanel from './offline/OfflineModePanel';
import { useSyncManager } from './offline/useSyncManager';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function AppShell({ children, currentPageName }) {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showThinDialog, setShowThinDialog] = useState(false);
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const location = useLocation();
  const { isOnline, pendingCount, isSyncing } = useSyncManager();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      // Cache user for offline use
      localStorage.setItem('fluxmed_cached_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      // Fallback to cached user when offline
      try {
        const cachedUser = JSON.parse(localStorage.getItem('fluxmed_cached_user') || 'null');
        if (cachedUser) setUser(cachedUser);
      } catch {}
    }
  };

  const handleLogoutClick = () => {
        setShowThinDialog(true);
      };

      const handleLogout = async () => {
        try {
          // Auto-send pending invoices before logout
          try {
            const pendingInvoices = await base44.entities.Invoice.filter({ status: 'PENDING' });
            if (pendingInvoices.length > 0) {
              // Group by mutuelle
              const groups = {};
              for (const inv of pendingInvoices) {
                const key = inv.oa_code || inv.oa_name || 'INCONNU';
                if (!groups[key]) groups[key] = { oa_code: key, oa_name: inv.oa_name || 'Mutuelle inconnue', invoices: [], total: 0, insuranceTotal: 0, patientTotal: 0 };
                groups[key].invoices.push(inv);
                groups[key].total += inv.total_amount || 0;
                groups[key].insuranceTotal += inv.insurance_contribution || 0;
                groups[key].patientTotal += inv.patient_contribution || 0;
              }

              for (const group of Object.values(groups)) {
                const batchNum = `LOT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${group.oa_code.slice(0,6)}-AUTO`;
                const batch = await base44.entities.InvoiceBatch.create({
                  batch_number: batchNum,
                  oa_code: group.oa_code,
                  oa_name: group.oa_name,
                  invoice_count: group.invoices.length,
                  total_amount: group.total,
                  insurance_total: group.insuranceTotal,
                  patient_total: group.patientTotal,
                  status: 'SENT',
                  invoice_ids: group.invoices.map(i => i.id),
                  trigger: 'auto_logout',
                  sent_at: new Date().toISOString()
                });
                for (const inv of group.invoices) {
                  await base44.entities.Invoice.update(inv.id, { status: 'SENT', batch_id: batch.id, sent_at: new Date().toISOString() });
                }
              }
              console.info(`[Auto-send] ${pendingInvoices.length} facture(s) envoyée(s) en ${Object.keys(groups).length} lot(s) avant déconnexion`);
            }
          } catch (autoSendErr) {
            console.warn('Auto-send invoices before logout failed:', autoSendErr);
          }

          await base44.auth.logout();
          window.location.href = '/';
        } catch (error) {
          console.error('Erreur déconnexion:', error);
        }
      };

  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor';
  const canAccessAdmin = isAdmin;

  const navigationItems = [
        { title: t('nav.dashboard'), path: 'Dashboard', icon: LayoutDashboard },
        { title: t('nav.patients'), path: 'Patients', icon: Users },
        { title: t('nav.agenda'), path: 'Agenda', icon: Calendar },
        { title: t('nav.messaging'), path: 'Inbox', icon: MessageSquare },
        { title: t('nav.billing'), path: 'Facturation', icon: CreditCard },
        { title: t('nav.guard'), path: 'Garde', icon: Phone },
        { title: t('nav.stocks'), path: 'Stock', icon: Package },
        { title: t('nav.medications'), path: 'Medicaments', icon: Pill },
        { title: t('nav.chapter4'), path: 'ChapitreIV', icon: Shield },
        { title: t('nav.statistics'), path: 'Statistiques', icon: BarChart3 },
        { title: 'Analyses', path: 'Analyses', icon: Activity },
        { title: 'Parcours', path: 'ParcoursPatient', icon: Route },
        { title: t('nav.documentation'), path: 'Documentation', icon: BookOpen },
        { title: t('nav.notifications'), path: 'Notifications', icon: Bell },
      ];
  
  const adminNavItems = [
    { title: t('nav.users'), path: 'Utilisateurs', icon: Users, adminOnly: true },
    { title: t('nav.audit'), path: 'Audit', icon: Activity, adminOnly: true },
    { title: t('nav.health'), path: 'Health', icon: Activity, adminOnly: true },
    { title: t('nav.security'), path: 'Securite', icon: Shield },
    { title: t('nav.samMedications'), path: 'ReferentialImport', icon: Upload, adminOnly: true },
  ];

  const profileNavItem = { title: t('nav.profile'), path: 'ProfilMedecin', icon: UserIcon };

  return (
    <SidebarProvider>
      <div className="h-screen w-full bg-background flex">
        <Sidebar
        className={cn(
          "border-r no-print transition-all duration-300 ease-in-out bg-white text-slate-900",
          isCollapsed ? "w-20" : "w-64"
        )}
        >
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className={cn("text-lg font-bold text-slate-900 flex items-center gap-2 px-4 py-6", isCollapsed && "justify-center")}>
                <Stethoscope className="w-7 h-7 flex-shrink-0 text-slate-900" />
                <motion.span animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }} className="overflow-hidden">FluxMed</motion.span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.path} className="relative">
                       {location.pathname.includes(createPageUrl(item.path)) && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full"
                        />
                      )}
                      <SidebarMenuButton asChild>
                        <Link 
                          to={createPageUrl(item.path)} 
                          className={cn(
                            "flex items-center gap-3 justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100",
                            location.pathname.includes(createPageUrl(item.path)) && "bg-slate-100 text-slate-900"
                          )} 
                          title={item.title}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                           <motion.span animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }} className="overflow-hidden whitespace-nowrap">{item.title}</motion.span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
                 {canAccessAdmin && (
                  <>
                    <p className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mt-6 mb-2", isCollapsed && "text-center")}>{isCollapsed ? "ADM" : t('nav.administration')}</p>
                    <SidebarMenu>
                      {adminNavItems.map((item) => (
                         <SidebarMenuItem key={item.path} className="relative">
                          {location.pathname.includes(createPageUrl(item.path)) && (
                            <motion.div
                              layoutId="active-nav-indicator"
                              className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full"
                            />
                          )}
                          <SidebarMenuButton asChild>
                            <Link 
                              to={createPageUrl(item.path)} 
                              className={cn(
                                "flex items-center gap-3 justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100",
                                location.pathname.includes(createPageUrl(item.path)) && "bg-slate-100 text-slate-900"
                              )} 
                              title={item.title}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <motion.span animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }} className="overflow-hidden whitespace-nowrap">{item.title}</motion.span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-slate-200 p-4 flex flex-col items-center">
             <SidebarMenu>
                <SidebarMenuItem className="w-full relative">
                  {location.pathname.includes(createPageUrl(profileNavItem.path)) && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full"
                    />
                  )}
                  <SidebarMenuButton asChild>
                    <Link 
                      to={createPageUrl(profileNavItem.path)} 
                      className={cn(
                        "flex items-center gap-3 justify-start w-full text-slate-700 hover:text-slate-900 hover:bg-slate-100",
                        location.pathname.includes(createPageUrl(profileNavItem.path)) && "bg-slate-100 text-slate-900"
                      )} 
                      title={profileNavItem.title}
                    >
                      <UserIcon className="w-5 h-5 flex-shrink-0" />
                      <motion.span animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }} className="overflow-hidden whitespace-nowrap">{profileNavItem.title}</motion.span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
             <Button variant="ghost" size="icon" className="mt-4 text-slate-500 hover:text-slate-900 hover:bg-slate-100" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
             </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="flex-shrink-0 bg-white border-b z-10 no-print">
            <div className="flex items-center justify-between px-6 h-20">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                <h1 className="text-xl font-bold text-foreground">
                  {t(currentPageName.toLowerCase()) || currentPageName}
                </h1>
              </div>
              
              {/* Bouton Mode Hors-ligne */}
              <Button
                variant={isOnline ? "outline" : "destructive"}
                size="sm"
                onClick={() => setShowOfflinePanel(true)}
                className={cn(
                  "gap-2",
                  !isOnline && "animate-pulse",
                  pendingCount > 0 && isOnline && "border-yellow-400 bg-yellow-50"
                )}
              >
                {isOnline ? (
                  isSyncing ? (
                    <Cloud className="w-4 h-4 animate-spin" />
                  ) : (
                    <Home className="w-4 h-4" />
                  )
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isOnline ? t('common.homeVisit') : t('common.offline')}
                </span>
                {pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Button>
              
              {user && (
              <div className="flex items-center gap-3">
                  <CommandPalette />
                  <NotificationBell />
                  <LanguageSelector />

                <Link 
                  to={createPageUrl('ProfilMedecin')}
                  className="text-right hidden md:block hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-foreground">
                    {(user.role === 'admin' || user.role === 'editor') ? 'Dr.' : ''} {user.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('common.connected')} • {user.role === 'admin' ? 'ADMIN' : user.role === 'editor' ? t('common.editor') : t('common.reader')}
                  </p>
                </Link>

                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleLogoutClick}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <LogOut className="w-5 h-5" />
                                      </Button>
              </div>
              )}
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.main
              key={currentPageName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto p-6 bg-slate-50"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>

      <MedicalAssistant />

                {showThinDialog && (
                  <ThinLogoutCollector
                    isOpen={showThinDialog}
                    onClose={() => setShowThinDialog(false)}
                    onLogout={handleLogout}
                  />
                )}

                <OfflineModePanel
                  isOpen={showOfflinePanel}
                  onClose={() => setShowOfflinePanel(false)}
                />
              </SidebarProvider>
  );
}