import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import Dashboard from './pages/Dashboard';
import EIDTest from './pages/EIDTest';
import Facturation from './pages/Facturation';
import FollowUpTasks from './pages/FollowUpTasks';
import Health from './pages/Health';
import Home from './pages/Home';
import Import from './pages/Import';
import Inbox from './pages/Inbox';
import Medications from './pages/Medications';
import Patients from './pages/Patients';
import PrescriptionRenewals from './pages/PrescriptionRenewals';
import ProfilMedecin from './pages/ProfilMedecin';
import ReferentialImport from './pages/ReferentialImport';
import Securite from './pages/Securite';
import Statistics from './pages/Statistics';
import TeleconsultationRoom from './pages/TeleconsultationRoom';
import Telemedicine from './pages/Telemedicine';
import Templates from './pages/Templates';
import Tests from './pages/Tests';
import Utilisateurs from './pages/Utilisateurs';
import AuditSecurity from './pages/AuditSecurity';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Audit": Audit,
    "Dashboard": Dashboard,
    "EIDTest": EIDTest,
    "Facturation": Facturation,
    "FollowUpTasks": FollowUpTasks,
    "Health": Health,
    "Home": Home,
    "Import": Import,
    "Inbox": Inbox,
    "Medications": Medications,
    "Patients": Patients,
    "PrescriptionRenewals": PrescriptionRenewals,
    "ProfilMedecin": ProfilMedecin,
    "ReferentialImport": ReferentialImport,
    "Securite": Securite,
    "Statistics": Statistics,
    "TeleconsultationRoom": TeleconsultationRoom,
    "Telemedicine": Telemedicine,
    "Templates": Templates,
    "Tests": Tests,
    "Utilisateurs": Utilisateurs,
    "AuditSecurity": AuditSecurity,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};