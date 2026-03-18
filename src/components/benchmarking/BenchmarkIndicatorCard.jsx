import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function BenchmarkIndicatorCard({ indicator }) {
  const { label, myValue, refValue, diff, isGood, unit } = indicator;

  const absDiff = Math.abs(diff);
  const pctOfRef = refValue > 0 ? Math.min(150, Math.round((myValue / refValue) * 100)) : 100;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const isNeutral = Math.abs(diff) < 1;

  const formatValue = (v) => {
    if (unit === '%') return `${v}%`;
    if (unit === '/1000') return v;
    return v;
  };

  return (
    <Card className={`transition-all ${isGood ? 'border-green-100' : 'border-red-100'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-xs font-medium leading-tight">{label}</p>
          <Badge
            className={`text-[10px] flex-shrink-0 ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            <TrendIcon className="w-3 h-3 mr-0.5" />
            {isNeutral ? '=' : `${diff > 0 ? '+' : ''}${Math.round(absDiff * 10) / 10}${unit === '%' ? 'pp' : ''}`}
          </Badge>
        </div>

        <div className="flex items-end gap-3 mb-2">
          <div>
            <p className="text-2xl font-bold">{formatValue(myValue)}</p>
            <p className="text-[10px] text-muted-foreground">Votre pratique</p>
          </div>
          <div className="text-right">
            <p className="text-lg text-muted-foreground font-medium">{formatValue(refValue)}</p>
            <p className="text-[10px] text-muted-foreground">Moyenne réf.</p>
          </div>
        </div>

        <div className="relative">
          <Progress value={Math.min(100, pctOfRef)} className="h-2" />
          {/* Reference marker */}
          <div
            className="absolute top-0 w-0.5 h-2 bg-slate-800"
            style={{ left: `${Math.min(100, Math.round((refValue / Math.max(myValue, refValue)) * 100))}%` }}
            title={`Référence: ${formatValue(refValue)}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0</span>
          <span>| réf.</span>
        </div>
      </CardContent>
    </Card>
  );
}