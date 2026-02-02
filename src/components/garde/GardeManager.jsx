import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  Home,
  Building,
  Ambulance,
  Send,
  History,
  Users
} from 'lucide-react';
import { format, isToday, isFuture, isPast, startOfDay, endOfDay, setMonth, setYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const GARDE_TYPES = {
  semaine_nuit: { label: 'Semaine nuit', color: 'bg-blue-100 text-blue-700', hours: '20h-8h' },
  weekend_jour: { label: 'Weekend jour', color: 'bg-orange-100 text-orange-700', hours: '8h-20h' },
  weekend_nuit: { label: 'Weekend nuit', color: 'bg-purple-100 text-purple-700', hours: '20h-8h' },
  jour_ferie: { label: 'Jour férié', color: 'bg-red-100 text-red-700', hours: '8h-8h' },
  '1733': { label: 'Garde 1733', color: 'bg-green-100 text-green-700', hours: 'Variable' }
};

const URGENCE_LEVELS = {
  faible: { label: 'Faible', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  moyenne: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  haute: { label: 'Haute', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  vitale: { label: 'Vitale', color: 'bg-red-100 text-red-700', icon: Ambulance }
};

export default function GardeManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('planning');
  const [showNewGarde, setShowNewGarde] = useState(false);
  const [showNewAppel, setShowNewAppel] = useState(false);
  const [selectedGarde, setSelectedGarde] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const [newGarde, setNewGarde] = useState({
    type_garde: 'semaine_nuit',
    date_debut: '',
    date_fin: '',
    zone_garde: '',
    cercle_nom: ''
  });

  const [newAppel, setNewAppel] = useState({
    patient_nom: '',
    motif: '',
    urgence_level: 'moyenne',
    action: 'conseil_tel',
    notes: ''
  });

  // Charger l'utilisateur courant
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Charger les gardes
  const { data: gardes = [], isLoading } = useQuery({
    queryKey: ['gardes'],
    queryFn: () => base44.entities.GardeService.list('-date_debut', 100)
  });

  // Créer une garde
  const createGardeMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.GardeService.create({
        ...data,
        medecin_email: currentUser.email,
        medecin_nom: currentUser.full_name,
        medecin_nihii: currentUser.numero_inami,
        medecin_telephone: currentUser.telephone_cabinet,
        status: 'planifiee'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardes'] });
      toast.success('Garde planifiée');
      setShowNewGarde(false);
      setNewGarde({ type_garde: 'semaine_nuit', date_debut: '', date_fin: '', zone_garde: '', cercle_nom: '' });
    }
  });

  // Ajouter un appel
  const addAppelMutation = useMutation({
    mutationFn: async ({ gardeId, appel }) => {
      const garde = gardes.find(g => g.id === gardeId);
      const newAppels = [...(garde.appels || []), {
        ...appel,
        heure: new Date().toISOString()
      }];
      
      const updates = {
        appels: newAppels,
        nb_appels: newAppels.length
      };
      
      if (appel.action === 'visite') updates.nb_visites = (garde.nb_visites || 0) + 1;
      if (appel.action === 'consultation') updates.nb_consultations = (garde.nb_consultations || 0) + 1;
      
      return base44.entities.GardeService.update(gardeId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardes'] });
      toast.success('Appel enregistré');
      setShowNewAppel(false);
      setNewAppel({ patient_nom: '', motif: '', urgence_level: 'moyenne', action: 'conseil_tel', notes: '' });
    }
  });

  // Garde en cours
  const gardeEnCours = gardes.find(g => {
    const now = new Date();
    return new Date(g.date_debut) <= now && new Date(g.date_fin) >= now && g.status !== 'annulee';
  });

  // Prochaines gardes
  const prochainesGardes = gardes
    .filter(g => new Date(g.date_debut) > new Date() && g.status === 'planifiee')
    .slice(0, 5);

  // Gardes passées
  const gardesPassees = gardes
    .filter(g => new Date(g.date_fin) < new Date())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service de Garde</h1>
          <p className="text-muted-foreground">Gérez vos gardes et appels</p>
        </div>
        <Button onClick={() => setShowNewGarde(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Planifier une garde
        </Button>
      </div>

      {/* Garde en cours */}
      {gardeEnCours && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Phone className="w-5 h-5 animate-pulse" />
                Garde en cours
              </CardTitle>
              <Badge className={GARDE_TYPES[gardeEnCours.type_garde]?.color}>
                {GARDE_TYPES[gardeEnCours.type_garde]?.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-green-700">Période</p>
                <p className="font-medium">
                  {format(new Date(gardeEnCours.date_debut), 'dd/MM HH:mm')} - {format(new Date(gardeEnCours.date_fin), 'dd/MM HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Zone</p>
                <p className="font-medium">{gardeEnCours.zone_garde || 'Non définie'}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">Appels</p>
                <p className="font-medium">{gardeEnCours.nb_appels || 0} appels</p>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => { setSelectedGarde(gardeEnCours); setShowNewAppel(true); }}
                  className="w-full"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Nouvel appel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="planning" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-2">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="statistiques" className="gap-2">
            <Users className="w-4 h-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Prochaines gardes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prochaines gardes</CardTitle>
              </CardHeader>
              <CardContent>
                {prochainesGardes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucune garde planifiée</p>
                ) : (
                  <div className="space-y-3">
                    {prochainesGardes.map(garde => (
                      <div key={garde.id} className="p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={GARDE_TYPES[garde.type_garde]?.color}>
                            {GARDE_TYPES[garde.type_garde]?.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {GARDE_TYPES[garde.type_garde]?.hours}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          {format(new Date(garde.date_debut), 'EEEE d MMMM', { locale: fr })}
                        </div>
                        {garde.zone_garde && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            {garde.zone_garde}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendrier */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    className="text-lg font-semibold hover:bg-slate-100 px-3 py-1 h-auto"
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                  >
                    {MONTHS[calendarMonth.getMonth()]}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-lg font-semibold hover:bg-slate-100 px-3 py-1 h-auto"
                    onClick={() => setShowYearPicker(!showYearPicker)}
                  >
                    {calendarMonth.getFullYear()}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {showMonthPicker ? (
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {MONTHS.map((month, idx) => (
                      <Button
                        key={month}
                        variant={calendarMonth.getMonth() === idx ? "default" : "outline"}
                        size="sm"
                        className="text-sm"
                        onClick={() => {
                          setCalendarMonth(setMonth(calendarMonth, idx));
                          setShowMonthPicker(false);
                        }}
                      >
                        {month.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                ) : showYearPicker ? (
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {Array.from({ length: 12 }, (_, i) => calendarMonth.getFullYear() - 5 + i).map(year => (
                      <Button
                        key={year}
                        variant={calendarMonth.getFullYear() === year ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCalendarMonth(setYear(calendarMonth, year));
                          setShowYearPicker(false);
                        }}
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="w-full [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-caption]:hidden [&_.rdp-table]:w-full [&_.rdp-head_th]:w-[14.28%] [&_.rdp-head_th]:text-center [&_.rdp-cell]:w-[14.28%] [&_.rdp-cell]:text-center [&_.rdp-day]:w-full [&_.rdp-day]:h-12 [&_.rdp-day]:text-base [&_.rdp-button]:w-full [&_.rdp-button]:h-full">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      locale={fr}
                      className="rounded-md border p-0"
                      modifiers={{
                        garde: gardes.map(g => new Date(g.date_debut))
                      }}
                      modifiersStyles={{
                        garde: { backgroundColor: '#dbeafe', borderRadius: '50%' }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des gardes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {gardesPassees.map(garde => (
                    <div key={garde.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={GARDE_TYPES[garde.type_garde]?.color}>
                            {GARDE_TYPES[garde.type_garde]?.label}
                          </Badge>
                          <span className="font-medium">
                            {format(new Date(garde.date_debut), 'd MMMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>📞 {garde.nb_appels || 0} appels</span>
                          <span>🏠 {garde.nb_visites || 0} visites</span>
                          <span>🏥 {garde.nb_consultations || 0} consult.</span>
                        </div>
                      </div>
                      
                      {garde.appels?.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Détail des appels:</p>
                          <div className="space-y-2">
                            {garde.appels.slice(0, 3).map((appel, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="text-muted-foreground">
                                  {format(new Date(appel.heure), 'HH:mm')}
                                </span>
                                <Badge variant="outline" className={URGENCE_LEVELS[appel.urgence_level]?.color}>
                                  {URGENCE_LEVELS[appel.urgence_level]?.label}
                                </Badge>
                                <span>{appel.patient_nom}</span>
                                <span className="text-muted-foreground">- {appel.motif}</span>
                              </div>
                            ))}
                            {garde.appels.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{garde.appels.length - 3} autres appels
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistiques" className="mt-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">
                  {gardes.length}
                </div>
                <p className="text-sm text-muted-foreground">Gardes totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600">
                  {gardes.reduce((sum, g) => sum + (g.nb_appels || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Appels traités</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-orange-600">
                  {gardes.reduce((sum, g) => sum + (g.nb_visites || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Visites à domicile</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600">
                  {gardes.reduce((sum, g) => sum + (g.nb_consultations || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Consultations</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog nouvelle garde */}
      <Dialog open={showNewGarde} onOpenChange={setShowNewGarde}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier une garde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Type de garde</Label>
              <Select value={newGarde.type_garde} onValueChange={(v) => setNewGarde({...newGarde, type_garde: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GARDE_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label} ({val.hours})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Début</Label>
                <Input
                  type="datetime-local"
                  value={newGarde.date_debut}
                  onChange={(e) => setNewGarde({...newGarde, date_debut: e.target.value})}
                />
              </div>
              <div>
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={newGarde.date_fin}
                  onChange={(e) => setNewGarde({...newGarde, date_fin: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Zone de garde</Label>
              <Input
                placeholder="Ex: Bruxelles-Centre"
                value={newGarde.zone_garde}
                onChange={(e) => setNewGarde({...newGarde, zone_garde: e.target.value})}
              />
            </div>
            <div>
              <Label>Cercle de médecins</Label>
              <Input
                placeholder="Ex: Cercle MG Bruxelles"
                value={newGarde.cercle_nom}
                onChange={(e) => setNewGarde({...newGarde, cercle_nom: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewGarde(false)}>Annuler</Button>
              <Button 
                onClick={() => createGardeMutation.mutate(newGarde)}
                disabled={!newGarde.date_debut || !newGarde.date_fin}
              >
                Planifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog nouvel appel */}
      <Dialog open={showNewAppel} onOpenChange={setShowNewAppel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un appel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nom du patient</Label>
              <Input
                placeholder="Nom du patient"
                value={newAppel.patient_nom}
                onChange={(e) => setNewAppel({...newAppel, patient_nom: e.target.value})}
              />
            </div>
            <div>
              <Label>Motif</Label>
              <Textarea
                placeholder="Motif de l'appel"
                value={newAppel.motif}
                onChange={(e) => setNewAppel({...newAppel, motif: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Niveau d'urgence</Label>
                <Select value={newAppel.urgence_level} onValueChange={(v) => setNewAppel({...newAppel, urgence_level: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(URGENCE_LEVELS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={newAppel.action} onValueChange={(v) => setNewAppel({...newAppel, action: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conseil_tel">Conseil téléphonique</SelectItem>
                    <SelectItem value="consultation">Consultation au cabinet</SelectItem>
                    <SelectItem value="visite">Visite à domicile</SelectItem>
                    <SelectItem value="urgences">Envoi aux urgences</SelectItem>
                    <SelectItem value="samu">Appel SAMU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes complémentaires"
                value={newAppel.notes}
                onChange={(e) => setNewAppel({...newAppel, notes: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewAppel(false)}>Annuler</Button>
              <Button 
                onClick={() => addAppelMutation.mutate({ gardeId: selectedGarde?.id || gardeEnCours?.id, appel: newAppel })}
                disabled={!newAppel.patient_nom || !newAppel.motif}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}