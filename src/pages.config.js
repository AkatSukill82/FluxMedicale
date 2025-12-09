import Agenda from './pages/Agenda';
import Audit from './pages/Audit';
import Utilisateurs from './pages/Utilisateurs';
import Import from './pages/Import';
import Inbox from './pages/Inbox';
import Facturation from './pages/Facturation';
import Health from './pages/Health';
import Securite from './pages/Securite';
import EIDTest from './pages/EIDTest';
import ProfilMedecin from './pages/ProfilMedecin';
import Templates from './pages/Templates';
import Patients from './pages/Patients';
import Dashboard from './pages/Dashboard';
import Telemedicine from './pages/Telemedicine';
import TeleconsultationRoom from './pages/TeleconsultationRoom';
import PrescriptionRenewals from './pages/PrescriptionRenewals';
import FollowUpTasks from './pages/FollowUpTasks';
import ReferentialImport from './pages/ReferentialImport';
import Statistics from './pages/Statistics';
import Medications from './pages/Medications';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Audit": Audit,
    "Utilisateurs": Utilisateurs,
    "Import": Import,
    "Inbox": Inbox,
    "Facturation": Facturation,
    "Health": Health,
    "Securite": Securite,
    "EIDTest": EIDTest,
    "ProfilMedecin": ProfilMedecin,
    "Templates": Templates,
    "Patients": Patients,
    "Dashboard": Dashboard,
    "Telemedicine": Telemedicine,
    "TeleconsultationRoom": TeleconsultationRoom,
    "PrescriptionRenewals": PrescriptionRenewals,
    "FollowUpTasks": FollowUpTasks,
    "ReferentialImport": ReferentialImport,
    "Statistics": Statistics,
    "Medications": Medications,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};