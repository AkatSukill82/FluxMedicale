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
import AITasks from './pages/AITasks';
import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import AuditSecurity from './pages/AuditSecurity';
import Automatisation from './pages/Automatisation';
import BookingPublic from './pages/BookingPublic';
import Cabinets from './pages/Cabinets';
import ChapitreIV from './pages/ChapitreIV';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import EHealthCertificats from './pages/EHealthCertificats';
import EIDTest from './pages/EIDTest';
import EPrescriptions from './pages/EPrescriptions';
import Facturation from './pages/Facturation';
import FollowUpTasks from './pages/FollowUpTasks';
import GDPRRegistry from './pages/GDPRRegistry';
import Garde from './pages/Garde';
import Health from './pages/Health';
import Home from './pages/Home';
import Import from './pages/Import';
import Inbox from './pages/Inbox';
import Laboratoire from './pages/Laboratoire';
import LiaisonMedecinSecretaire from './pages/LiaisonMedecinSecretaire';
import Medicaments from './pages/Medicaments';
import ModulesEHealth from './pages/ModulesEHealth';
import MyCareNet from './pages/MyCareNet';
import Notifications from './pages/Notifications';
import Patients from './pages/Patients';
import PrescriptionRenewals from './pages/PrescriptionRenewals';
import Prescriptions from './pages/Prescriptions';
import ProfilMedecin from './pages/ProfilMedecin';
import Rappels from './pages/Rappels';
import RapportsAutomatises from './pages/RapportsAutomatises';
import RapportsMedicaux from './pages/RapportsMedicaux';
import ReferentialImport from './pages/ReferentialImport';
import SecureMessages from './pages/SecureMessages';
import Securite from './pages/Securite';
import Statistics from './pages/Statistics';
import Statistiques from './pages/Statistiques';
import Stock from './pages/Stock';
import SuiviPatient from './pages/SuiviPatient';
import TeleconsultationRoom from './pages/TeleconsultationRoom';
import Telemedicine from './pages/Telemedicine';
import Templates from './pages/Templates';
import Tests from './pages/Tests';
import TiersPayant from './pages/TiersPayant';
import Utilisateurs from './pages/Utilisateurs';
import Analyses from './pages/Analyses';
import ParcoursPatient from './pages/ParcoursPatient';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITasks": AITasks,
    "Analyses": Analyses,
    "Agenda": Agenda,
    "Audit": Audit,
    "AuditSecurity": AuditSecurity,
    "Automatisation": Automatisation,
    "BookingPublic": BookingPublic,
    "Cabinets": Cabinets,
    "ChapitreIV": ChapitreIV,
    "Dashboard": Dashboard,
    "Documentation": Documentation,
    "EHealthCertificats": EHealthCertificats,
    "EIDTest": EIDTest,
    "EPrescriptions": EPrescriptions,
    "Facturation": Facturation,
    "FollowUpTasks": FollowUpTasks,
    "GDPRRegistry": GDPRRegistry,
    "Garde": Garde,
    "Health": Health,
    "Home": Home,
    "Import": Import,
    "Inbox": Inbox,
    "Laboratoire": Laboratoire,
    "LiaisonMedecinSecretaire": LiaisonMedecinSecretaire,
    "Medicaments": Medicaments,
    "ModulesEHealth": ModulesEHealth,
    "MyCareNet": MyCareNet,
    "Notifications": Notifications,
    "Patients": Patients,
    "PrescriptionRenewals": PrescriptionRenewals,
    "Prescriptions": Prescriptions,
    "ProfilMedecin": ProfilMedecin,
    "Rappels": Rappels,
    "RapportsAutomatises": RapportsAutomatises,
    "RapportsMedicaux": RapportsMedicaux,
    "ReferentialImport": ReferentialImport,
    "SecureMessages": SecureMessages,
    "Securite": Securite,
    "Statistics": Statistics,
    "Statistiques": Statistiques,
    "Stock": Stock,
    "SuiviPatient": SuiviPatient,
    "TeleconsultationRoom": TeleconsultationRoom,
    "Telemedicine": Telemedicine,
    "Templates": Templates,
    "Tests": Tests,
    "TiersPayant": TiersPayant,
    "Utilisateurs": Utilisateurs,
    "ParcoursPatient": ParcoursPatient,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};