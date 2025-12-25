import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus } from 'lucide-react';

// Templates de prescription pré-définis
const PRESCRIPTION_TEMPLATES = [
  {
    id: 'grippe',
    name: 'Syndrome grippal',
    category: 'INFECTIEUX',
    medications: [
      { name: 'Paracétamol 1g', posology: '1 comprimé 3x/jour', duration: '5 jours' },
      { name: 'Ibuprofène 400mg', posology: '1 comprimé 2x/jour si fièvre', duration: '3 jours' }
    ]
  },
  {
    id: 'angine',
    name: 'Angine bactérienne',
    category: 'INFECTIEUX',
    medications: [
      { name: 'Amoxicilline 1g', posology: '1 comprimé 2x/jour', duration: '6 jours' },
      { name: 'Paracétamol 1g', posology: '1 comprimé 3x/jour si douleur', duration: '5 jours' }
    ]
  },
  {
    id: 'hypertension',
    name: 'Hypertension artérielle',
    category: 'CARDIOVASCULAIRE',
    medications: [
      { name: 'Amlodipine 5mg', posology: '1 comprimé le matin', duration: '30 jours' }
    ]
  },
  {
    id: 'diabete',
    name: 'Diabète type 2',
    category: 'METABOLIQUE',
    medications: [
      { name: 'Metformine 850mg', posology: '1 comprimé 2x/jour pendant repas', duration: '30 jours' }
    ]
  },
  {
    id: 'douleur',
    name: 'Douleur chronique',
    category: 'ANTALGIQUE',
    medications: [
      { name: 'Paracétamol 1g', posology: '1 comprimé 3x/jour', duration: '7 jours' },
      { name: 'Tramadol 50mg', posology: '1 comprimé si douleur intense (max 4/jour)', duration: '7 jours' }
    ]
  }
];

export default function PrescriptionTemplates({ onSelectTemplate }) {
  const groupedTemplates = PRESCRIPTION_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {});

  const getCategoryColor = (category) => {
    const colors = {
      INFECTIEUX: 'bg-red-100 text-red-800',
      CARDIOVASCULAIRE: 'bg-blue-100 text-blue-800',
      METABOLIQUE: 'bg-purple-100 text-purple-800',
      ANTALGIQUE: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Templates de prescription
      </h3>

      {Object.entries(groupedTemplates).map(([category, templates]) => (
        <div key={category}>
          <Badge className={`${getCategoryColor(category)} mb-2`}>{category}</Badge>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {templates.map(template => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => onSelectTemplate?.(template)}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {template.medications.map((med, idx) => (
                      <li key={idx}>• {med.name}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { PRESCRIPTION_TEMPLATES };