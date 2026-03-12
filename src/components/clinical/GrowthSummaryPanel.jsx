import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  CheckCircle, Scale, Ruler, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import { differenceInMonths, parseISO } from 'date-fns';

const WHO_PERCENTILES = {
  weight_boys: {
    p3: [[0,2.5],[6,6.4],[12,7.8],[24,10.5],[36,12.5],[48,14.5],[60,16.5],[72,18.5],[84,20.5],[96,23],[108,26],[120,29],[132,33],[144,38],[156,44],[168,51],[180,56],[192,60],[204,63],[216,65]],
    p15: [[0,2.9],[6,7.1],[12,8.7],[24,11.3],[36,13.3],[48,15.3],[60,17.3],[72,19.3],[84,21.5],[96,24.3],[108,27.3],[120,30.8],[132,35.3],[144,40.8],[156,47.3],[168,54.3],[180,59.8],[192,63.8],[204,66.8],[216,68.8]],
    p50: [[0,3.3],[6,7.9],[12,9.6],[24,12.2],[36,14.3],[48,16.3],[60,18.3],[72,20.5],[84,23],[96,26],[108,29],[120,33],[132,38],[144,44],[156,51],[168,58],[180,64],[192,68],[204,71],[216,73]],
    p85: [[0,3.9],[6,8.8],[12,10.7],[24,13.3],[36,15.6],[48,17.8],[60,20.0],[72,22.5],[84,25.3],[96,28.8],[108,32.5],[120,37.0],[132,42.5],[144,49.0],[156,57.0],[168,64.0],[180,70.0],[192,74.0],[204,77.0],[216,79.0]],
    p97: [[0,4.3],[6,9.7],[12,11.8],[24,14.5],[36,17.0],[48,19.5],[60,22.0],[72,25],[84,28],[96,32],[108,37],[120,43],[132,50],[144,58],[156,67],[168,75],[180,82],[192,87],[204,90],[216,93]]
  },
  weight_girls: {
    p3: [[0,2.4],[6,5.8],[12,7.2],[24,9.8],[36,11.8],[48,13.8],[60,15.8],[72,17.5],[84,19.5],[96,22],[108,25],[120,28],[132,32],[144,37],[156,42],[168,46],[180,48],[192,49],[204,50],[216,51]],
    p15: [[0,2.8],[6,6.5],[12,8.0],[24,10.6],[36,12.6],[48,14.7],[60,16.7],[72,18.7],[84,20.9],[96,23.9],[108,26.9],[120,30.3],[132,34.8],[144,40.3],[156,45.3],[168,49.3],[180,51.3],[192,52.3],[204,53.3],[216,53.8]],
    p50: [[0,3.2],[6,7.3],[12,8.9],[24,11.5],[36,13.5],[48,15.8],[60,17.8],[72,20],[84,22.5],[96,26],[108,29],[120,33],[132,38],[144,44],[156,49],[168,53],[180,55],[192,56],[204,57],[216,57]],
    p85: [[0,3.7],[6,8.2],[12,10.0],[24,12.7],[36,14.8],[48,17.3],[60,19.5],[72,22.0],[84,24.8],[96,29.0],[108,33.0],[120,38.0],[132,43.5],[144,50.0],[156,55.5],[168,59.5],[180,62.0],[192,63.0],[204,64.0],[216,64.5]],
    p97: [[0,4.2],[6,9.0],[12,11.0],[24,13.8],[36,16.2],[48,19.0],[60,21.5],[72,25],[84,29],[96,34],[108,40],[120,47],[132,55],[144,63],[156,70],[168,75],[180,78],[192,80],[204,81],[216,82]]
  },
  height_boys: {
    p3: [[0,46],[6,63],[12,71],[24,82],[36,90],[48,97],[60,103],[72,109],[84,115],[96,120],[108,125],[120,130],[132,136],[144,142],[156,150],[168,158],[180,165],[192,170],[204,173],[216,175]],
    p15: [[0,47.5],[6,64.5],[12,73],[24,84],[36,92.5],[48,99.5],[60,106],[72,112],[84,118],[96,123.5],[108,128.5],[120,133.5],[132,140],[144,146.5],[156,155],[168,163.5],[180,170],[192,173.5],[204,175.5],[216,177]],
    p50: [[0,50],[6,67],[12,76],[24,87],[36,96],[48,103],[60,110],[72,116],[84,122],[96,128],[108,133],[120,138],[132,145],[144,152],[156,161],[168,170],[180,176],[192,178],[204,179],[216,180]],
    p85: [[0,52],[6,69],[12,78.5],[24,89.5],[36,99],[48,106.5],[60,113.5],[72,120],[84,126],[96,132],[108,137.5],[120,143],[132,150.5],[144,158],[156,167.5],[168,177],[180,182],[192,183.5],[204,184.5],[216,185]],
    p97: [[0,54],[6,71],[12,81],[24,92],[36,102],[48,110],[60,118],[72,124],[84,130],[96,136],[108,142],[120,149],[132,157],[144,166],[156,175],[168,182],[180,187],[192,189],[204,190],[216,191]]
  },
  height_girls: {
    p3: [[0,45],[6,61],[12,69],[24,80],[36,88],[48,95],[60,101],[72,107],[84,112],[96,117],[108,122],[120,127],[132,133],[144,141],[156,148],[168,152],[180,154],[192,155],[204,156],[216,156]],
    p15: [[0,46.5],[6,62.5],[12,71],[24,82.5],[36,91],[48,98],[60,104.5],[72,110.5],[84,116],[96,121],[108,126.5],[120,132],[132,138.5],[144,146.5],[156,153],[168,156.5],[180,158.5],[192,159.5],[204,160],[216,160.2]],
    p50: [[0,49],[6,65],[12,74],[24,86],[36,95],[48,102],[60,109],[72,115],[84,121],[96,126],[108,132],[120,138],[132,145],[144,153],[156,159],[168,162],[180,164],[192,165],[204,165],[216,165]],
    p85: [[0,51],[6,67],[12,76.5],[24,89],[36,98],[48,105.5],[60,112.5],[72,119.5],[84,125.5],[96,131],[108,137],[120,143.5],[132,151],[144,159],[156,164.5],[168,167.5],[180,169],[192,170],[204,170.2],[216,170.5]],
    p97: [[0,53],[6,69],[12,79],[24,91],[36,101],[48,109],[60,116],[72,123],[84,129],[96,135],[108,142],[120,150],[132,158],[144,165],[156,170],[168,173],[180,174],[192,175],[204,175],[216,175]]
  }
};

const interpolate = (data, age) => {
  for (let i = 0; i < data.length - 1; i++) {
    const [a1, v1] = data[i];
    const [a2, v2] = data[i + 1];
    if (age >= a1 && age <= a2) {
      return v1 + (age - a1) / (a2 - a1) * (v2 - v1);
    }
  }
  if (age <= data[0][0]) return data[0][1];
  if (age >= data[data.length - 1][0]) return data[data.length - 1][1];
  return null;
};

const getPercentileZone = (value, percData, age) => {
  const p3 = interpolate(percData.p3, age);
  const p15 = interpolate(percData.p15, age);
  const p50 = interpolate(percData.p50, age);
  const p85 = interpolate(percData.p85, age);
  const p97 = interpolate(percData.p97, age);
  if (!p3) return null;

  if (value < p3) return { zone: '<P3', severity: 'critical_low', label: 'Très bas (< P3)' };
  if (value < p15) return { zone: 'P3-P15', severity: 'low', label: 'Bas (P3-P15)' };
  if (value < p50) return { zone: 'P15-P50', severity: 'normal_low', label: 'Normal bas (P15-P50)' };
  if (value < p85) return { zone: 'P50-P85', severity: 'normal_high', label: 'Normal haut (P50-P85)' };
  if (value < p97) return { zone: 'P85-P97', severity: 'high', label: 'Élevé (P85-P97)' };
  return { zone: '>P97', severity: 'critical_high', label: 'Très élevé (> P97)' };
};

const severityConfig = {
  critical_low: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
  low: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: TrendingDown, iconColor: 'text-amber-500' },
  normal_low: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
  normal_high: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
  high: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: TrendingUp, iconColor: 'text-amber-500' },
  critical_high: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
};

export default function GrowthSummaryPanel({ patient, measurements = [] }) {
  const birthDate = patient?.birthDate ? parseISO(patient.birthDate) : null;
  const gender = patient?.gender || 'male';
  const genderKey = gender === 'female' ? 'girls' : 'boys';
  const isChild = birthDate ? differenceInMonths(new Date(), birthDate) < 216 : false;

  const analysis = useMemo(() => {
    if (!birthDate || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => new Date(a.date_mesure) - new Date(b.date_mesure));
    const latest = sorted[sorted.length - 1];
    const latestAge = differenceInMonths(parseISO(latest.date_mesure), birthDate);

    const weightPerc = WHO_PERCENTILES[`weight_${genderKey}`];
    const heightPerc = WHO_PERCENTILES[`height_${genderKey}`];

    // Current position
    const weightZone = latest.poids_kg ? getPercentileZone(latest.poids_kg, weightPerc, latestAge) : null;
    const heightZone = latest.taille_cm ? getPercentileZone(latest.taille_cm, heightPerc, latestAge) : null;

    // Trajectory (compare last 2-3 measurements)
    let weightTrend = null;
    let heightTrend = null;

    const recentWithWeight = sorted.filter(m => m.poids_kg).slice(-3);
    if (recentWithWeight.length >= 2) {
      const zones = recentWithWeight.map(m => {
        const age = differenceInMonths(parseISO(m.date_mesure), birthDate);
        return getPercentileZone(m.poids_kg, weightPerc, age);
      }).filter(Boolean);
      
      if (zones.length >= 2) {
        const zoneOrder = ['<P3', 'P3-P15', 'P15-P50', 'P50-P85', 'P85-P97', '>P97'];
        const first = zoneOrder.indexOf(zones[0].zone);
        const last = zoneOrder.indexOf(zones[zones.length - 1].zone);
        if (last > first + 1) weightTrend = 'rising';
        else if (last < first - 1) weightTrend = 'falling';
        else weightTrend = 'stable';
      }
    }

    const recentWithHeight = sorted.filter(m => m.taille_cm).slice(-3);
    if (recentWithHeight.length >= 2) {
      const zones = recentWithHeight.map(m => {
        const age = differenceInMonths(parseISO(m.date_mesure), birthDate);
        return getPercentileZone(m.taille_cm, heightPerc, age);
      }).filter(Boolean);

      if (zones.length >= 2) {
        const zoneOrder = ['<P3', 'P3-P15', 'P15-P50', 'P50-P85', 'P85-P97', '>P97'];
        const first = zoneOrder.indexOf(zones[0].zone);
        const last = zoneOrder.indexOf(zones[zones.length - 1].zone);
        if (last > first + 1) heightTrend = 'rising';
        else if (last < first - 1) heightTrend = 'falling';
        else heightTrend = 'stable';
      }
    }

    // IMC analysis (for older children/adults)
    let imcAnalysis = null;
    if (latest.imc) {
      if (latest.imc < 16) imcAnalysis = { status: 'Dénutrition sévère', severity: 'critical_low' };
      else if (latest.imc < 18.5) imcAnalysis = { status: 'Insuffisance pondérale', severity: 'low' };
      else if (latest.imc < 25) imcAnalysis = { status: 'Poids normal', severity: 'normal_low' };
      else if (latest.imc < 30) imcAnalysis = { status: 'Surpoids', severity: 'high' };
      else if (latest.imc < 35) imcAnalysis = { status: 'Obésité modérée', severity: 'critical_high' };
      else imcAnalysis = { status: 'Obésité sévère', severity: 'critical_high' };
    }

    // Generate clinical interpretation
    const alerts = [];
    if (weightZone?.severity === 'critical_low') alerts.push('⚠️ Poids très bas pour l\'âge — évaluer un retard staturo-pondéral');
    if (weightZone?.severity === 'critical_high') alerts.push('⚠️ Poids très élevé pour l\'âge — évaluer risque d\'obésité');
    if (heightZone?.severity === 'critical_low') alerts.push('⚠️ Taille très basse pour l\'âge — envisager bilan endocrinien');
    if (weightTrend === 'rising' && (weightZone?.severity === 'high' || weightZone?.severity === 'critical_high'))
      alerts.push('📈 Tendance à la prise de poids excessive — surveillance renforcée');
    if (weightTrend === 'falling' && (weightZone?.severity === 'low' || weightZone?.severity === 'critical_low'))
      alerts.push('📉 Perte de poids préoccupante — rechercher cause');
    if (heightTrend === 'falling')
      alerts.push('📉 Ralentissement de la croissance staturale — à investiguer');

    const p50Weight = interpolate(weightPerc.p50, latestAge);
    const p50Height = interpolate(heightPerc.p50, latestAge);

    return {
      weightZone,
      heightZone,
      weightTrend,
      heightTrend,
      imcAnalysis,
      alerts,
      p50Weight,
      p50Height,
      latestAge,
      latest
    };
  }, [measurements, birthDate, genderKey]);

  if (!analysis || !isChild) return null;

  const trendIcon = (trend) => {
    if (trend === 'rising') return <ArrowUp className="w-3 h-3" />;
    if (trend === 'falling') return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const trendLabel = (trend) => {
    if (trend === 'rising') return 'En hausse';
    if (trend === 'falling') return 'En baisse';
    return 'Stable';
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-sm text-indigo-900">Bilan de croissance</h3>
          <Badge variant="outline" className="text-xs ml-auto">
            {Math.floor(analysis.latestAge / 12)}a {analysis.latestAge % 12}m • {gender === 'female' ? '♀' : '♂'}
          </Badge>
        </div>

        {/* Position actuelle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysis.weightZone && (
            <div className={`p-3 rounded-lg border ${severityConfig[analysis.weightZone.severity].color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Poids</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{analysis.latest.poids_kg} kg</span>
                <span className="text-xs opacity-75">/ médiane {analysis.p50Weight?.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{analysis.weightZone.label}</Badge>
                {analysis.weightTrend && (
                  <span className="flex items-center gap-1 text-xs">
                    {trendIcon(analysis.weightTrend)} {trendLabel(analysis.weightTrend)}
                  </span>
                )}
              </div>
            </div>
          )}

          {analysis.heightZone && (
            <div className={`p-3 rounded-lg border ${severityConfig[analysis.heightZone.severity].color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Taille</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{analysis.latest.taille_cm} cm</span>
                <span className="text-xs opacity-75">/ médiane {analysis.p50Height?.toFixed(1)} cm</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{analysis.heightZone.label}</Badge>
                {analysis.heightTrend && (
                  <span className="flex items-center gap-1 text-xs">
                    {trendIcon(analysis.heightTrend)} {trendLabel(analysis.heightTrend)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* IMC */}
        {analysis.imcAnalysis && (
          <div className={`p-3 rounded-lg border ${severityConfig[analysis.imcAnalysis.severity].color}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">IMC</span>
                <span className="text-lg font-bold ml-2">{analysis.latest.imc}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{analysis.imcAnalysis.status}</Badge>
            </div>
          </div>
        )}

        {/* Alertes cliniques */}
        {analysis.alerts.length > 0 && (
          <div className="space-y-2">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {alert}
              </div>
            ))}
          </div>
        )}

        {/* Verdict global */}
        {analysis.alerts.length === 0 && (analysis.weightZone || analysis.heightZone) && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Croissance dans les limites normales — pas d'alerte particulière.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}