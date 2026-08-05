import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RouteGuard from '@/components/auth/RouteGuard';
import IdleTimeout from '@/components/auth/IdleTimeout';
import MFAGate from '@/components/auth/MFAGate';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

/**
 * Chaque route passe par RouteGuard. Le garde est placé à l'intérieur du Layout
 * pour qu'un utilisateur sans droits voie la navigation et puisse repartir,
 * plutôt qu'un écran vide.
 *
 * Les permissions sont déclarées dans src/lib/routePermissions.js, et une page
 * non déclarée est refusée par défaut.
 */
const LayoutWrapper = ({ children, currentPageName }) => {
  const guarded = (
    <RouteGuard pageName={currentPageName}>{children}</RouteGuard>
  );
  return Layout
    ? <Layout currentPageName={currentPageName}>{guarded}</Layout>
    : guarded;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <IdleTimeout />
          <MFAGate>
            <AuthenticatedApp />
          </MFAGate>
        </Router>
        <Toaster />
        {/* Outil d'édition visuelle de l'éditeur Base44 : réservé au
            développement. Il écoute window.message sans contrôle d'origine et
            renvoie le contenu du DOM au parent via postMessage(…, '*'), ce qui
            exposerait des données patient si l'application était affichée dans
            une iframe tierce. */}
        {import.meta.env.DEV && <VisualEditAgent />}
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App