import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, ArrowRight, User } from 'lucide-react';
import { CARE_PROTOCOLS, PROTOCOL_CATEGORIES } from '../../protocols/protocolsData';
import ProtocolViewer from '../../protocols/ProtocolViewer';
import { differenceInYears } from 'date-fns';

export default function ProtocolesTab({ patient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeProtocol, setActiveProtocol] = useState(null);

  const patientName = patient?.name?.find(n => n.use === 'official');
  const fullName = `${(patientName?.given || []).join(' ')} ${patientName?.family || ''}`.trim();
  const age = patient?.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;

  const filtered = CARE_PROTOCOLS.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const groupedByCategory = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Contexte patient */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <User className="w-5 h-5 text-indigo-600" />
        <div>
          <span className="font-semibold text-indigo-900">{fullName}</span>
          {age && <span className="text-sm text-indigo-700 ml-2">({age} ans{patient?.gender === 'male' ? ', M' : patient?.gender === 'female' ? ', F' : ''})</span>}
        </div>
        {patient?.allergies && (
          <Badge variant="destructive" className="ml-auto text-xs">⚠️ Allergies : {patient.allergies}</Badge>
        )}
      </div>

      {/* Recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un protocole..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            Tous ({CARE_PROTOCOLS.length})
          </Badge>
          {PROTOCOL_CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Liste des protocoles */}
      {Object.keys(groupedByCategory).length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-muted-foreground">Aucun protocole trouvé</p>
        </div>
      )}

      {Object.entries(groupedByCategory).map(([category, protocols]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {protocols.map(protocol => (
              <Card
                key={protocol.id}
                className="cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group"
                onClick={() => setActiveProtocol(protocol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{protocol.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm group-hover:text-indigo-700 transition-colors">
                        {protocol.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {protocol.description}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-2">
                        {protocol.steps.length} étapes
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {activeProtocol && (
        <ProtocolViewer
          protocol={activeProtocol}
          isOpen={!!activeProtocol}
          onClose={() => setActiveProtocol(null)}
        />
      )}
    </div>
  );
}