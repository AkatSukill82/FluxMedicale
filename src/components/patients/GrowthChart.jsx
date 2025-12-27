import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { Plus, TrendingUp, Scale, Ruler, Heart, Thermometer, Activity } from 'lucide-react';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Données de référence OMS pour courbes de croissance (étendues 0-216 mois / 18 ans)
const WHO_PERCENTILES = {
  weight_boys: {
    p3: [[0, 2.5], [6, 6.4], [12, 7.8], [24, 10.5], [36, 12.5], [48, 14.5], [60, 16.5], [72, 18.5], [84, 20.5], [96, 23], [108, 26], [120, 29], [132, 33], [144, 38], [156, 44], [168, 51], [180, 56], [192, 60], [204, 63], [216, 65]],
    p50: [[0, 3.3], [6, 7.9], [12, 9.6], [24, 12.2], [36, 14.3], [48, 16.3], [60, 18.3], [72, 20.5], [84, 23], [96, 26], [108, 29], [120, 33], [132, 38], [144, 44], [156, 51], [168, 58], [180, 64], [192, 68], [204, 71], [216, 73]],
    p97: [[0, 4.3], [6, 9.7], [12, 11.8], [24, 14.5], [36, 17.0], [48, 19.5], [60, 22.0], [72, 25], [84, 28], [96, 32], [108, 37], [120, 43], [132, 50], [144, 58], [156, 67], [168, 75], [180, 82], [192, 87], [204, 90], [216, 93]]
  },
  weight_girls: {
    p3: [[0, 2.4], [6, 5.8], [12, 7.2], [24, 9.8], [36, 11.8], [48, 13.8], [60, 15.8], [72, 17.5], [84, 19.5], [96, 22], [108, 25], [120, 28], [132, 32], [144, 37], [156, 42], [168, 46], [180, 48], [192, 49], [204, 50], [216, 51]],
    p50: [[0, 3.2], [6, 7.3], [12, 8.9], [24, 11.5], [36, 13.5], [48, 15.8], [60, 17.8], [72, 20], [84, 22.5], [96, 26], [108, 29], [120, 33], [132, 38], [144, 44], [156, 49], [168, 53], [180, 55], [192, 56], [204, 57], [216, 57]],
    p97: [[0, 4.2], [6, 9.0], [12, 11.0], [24, 13.8], [36, 16.2], [48, 19.0], [60, 21.5], [72, 25], [84, 29], [96, 34], [108, 40], [120, 47], [132, 55], [144, 63], [156, 70], [168, 75], [180, 78], [192, 80], [204, 81], [216, 82]]
  },
  height_boys: {
    p3: [[0, 46], [6, 63], [12, 71], [24, 82], [36, 90], [48, 97], [60, 103], [72, 109], [84, 115], [96, 120], [108, 125], [120, 130], [132, 136], [144, 142], [156, 150], [168, 158], [180, 165], [192, 170], [204, 173], [216, 175]],
    p50: [[0, 50], [6, 67], [12, 76], [24, 87], [36, 96], [48, 103], [60, 110], [72, 116], [84, 122], [96, 128], [108, 133], [120, 138], [132, 145], [144, 152], [156, 161], [168, 170], [180, 176], [192, 178], [204, 179], [216, 180]],
    p97: [[0, 54], [6, 71], [12, 81], [24, 92], [36, 102], [48, 110], [60, 118], [72, 124], [84, 130], [96, 136], [108, 142], [120, 149], [132, 157], [144, 166], [156, 175], [168, 182], [180, 187], [192, 189], [204, 190], [216, 191]]
  },
  height_girls: {
    p3: [[0, 45], [6, 61], [12, 69], [24, 80], [36, 88], [48, 95], [60, 101], [72, 107], [84, 112], [96, 117], [108, 122], [120, 127], [132, 133], [144, 141], [156, 148], [168, 152], [180, 154], [192, 155], [204, 156], [216, 156]],
    p50: [[0, 49], [6, 65], [12, 74], [24, 86], [36, 95], [48, 102], [60, 109], [72, 115], [84, 121], [96, 126], [108, 132], [120, 138], [132, 145], [144, 153], [156, 159], [168, 162], [180, 164], [192, 165], [204, 165], [216, 165]],
    p97: [[0, 53], [6, 69], [12, 79], [24, 91], [36, 101], [48, 109], [60, 116], [72, 123], [84, 129], [96, 135], [108, 142], [120, 150], [132, 158], [144, 165], [156, 170], [168, 173], [180, 174], [192, 175], [204, 175], [216, 175]]
  },
  // IMC adultes - valeurs de référence
  imc_adults: {
    underweight: 18.5,
    normal_low: 18.5,
    normal_high: 25,
    overweight: 30,
    obese: 35
  },
  // Tension artérielle adultes
  bp_adults: {
    systolic_normal: 120,
    systolic_elevated: 130,
    systolic_high: 140,
    diastolic_normal: 80,
    diastolic_high: 90
  }
};

// Interpolation linéaire pour obtenir les percentiles à n'importe quel âge
const interpolatePercentile = (data, ageMonths) => {
  for (let i = 0; i < data.length - 1; i++) {
    const [age1, val1] = data[i];
    const [age2, val2] = data[i + 1];
    if (ageMonths >= age1 && ageMonths <= age2) {
      const ratio = (ageMonths - age1) / (age2 - age1);
      return val1 + ratio * (val2 - val1);
    }
  }
  return null;
};

export default function GrowthChart({ patient }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('weight');
  const [newMeasurement, setNewMeasurement] = useState({
    date_mesure: new Date().toISOString().split('T')[0],
    poids_kg: '',
    taille_cm: '',
    perimetre_cranien_cm: '',
    tension_systolique: '',
    tension_diastolique: '',
    frequence_cardiaque: '',
    temperature: '',
    notes: ''
  });

  const patientBirthDate = patient?.birthDate ? parseISO(patient.birthDate) : null;
  const patientGender = patient?.gender || 'unknown';
  const isChild = patientBirthDate ? differenceInMonths(new Date(), patientBirthDate) < 216 : false; // < 18 ans

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['growth_measurements', patient?.id],
    queryFn: () => base44.entities.GrowthMeasurement.filter({ patient_id: patient.id }, '-date_mesure'),
    enabled: !!patient?.id
  });

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      const ageMois = patientBirthDate 
        ? differenceInMonths(parseISO(data.date_mesure), patientBirthDate)
        : null;
      
      // Calculer l'IMC si poids et taille sont renseignés
      let imc = null;
      if (data.poids_kg && data.taille_cm) {
        const tailleM = data.taille_cm / 100;
        imc = Math.round((data.poids_kg / (tailleM * tailleM)) * 10) / 10;
      }

      return base44.entities.GrowthMeasurement.create({
        patient_id: patient.id,
        date_mesure: data.date_mesure,
        age_mois: ageMois,
        poids_kg: data.poids_kg ? parseFloat(data.poids_kg) : null,
        taille_cm: data.taille_cm ? parseFloat(data.taille_cm) : null,
        imc: imc,
        perimetre_cranien_cm: data.perimetre_cranien_cm ? parseFloat(data.perimetre_cranien_cm) : null,
        tension_systolique: data.tension_systolique ? parseInt(data.tension_systolique) : null,
        tension_diastolique: data.tension_diastolique ? parseInt(data.tension_diastolique) : null,
        frequence_cardiaque: data.frequence_cardiaque ? parseInt(data.frequence_cardiaque) : null,
        temperature: data.temperature ? parseFloat(data.temperature) : null,
        notes: data.notes,
        medecin_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growth_measurements', patient?.id] });
      toast.success('Mesure enregistrée');
      setShowAddDialog(false);
      setNewMeasurement({
        date_mesure: new Date().toISOString().split('T')[0],
        poids_kg: '',
        taille_cm: '',
        perimetre_cranien_cm: '',
        tension_systolique: '',
        tension_diastolique: '',
        frequence_cardiaque: '',
        temperature: '',
        notes: ''
      });
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  // Préparer les données pour les graphiques
  const chartData = measurements
    .slice()
    .sort((a, b) => new Date(a.date_mesure) - new Date(b.date_mesure))
    .map(m => ({
      ...m,
      date: format(parseISO(m.date_mesure), 'dd/MM/yy'),
      dateObj: parseISO(m.date_mesure),
      ageMoisDisplay: m.age_mois !== null ? `${Math.floor(m.age_mois / 12)}a ${m.age_mois % 12}m` : null
    }));

  // Données avec percentiles OMS pour enfants
  const getPercentileData = (type) => {
    if (!isChild || !patientBirthDate) return chartData;
    
    const genderKey = patientGender === 'female' ? 'girls' : 'boys';
    const percentiles = type === 'weight' 
      ? WHO_PERCENTILES[`weight_${genderKey}`]
      : WHO_PERCENTILES[`height_${genderKey}`];

    return chartData.map(d => {
      if (d.age_mois === null || d.age_mois > 60) return d;
      return {
        ...d,
        p3: interpolatePercentile(percentiles.p3, d.age_mois),
        p50: interpolatePercentile(percentiles.p50, d.age_mois),
        p97: interpolatePercentile(percentiles.p97, d.age_mois)
      };
    });
  };

  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];

  const getEvolution = (current, previous, field) => {
    if (!current?.[field] || !previous?.[field]) return null;
    const diff = current[field] - previous[field];
    return diff;
  };

  const weightEvolution = getEvolution(latestMeasurement, previousMeasurement, 'poids_kg');
  const heightEvolution = getEvolution(latestMeasurement, previousMeasurement, 'taille_cm');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Courbes de croissance & Constantes
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle mesure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une mesure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newMeasurement.date_mesure}
                    onChange={(e) => setNewMeasurement({...newMeasurement, date_mesure: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Poids (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 72.5"
                      value={newMeasurement.poids_kg}
                      onChange={(e) => setNewMeasurement({...newMeasurement, poids_kg: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> Taille (cm)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 175"
                      value={newMeasurement.taille_cm}
                      onChange={(e) => setNewMeasurement({...newMeasurement, taille_cm: e.target.value})}
                    />
                  </div>
                </div>

                {isChild && differenceInMonths(new Date(), patientBirthDate) < 36 && (
                  <div>
                    <Label>Périmètre crânien (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 35"
                      value={newMeasurement.perimetre_cranien_cm}
                      onChange={(e) => setNewMeasurement({...newMeasurement, perimetre_cranien_cm: e.target.value})}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Heart className="w-4 h-4" /> Tension (mmHg)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Sys"
                        value={newMeasurement.tension_systolique}
                        onChange={(e) => setNewMeasurement({...newMeasurement, tension_systolique: e.target.value})}
                      />
                      <Input
                        type="number"
                        placeholder="Dia"
                        value={newMeasurement.tension_diastolique}
                        onChange={(e) => setNewMeasurement({...newMeasurement, tension_diastolique: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Activity className="w-4 h-4" /> FC (bpm)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 72"
                      value={newMeasurement.frequence_cardiaque}
                      onChange={(e) => setNewMeasurement({...newMeasurement, frequence_cardiaque: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4" /> Température (°C)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 37.0"
                    value={newMeasurement.temperature}
                    onChange={(e) => setNewMeasurement({...newMeasurement, temperature: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    placeholder="Observations..."
                    value={newMeasurement.notes}
                    onChange={(e) => setNewMeasurement({...newMeasurement, notes: e.target.value})}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => addMutation.mutate(newMeasurement)}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Résumé des dernières mesures */}
        {latestMeasurement && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {latestMeasurement.poids_kg && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Scale className="w-4 h-4" />
                  <span className="text-xs font-medium">Poids</span>
                </div>
                <p className="text-xl font-bold text-blue-900">{latestMeasurement.poids_kg} kg</p>
                {weightEvolution !== null && (
                  <p className={`text-xs ${weightEvolution > 0 ? 'text-green-600' : weightEvolution < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {weightEvolution > 0 ? '+' : ''}{weightEvolution.toFixed(1)} kg
                  </p>
                )}
              </div>
            )}
            {latestMeasurement.taille_cm && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Ruler className="w-4 h-4" />
                  <span className="text-xs font-medium">Taille</span>
                </div>
                <p className="text-xl font-bold text-green-900">{latestMeasurement.taille_cm} cm</p>
                {heightEvolution !== null && (
                  <p className="text-xs text-green-600">
                    +{heightEvolution.toFixed(1)} cm
                  </p>
                )}
              </div>
            )}
            {latestMeasurement.imc && (
              <div className={`p-3 rounded-lg ${
                latestMeasurement.imc < 18.5 ? 'bg-yellow-50' :
                latestMeasurement.imc < 25 ? 'bg-emerald-50' :
                latestMeasurement.imc < 30 ? 'bg-orange-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">IMC</span>
                </div>
                <p className="text-xl font-bold">{latestMeasurement.imc}</p>
                <p className="text-xs text-slate-600">
                  {latestMeasurement.imc < 18.5 ? 'Insuffisance' :
                   latestMeasurement.imc < 25 ? 'Normal' :
                   latestMeasurement.imc < 30 ? 'Surpoids' : 'Obésité'}
                </p>
              </div>
            )}
            {(latestMeasurement.tension_systolique && latestMeasurement.tension_diastolique) && (
              <div className="p-3 bg-rose-50 rounded-lg">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs font-medium">Tension</span>
                </div>
                <p className="text-xl font-bold text-rose-900">
                  {latestMeasurement.tension_systolique}/{latestMeasurement.tension_diastolique}
                </p>
                <p className="text-xs text-slate-600">mmHg</p>
              </div>
            )}
          </div>
        )}

        {/* Graphiques */}
        {chartData.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="weight">Poids</TabsTrigger>
              <TabsTrigger value="height">Taille</TabsTrigger>
              <TabsTrigger value="imc">IMC</TabsTrigger>
              <TabsTrigger value="vitals">Constantes</TabsTrigger>
            </TabsList>

            <TabsContent value="weight">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getPercentileData('weight')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey={isChild ? "ageMoisDisplay" : "date"} 
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      domain={['auto', 'auto']}
                      label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value, name) => {
                        if (name === 'poids_kg') return [`${value} kg`, 'Poids'];
                        if (name === 'p3') return [`${value?.toFixed(1)} kg`, 'P3'];
                        if (name === 'p50') return [`${value?.toFixed(1)} kg`, 'P50 (médiane)'];
                        if (name === 'p97') return [`${value?.toFixed(1)} kg`, 'P97'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    {isChild && (
                      <>
                        <Area type="monotone" dataKey="p97" stroke="#94a3b8" fill="#f1f5f9" name="P97" />
                        <Area type="monotone" dataKey="p50" stroke="#64748b" fill="#e2e8f0" name="P50" />
                        <Area type="monotone" dataKey="p3" stroke="#94a3b8" fill="#fff" name="P3" />
                      </>
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="poids_kg" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      name="Poids"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {isChild && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Zones grises : percentiles OMS (P3-P50-P97) pour {patientGender === 'female' ? 'filles' : 'garçons'}
                </p>
              )}
            </TabsContent>

            <TabsContent value="height">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getPercentileData('height')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey={isChild ? "ageMoisDisplay" : "date"} 
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      domain={['auto', 'auto']}
                      label={{ value: 'cm', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value, name) => {
                        if (name === 'taille_cm') return [`${value} cm`, 'Taille'];
                        if (name === 'p3') return [`${value?.toFixed(1)} cm`, 'P3'];
                        if (name === 'p50') return [`${value?.toFixed(1)} cm`, 'P50 (médiane)'];
                        if (name === 'p97') return [`${value?.toFixed(1)} cm`, 'P97'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    {isChild && (
                      <>
                        <Area type="monotone" dataKey="p97" stroke="#94a3b8" fill="#f1f5f9" name="P97" />
                        <Area type="monotone" dataKey="p50" stroke="#64748b" fill="#e2e8f0" name="P50" />
                        <Area type="monotone" dataKey="p3" stroke="#94a3b8" fill="#fff" name="P3" />
                      </>
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="taille_cm" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', strokeWidth: 2, r: 5 }}
                      name="Taille"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="imc">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      domain={[15, 35]}
                      label={{ value: 'IMC', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={18.5} stroke="#eab308" strokeDasharray="5 5" label={{ value: '18.5', fontSize: 10 }} />
                    <ReferenceLine y={25} stroke="#f97316" strokeDasharray="5 5" label={{ value: '25', fontSize: 10 }} />
                    <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '30', fontSize: 10 }} />
                    <Line 
                      type="monotone" 
                      dataKey="imc" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                      name="IMC"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center mt-2 text-xs">
                <span className="text-yellow-600">― 18.5 (insuffisance)</span>
                <span className="text-orange-600">― 25 (surpoids)</span>
                <span className="text-red-600">― 30 (obésité)</span>
              </div>
            </TabsContent>

            <TabsContent value="vitals">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="tension_systolique" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Systolique"
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tension_diastolique" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Diastolique"
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="frequence_cardiaque" 
                      stroke="#ec4899" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="FC (bpm)"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Aucune mesure enregistrée</p>
            <p className="text-sm mt-1">Cliquez sur "Nouvelle mesure" pour commencer le suivi</p>
          </div>
        )}

        {/* Historique des mesures */}
        {measurements.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-sm mb-3">Historique des mesures</h4>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Poids</th>
                    <th className="text-right p-2">Taille</th>
                    <th className="text-right p-2">IMC</th>
                    <th className="text-right p-2">Tension</th>
                    <th className="text-right p-2">FC</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map(m => (
                    <tr key={m.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">{format(parseISO(m.date_mesure), 'dd/MM/yyyy')}</td>
                      <td className="p-2 text-right">{m.poids_kg ? `${m.poids_kg} kg` : '-'}</td>
                      <td className="p-2 text-right">{m.taille_cm ? `${m.taille_cm} cm` : '-'}</td>
                      <td className="p-2 text-right">{m.imc || '-'}</td>
                      <td className="p-2 text-right">
                        {m.tension_systolique && m.tension_diastolique 
                          ? `${m.tension_systolique}/${m.tension_diastolique}` 
                          : '-'}
                      </td>
                      <td className="p-2 text-right">{m.frequence_cardiaque || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}