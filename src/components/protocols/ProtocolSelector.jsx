import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, ArrowRight } from 'lucide-react';
import { CARE_PROTOCOLS, PROTOCOL_CATEGORIES } from './protocolsData';

export default function ProtocolSelector({ isOpen, onClose, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filtered = CARE_PROTOCOLS.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Protocoles de soins guidés
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un protocole (grippe, diabète, lombalgie...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory('all')}
            >
              Tous
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

        <ScrollArea className="flex-1 mt-3">
          <div className="space-y-2 pr-2">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun protocole trouvé</p>
            )}
            {filtered.map(protocol => (
              <Card
                key={protocol.id}
                className="cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                onClick={() => {
                  onSelect(protocol);
                  onClose();
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{protocol.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{protocol.name}</h3>
                        <Badge variant="outline" className="text-xs">{protocol.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{protocol.description}</p>
                      <div className="flex gap-1 mt-2">
                        {protocol.steps.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {s.title.length > 20 ? s.title.substring(0, 20) + '…' : s.title}
                          </Badge>
                        )).slice(0, 4)}
                        {protocol.steps.length > 4 && (
                          <Badge variant="secondary" className="text-xs">+{protocol.steps.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}