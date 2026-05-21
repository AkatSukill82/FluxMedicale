import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function EpiTrendCard({ trend }) {
  const isUp = trend.change > 10;
  const isDown = trend.change < -10;

  return (
    <Card className={isUp && trend.change > 30 ? 'border-red-200 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{trend.name}</h3>
          {isUp ? (
            <Badge className="bg-red-100 text-red-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{trend.change}%
            </Badge>
          ) : isDown ? (
            <Badge className="bg-green-100 text-green-700">
              <TrendingDown className="w-3 h-3 mr-1" />
              {trend.change}%
            </Badge>
          ) : (
            <Badge variant="outline">
              <Minus className="w-3 h-3 mr-1" />
              Stable
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{trend.count}</span>
          <span className="text-sm text-muted-foreground">cas</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Période précédente: {trend.previousCount} cas
        </p>
      </CardContent>
    </Card>
  );
}