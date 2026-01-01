import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import AuditSecurity from './pages/AuditSecurity';
import Cabinets from './pages/Cabinets';
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
import ProfilMedecin from './pages/ProfilMedecin';
import RapportsMedicaux from './pages/RapportsMedicaux';
import ReferentialImport from './pages/ReferentialImport';
import SecureMessages from './pages/SecureMessages';
import Securite from './pages/Securite';
import Statistics from './pages/Statistics';
import TeleconsultationRoom from './pages/TeleconsultationRoom';
import Telemedicine from './pages/Telemedicine';
import Templates from './pages/Templates';
import Tests from './pages/Tests';
import Utilisateurs from './pages/Utilisateurs';
import TiersPayant from './pages/TiersPayant';
import Prescriptions from './pages/Prescriptions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Audit": Audit,
    "AuditSecurity": AuditSecurity,
    "Cabinets": Cabinets,
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
    "ProfilMedecin": ProfilMedecin,
    "RapportsMedicaux": RapportsMedicaux,
    "ReferentialImport": ReferentialImport,
    "SecureMessages": SecureMessages,
    "Securite": Securite,
    "Statistics": Statistics,
    "TeleconsultationRoom": TeleconsultationRoom,
    "Telemedicine": Telemedicine,
    "Templates": Templates,
    "Tests": Tests,
    "Utilisateurs": Utilisateurs,
    "TiersPayant": TiersPayant,
    "Prescriptions": Prescriptions,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};