import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Clock, MessageSquare } from 'lucide-react';

import DocumentGenerator from './DocumentGenerator';
import ConsultationTemplates from './ConsultationTemplates';
import ReminderSystem from './ReminderSystem';

export default function AutomationCenter({ patient, onClose }) {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Centre d'automatisation</h2>
          <p className="text-sm text-slate-500">Gagnez du temps avec les outils automatisés</p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Clock className="w-4 h-4" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Rappels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <DocumentGenerator patient={patient} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <ConsultationTemplates patient={patient} />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <ReminderSystem patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}