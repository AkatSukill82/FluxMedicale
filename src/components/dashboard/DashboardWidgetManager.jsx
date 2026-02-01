import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings2, 
  GripVertical, 
  Plus,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AVAILABLE_WIDGETS, DEFAULT_WIDGET_ORDER } from './widgetConfig';

const STORAGE_KEY = 'dashboard-widgets-config';

export function useDashboardWidgets() {
  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return {
      order: DEFAULT_WIDGET_ORDER,
      hidden: []
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const visibleWidgets = config.order
    .filter(id => !config.hidden.includes(id))
    .map(id => AVAILABLE_WIDGETS.find(w => w.id === id))
    .filter(Boolean);

  const toggleWidget = (widgetId) => {
    setConfig(prev => {
      const isHidden = prev.hidden.includes(widgetId);
      return {
        ...prev,
        hidden: isHidden 
          ? prev.hidden.filter(id => id !== widgetId)
          : [...prev.hidden, widgetId],
        order: isHidden || prev.order.includes(widgetId)
          ? prev.order
          : [...prev.order, widgetId]
      };
    });
  };

  const reorderWidgets = (newOrder) => {
    setConfig(prev => ({ ...prev, order: newOrder }));
  };

  const resetToDefault = () => {
    setConfig({
      order: DEFAULT_WIDGET_ORDER,
      hidden: []
    });
  };

  return {
    config,
    visibleWidgets,
    toggleWidget,
    reorderWidgets,
    resetToDefault
  };
}

export default function DashboardWidgetManager({ config, toggleWidget, reorderWidgets, resetToDefault }) {
  const [open, setOpen] = useState(false);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(config.order);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderWidgets(items);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Personnaliser
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Personnaliser le tableau de bord
            <Button variant="ghost" size="sm" onClick={resetToDefault} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Activez ou désactivez les widgets et réorganisez-les par glisser-déposer.
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {AVAILABLE_WIDGETS.map((widget, index) => {
                    const isVisible = !config.hidden.includes(widget.id);
                    const orderIndex = config.order.indexOf(widget.id);
                    
                    return (
                      <Draggable key={widget.id} draggableId={widget.id} index={orderIndex !== -1 ? orderIndex : index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border transition-all
                              ${snapshot.isDragging ? 'shadow-lg bg-background' : 'bg-muted/50'}
                              ${!isVisible ? 'opacity-60' : ''}
                            `}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none">
                              <GripVertical className="w-5 h-5 text-muted-foreground" />
                            </div>
                            
                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border">
                              {widget.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{widget.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                            </div>

                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => toggleWidget(widget.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Les modifications sont enregistrées automatiquement
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}