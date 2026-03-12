import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, ArrowRight } from 'lucide-react';
import { CARE_PROTOCOLS, PROTOCOL_CATEGORIES } from '../components/protocols/protocolsData';
import ProtocolViewer from '../components/protocols/ProtocolViewer';

export default function Protocoles() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeProtocol, setActiveProtocol] = useState(null);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          Protocoles de soins
        </h1>
        <p className="text-muted-foreground mt-1">
          Guides cliniques structurés par pathologie pour la médecine générale
        </p>
      </div>

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

      {Object.keys(groupedByCategory).length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-muted-foreground text-lg">Aucun protocole trouvé</p>
        </div>
      )}

      {Object.entries(groupedByCategory).map(([category, protocols]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold mb-3 text-slate-700">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {protocols.map(protocol => (
              <Card
                key={protocol.id}
                className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                onClick={() => setActiveProtocol(protocol)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{protocol.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-indigo-700 transition-colors">
                        {protocol.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {protocol.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {protocol.steps.length} étapes
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
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