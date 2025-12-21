import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

export default function DashboardWidget({ 
  widget, 
  onRemove, 
  dragHandleProps 
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {widget.icon}
            {widget.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div {...dragHandleProps} className="cursor-move p-1 hover:bg-slate-100 rounded">
              <GripVertical className="w-5 h-5 text-slate-400" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(widget.id)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {widget.component}
      </CardContent>
    </Card>
  );
}