import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

export function AppUpdater() {
  const { toast, dismiss } = useToast();
  const { t } = useTranslation();
  const progressToast = useRef<any>(null);

  useEffect(() => {
    // Check if we are running in electron environment
    const electron = (window as any).electronAPI;
    if (!electron || !electron.onUpdateMessage) return;

    const cleanup = electron.onUpdateMessage((payload: any) => {
      switch (payload.type) {
        case 'checking-for-update':
          // We can silently check without a toast, or show one if manually triggered
          break;
        case 'update-available':
          toast({
            title: t('updater.update_available', 'Update Available'),
            description: t('updater.update_available_desc', 'A new version is downloading in the background.'),
            duration: 5000,
          });
          break;
        case 'update-error':
          toast({
            variant: 'destructive',
            title: t('updater.error', 'Update Error'),
            description: payload.error,
          });
          break;
        case 'download-progress':
          {
            const percent = Math.round(payload.progress.percent);
            
            if (!progressToast.current) {
               progressToast.current = toast({
                 title: t('updater.downloading', 'Downloading Update'),
                 description: `${percent}% completed.`,
                 duration: 100000, // keep open
               });
            } else {
               progressToast.current.update({
                 id: progressToast.current.id,
                 title: t('updater.downloading', 'Downloading Update'),
                 description: `${percent}% completed.`,
                 duration: 100000,
               });
            }
          }
          break;
        case 'update-downloaded':
          if (progressToast.current) {
            progressToast.current.dismiss();
            progressToast.current = null;
          }
          toast({
            title: t('updater.ready', 'Update Ready'),
            description: t('updater.ready_desc', 'The update has been downloaded and is ready to install.'),
            duration: 100000,
            action: (
              <ToastAction 
                altText={t('updater.install', 'Restart & Install')} 
                onClick={() => electron.installUpdate()}
              >
                {t('updater.install', 'Restart & Install')}
              </ToastAction>
            ),
          });
          break;
      }
    });

    return cleanup;
  }, [toast, t, dismiss]);

  return null;
}
