import React from 'react';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  Calendar,
  FileText,
  CreditCard,
  Pill,
  Search,
  TrendingUp
} from 'lucide-react';

export default function QuickActions({ onActionClick }) {
  const actions = [
    {
      icon: UserPlus,
      label: 'Créer un patient',
      prompt: 'Crée un nouveau patient',
      color: 'blue'
    },
    {
      icon: Search,
      label: 'Chercher un patient',
      prompt: 'Trouve le patient avec le nom ',
      color: 'purple'
    },
    {
      icon: Calendar,
      label: 'Nouveau RDV',
      prompt: 'Crée un rendez-vous pour ',
      color: 'green'
    },
    {
      icon: FileText,
      label: 'Générer un document',
      prompt: 'Génère un certificat médical pour ',
      color: 'orange'
    },
    {
      icon: Pill,
      label: 'Prescription',
      prompt: 'Crée une prescription pour ',
      color: 'red'
    },
    {
      icon: CreditCard,
      label: 'Facturer',
      prompt: 'Crée une facture pour ',
      color: 'indigo'
    },
    {
      icon: TrendingUp,
      label: 'Statistiques',
      prompt: 'Montre-moi les statistiques du cabinet ce mois-ci',
      color: 'pink'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    red: 'bg-red-50 text-red-600 hover:bg-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100'
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Button
            key={index}
            variant="outline"
            onClick={() => onActionClick(action.prompt)}
            className={`${colorClasses[action.color]} border-0 justify-start h-auto py-3 px-3`}
          >
            <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}