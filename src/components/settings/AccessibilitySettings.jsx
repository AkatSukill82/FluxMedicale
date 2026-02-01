import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Type,
  Eye,
  Zap
} from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export default function AccessibilitySettings() {
  const { accessibility, setAccessibility } = useTheme();

  const fontSizes = [
    { id: 'small', label: 'Petit', size: '14px' },
    { id: 'normal', label: 'Normal', size: '16px' },
    { id: 'large', label: 'Grand', size: '18px' },
    { id: 'xlarge', label: 'Très grand', size: '20px' }
  ];

  return (
    <div className="space-y-6">
      {/* Taille du texte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Taille du texte
          </CardTitle>
          <CardDescription>
            Ajustez la taille de la police pour une meilleure lisibilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {fontSizes.map(({ id, label, size }) => (
              <Button
                key={id}
                variant={accessibility.fontSize === id ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setAccessibility({ ...accessibility, fontSize: id })}
              >
                <span style={{ fontSize: size }} className="font-medium">Aa</span>
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Options d'accessibilité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Accessibilité
          </CardTitle>
          <CardDescription>
            Options pour améliorer le confort visuel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                Contraste élevé
              </Label>
              <p className="text-sm text-muted-foreground">
                Augmente le contraste pour une meilleure visibilité
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={accessibility.highContrast}
              onCheckedChange={(checked) => 
                setAccessibility({ ...accessibility, highContrast: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion" className="text-base font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Réduire les animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Désactive les animations pour réduire les distractions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={accessibility.reducedMotion}
              onCheckedChange={(checked) => 
                setAccessibility({ ...accessibility, reducedMotion: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Aperçu */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Aperçu des paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted">
            <p className="font-semibold mb-2">Exemple de texte</p>
            <p className="text-muted-foreground">
              Voici un exemple de texte avec vos paramètres actuels. 
              Ajustez les options ci-dessus pour personnaliser l'affichage.
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Bouton principal</Button>
              <Button size="sm" variant="outline">Bouton secondaire</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}