import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, 
  CloudSun, 
  Moon, 
  Bed, 
  Clock, 
  Plus,
  X,
  Calendar
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MOMENTS = [
  { id: 'morning', label: 'Matin', icon: Sun, time: '08:00', color: 'bg-orange-100 text-orange-700' },
  { id: 'noon', label: 'Midi', icon: CloudSun, time: '12:00', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'evening', label: 'Soir', icon: Moon, time: '18:00', color: 'bg-blue-100 text-blue-700' },
  { id: 'night', label: 'Coucher', icon: Bed, time: '22:00', color: 'bg-indigo-100 text-indigo-700' }
];

const PRESETS = [
  { label: '1x1x1 (3x/jour)', schedule: { morning: 1, noon: 1, evening: 1 } },
  { label: '2x2x2 (3x/jour)', schedule: { morning: 2, noon: 2, evening: 2 } },
  { label: '1x0x1 (matin & soir)', schedule: { morning: 1, noon: 0, evening: 1 } },
  { label: '1x2x1', schedule: { morning: 1, noon: 2, evening: 1 } },
  { label: '2x0x2', schedule: { morning: 2, noon: 0, evening: 2 } },
  { label: '1x/jour (matin)', schedule: { morning: 1 } },
  { label: '1x/jour (soir)', schedule: { evening: 1 } },
];

export default function DosageScheduler({ medication, onChange }) {
  const [schedule, setSchedule] = useState({
    morning: 1,
    noon: 0,
    evening: 0,
    night: 0
  });
  
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('7');
  const [durationUnit, setDurationUnit] = useState('jours');
  const [withFood, setWithFood] = useState('indifferent');

  const handleScheduleChange = (moment, value) => {
    const newSchedule = { ...schedule, [moment]: parseInt(value) || 0 };
    setSchedule(newSchedule);
    updateFrequency(newSchedule);
  };

  const applyPreset = (preset) => {
    const newSchedule = { morning: 0, noon: 0, evening: 0, night: 0, ...preset };
    setSchedule(newSchedule);
    updateFrequency(newSchedule);
  };

  const updateFrequency = (sched) => {
    const moments = [];
    let totalPerDay = 0;

    MOMENTS.forEach(moment => {
      const count = sched[moment.id] || 0;
      if (count > 0) {
        moments.push(`${count} ${moment.label.toLowerCase()}`);
        totalPerDay += count;
      }
    });

    let frequencyText = '';
    if (moments.length === 0) {
      frequencyText = 'À définir';
    } else if (moments.length === 1 && totalPerDay === 1) {
      frequencyText = `1x/jour (${moments[0]})`;
    } else {
      frequencyText = moments.join(', ');
    }

    // Instructions de prise
    const foodInstr = withFood === 'before' ? '(avant repas)' : 
                     withFood === 'after' ? '(après repas)' : 
                     withFood === 'during' ? '(pendant repas)' : '';

    const fullInstructions = [frequencyText, foodInstr, instructions].filter(Boolean).join(' ');

    onChange({
      frequency: frequencyText,
      duration: `${duration} ${durationUnit}`,
      instructions: fullInstructions,
      schedule: sched
    });
  };

  React.useEffect(() => {
    updateFrequency(schedule);
  }, [withFood, instructions, duration, durationUnit]);

  const totalPerDay = Object.values(schedule).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Schéma posologique</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.schedule)}
                className="h-8 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {MOMENTS.map(moment => {
            const Icon = moment.icon;
            const count = schedule[moment.id] || 0;
            return (
              <div key={moment.id}>
                <Label className="text-xs mb-1 flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {moment.label}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={schedule[moment.id]}
                  onChange={(e) => handleScheduleChange(moment.id, e.target.value)}
                  className="h-9 text-center text-base font-semibold"
                />
                {count > 0 && (
                  <p className="text-xs text-slate-500 text-center mt-1">{moment.time}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              {totalPerDay} {totalPerDay > 1 ? 'prises' : 'prise'} par jour
            </p>
            {totalPerDay > 0 && (
              <p className="text-xs text-blue-700 mt-0.5">
                {Object.entries(schedule)
                  .filter(([, count]) => count > 0)
                  .map(([moment, count]) => {
                    const m = MOMENTS.find(x => x.id === moment);
                    return `${count} ${m?.label}`;
                  })
                  .join(' • ')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Durée du traitement</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-9 flex-1"
              />
              <Select value={durationUnit} onValueChange={setDurationUnit}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jours">jours</SelectItem>
                  <SelectItem value="semaines">semaines</SelectItem>
                  <SelectItem value="mois">mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Prise par rapport aux repas</Label>
            <Select value={withFood} onValueChange={setWithFood}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indifferent">Indifférent</SelectItem>
                <SelectItem value="before">Avant repas</SelectItem>
                <SelectItem value="during">Pendant repas</SelectItem>
                <SelectItem value="after">Après repas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Instructions supplémentaires</Label>
          <Input
            placeholder="Ex: à avaler avec un grand verre d'eau"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}