import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  ExternalLink, 
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Monitor
} from 'lucide-react';
import { eidDetectionService } from './eidDetectionService';
import { useI18n } from '../i18n/i18nContext';

export default function EIDInstallationModal({ isOpen, onClose, onRetest, platform }) {
  const { t } = useI18n();
  const links = eidDetectionService.getInstallationLinks();

  const getPlatformName = () => {
    switch (platform) {
      case 'windows': return 'Windows';
      case 'macos': return 'macOS';
      case 'linux': return 'Linux';
      default: return t('common.unknown');
    }
  };

  const getDirectDownloadLink = () => {
    switch (platform) {
      case 'windows': return links.windows;
      case 'macos': return links.macos;
      case 'linux': return links.linux;
      default: return links.viewer;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">{t('eid.modal.title')}</DialogTitle>
              <DialogDescription>
                {t('eid.modal.description', { platform: getPlatformName() })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 my-4">
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-200">
              <strong>{t('eid.modal.whyInstall')}</strong><br />
              {t('eid.modal.whyInstallDesc')}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              {t('eid.modal.installSteps')}
            </h3>

            <div className="space-y-3">
                {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-primary text-primary-foreground shrink-0">1</Badge>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    {t('eid.modal.step1')}
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.open(getDirectDownloadLink(), '_blank')}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('eid.modal.directDownload', { platform: getPlatformName() })}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                    <Button
                      onClick={() => window.open(links.viewer, '_blank')}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      {t('eid.modal.officialPage')}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

                {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-primary text-primary-foreground shrink-0">2</Badge>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">
                    {t('eid.modal.step2')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('eid.modal.step2Desc')}
                    {platform === 'windows' && ` ${t('eid.modal.step2DescWin')}`}
                  </p>
                </div>
              </div>

                {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-primary text-primary-foreground shrink-0">3</Badge>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">
                    {t('eid.modal.step3')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('eid.modal.step3Desc')}
                  </p>
                </div>
              </div>

                {/* Step 4 */}
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Badge className="bg-green-600 text-white shrink-0">4</Badge>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    {t('eid.modal.step4')}
                  </p>
                  <Button
                    onClick={onRetest}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('actions.retestNow')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              {t('eid.modal.troubleshooting')}
            </h3>
            
            <div className="space-y-2 text-sm">
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                    <AlertDescription className="text-amber-900 dark:text-amber-200" dangerouslySetInnerHTML={{ 
                        __html: platform === 'windows' ? t('eid.modal.troubleWin') 
                              : platform === 'macos' ? t('eid.modal.troubleMac')
                              : t('eid.modal.troubleLinux')
                    }} />
                </Alert>
              <div className="flex gap-2 mt-3">
                <Button variant="link" onClick={() => window.open(links.faq, '_blank')} className="p-0 h-auto text-primary">
                  {t('eid.modal.officialFaq')} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="link" onClick={() => window.open(links.userManual, '_blank')} className="p-0 h-auto text-primary">
                  {t('eid.modal.userManual')} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="link" onClick={() => window.open(links.support, '_blank')} className="p-0 h-auto text-primary">
                  {t('eid.modal.support')} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <AlertDescription className="text-purple-900 dark:text-purple-200">
              <strong>{t('eid.modal.alternative')}:</strong> <span dangerouslySetInnerHTML={{ __html: t('eid.modal.itsme') }} />
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('actions.close')}
          </Button>
          <Button onClick={onRetest} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('actions.retest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}