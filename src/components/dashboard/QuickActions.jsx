import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Pill, 
  CreditCard, 
  Calendar,
  Users,
  Stethoscope,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const QUICK_ACTIONS = [
  {
    id: 'new_consult',
    title: 'Nouvelle consultation',
    description: 'Ouvrir un dossier patient',
    icon: Stethoscope,
    color: 'bg-blue-500',
    action: 'Patients'
  },
  {
    id: 'prescription',
    title: 'Prescription rapide',
    description: 'Créer une ordonnance',
    icon: Pill,
    color: 'bg-purple-500',
    action: 'Patients'
  },
  {
    id: 'billing',
    title: 'Facturer',
    description: 'Nouvelle facturation',
    icon: CreditCard,
    color: 'bg-green-500',
    action: 'Facturation'
  },
  {
    id: 'appointment',
    title: 'Rendez-vous',
    description: 'Gérer l\'agenda',
    icon: Calendar,
    color: 'bg-orange-500',
    action: 'Agenda'
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Certificats & attestations',
    icon: FileText,
    color: 'bg-indigo-500',
    action: 'Templates'
  },
  {
    id: 'patients',
    title: 'Patients',
    description: 'Voir tous les patients',
    icon: Users,
    color: 'bg-pink-500',
    action: 'Patients'
  }
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {QUICK_ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <Card
            key={action.id}
            className="cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => navigate(createPageUrl(action.action))}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 rounded-2xl ${action.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.description}</p>
              <ArrowRight className="w-4 h-4 mx-auto mt-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}