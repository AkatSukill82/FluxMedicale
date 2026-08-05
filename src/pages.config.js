/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import Facturation from './pages/Facturation';
import Garde from './pages/Garde';
import Inbox from './pages/Inbox';
import Patients from './pages/Patients';
import Prescriptions from './pages/Prescriptions';
import ProfilMedecin from './pages/ProfilMedecin';
import Securite from './pages/Securite';
import Statistiques from './pages/Statistiques';
import Stock from './pages/Stock';
import Utilisateurs from './pages/Utilisateurs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Audit": Audit,
    "Dashboard": Dashboard,
    "Documentation": Documentation,
    "Facturation": Facturation,
    "Garde": Garde,
    "Inbox": Inbox,
    "Patients": Patients,
    "Prescriptions": Prescriptions,
    "ProfilMedecin": ProfilMedecin,
    "Securite": Securite,
    "Statistiques": Statistiques,
    "Stock": Stock,
    "Utilisateurs": Utilisateurs,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
