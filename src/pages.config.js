import AITasks from './pages/AITasks';
import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import AuditSecurity from './pages/AuditSecurity';
import Cabinets from './pages/Cabinets';
import ChapitreIV from './pages/ChapitreIV';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import EIDTest from './pages/EIDTest';
import EPrescriptions from './pages/EPrescriptions';
import Facturation from './pages/Facturation';
import FollowUpTasks from './pages/FollowUpTasks';
import GDPRRegistry from './pages/GDPRRegistry';
import Health from './pages/Health';
import Home from './pages/Home';
import Import from './pages/Import';
import Inbox from './pages/Inbox';
import LiaisonMedecinSecretaire from './pages/LiaisonMedecinSecretaire';
import ModulesEHealth from './pages/ModulesEHealth';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITasks": AITasks,
    "Agenda": Agenda,
    "Audit": Audit,
    "AuditSecurity": AuditSecurity,
    "Cabinets": Cabinets,
    "ChapitreIV": ChapitreIV,
    "Dashboard": Dashboard,
    "Documentation": Documentation,
    "EIDTest": EIDTest,
    "EPrescriptions": EPrescriptions,
    "Facturation": Facturation,
    "FollowUpTasks": FollowUpTasks,
    "GDPRRegistry": GDPRRegistry,
    "Health": Health,
    "Home": Home,
    "Import": Import,
    "Inbox": Inbox,
    "LiaisonMedecinSecretaire": LiaisonMedecinSecretaire,
    "ModulesEHealth": ModulesEHealth,
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
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};