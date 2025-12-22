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
  Upload,
  CreditCard,
  Activity,
  Shield,
  LogOut,
  User as UserIcon,
  Stethoscope,
  FileText,
  Users,
  Inbox,
  ChevronsLeft,
  ChevronsRight,
  Dot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import LanguageSelector from './i18n/LanguageSelector';
import { useI18n } from './i18n/i18nContext';
import MedicalAssistant from './agent/MedicalAssistant';
import CommandPalette from './CommandPalette';

export default function AppShell({ children, currentPageName }) {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

  const navigationItems = [
    { title: t('nav.dashboard'), path: 'Dashboard', icon: LayoutDashboard },
    { title: t('nav.patients'), path: 'Patients', icon: Users },
    { title: t('nav.agenda'), path: 'Agenda', icon: Calendar },
    { title: t('nav.templates'), path: 'Templates', icon: FileText },
    { title: t('nav.inbox'), path: 'Inbox', icon: Inbox },
    { title: t('nav.import'), path: 'Import', icon: Upload },
    { title: t('nav.billing'), path: 'Facturation', icon: CreditCard },
    { title: 'Statistiques', path: 'Statistics', icon: Activity },
  ];
  
  const adminNavItems = [
    { title: t('nav.users'), path: 'Utilisateurs', icon: Users, adminOnly: true },
    { title: t('nav.audit'), path: 'Audit', icon: Activity, adminOnly: true },
    { title: t('nav.health'), path: 'Health', icon: Activity, adminOnly: true },
    { title: t('nav.security'), path: 'Securite', icon: Shield },
  ];

  const profileNavItem = { title: t('nav.profile'), path: 'ProfilMedecin', icon: UserIcon };

  return (
    <SidebarProvider>
      <div className="h-screen w-full bg-background flex">
        <Sidebar
          className={cn(
            "border-r no-print transition-all duration-300 ease-in-out bg-slate-900 text-slate-100",
            isCollapsed ? "w-20" : "w-64"
          )}
        >
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className={cn("text-lg font-bold text-white flex items-center gap-2 px-4 py-6", isCollapsed && "justify-center")}>
                <Stethoscope className="w-7 h-7 flex-shrink-0 text-blue-400" />
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
                            "flex items-center gap-3 justify-start text-slate-300 hover:text-white hover:bg-slate-800",
                            location.pathname.includes(createPageUrl(item.path)) && "bg-slate-800 text-white"
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
                 {isAdmin && (
                  <>
                    <p className={cn("text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mt-6 mb-2", isCollapsed && "text-center")}>{isCollapsed ? "ADM" : "Administration"}</p>
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
                                "flex items-center gap-3 justify-start text-slate-300 hover:text-white hover:bg-slate-800",
                                location.pathname.includes(createPageUrl(item.path)) && "bg-slate-800 text-white"
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
          <SidebarFooter className="border-t border-slate-800 p-4 flex flex-col items-center">
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
                        "flex items-center gap-3 justify-start w-full text-slate-300 hover:text-white hover:bg-slate-800",
                        location.pathname.includes(createPageUrl(profileNavItem.path)) && "bg-slate-800 text-white"
                      )} 
                      title={profileNavItem.title}
                    >
                      <UserIcon className="w-5 h-5 flex-shrink-0" />
                      <motion.span animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }} className="overflow-hidden whitespace-nowrap">{profileNavItem.title}</motion.span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
             <Button variant="ghost" size="icon" className="mt-4 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setIsCollapsed(!isCollapsed)}>
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
              
              {user && (
                <div className="flex items-center gap-3">
                  <CommandPalette />
                  <LanguageSelector />
                  
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-foreground">
                      {user.role === 'admin' ? 'Dr.' : ''} {user.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('common.connected')} • {user.role === 'admin' ? t('users.doctor').toUpperCase() : t('users.secretary').toUpperCase()}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
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
    </SidebarProvider>
  );
}