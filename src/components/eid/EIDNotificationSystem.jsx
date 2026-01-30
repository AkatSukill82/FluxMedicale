import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Check, 
  AlertTriangle, 
  X, 
  Loader2,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const NOTIFICATION_TYPES = {
  INSERTED: {
    icon: CreditCard,
    color: 'bg-blue-500',
    title: 'Carte eID détectée',
    description: 'Cliquez pour lire la carte'
  },
  READING: {
    icon: Loader2,
    color: 'bg-amber-500',
    title: 'Lecture en cours...',
    description: 'Veuillez patienter'
  },
  SUCCESS: {
    icon: Check,
    color: 'bg-green-500',
    title: 'Patient trouvé',
    description: 'Cliquez pour ouvrir le dossier'
  },
  CREATED: {
    icon: UserPlus,
    color: 'bg-green-500',
    title: 'Nouveau patient créé',
    description: 'Cliquez pour ouvrir le dossier'
  },
  REMOVED: {
    icon: CreditCard,
    color: 'bg-slate-500',
    title: 'Carte eID retirée',
    description: ''
  },
  ERROR: {
    icon: AlertTriangle,
    color: 'bg-red-500',
    title: 'Erreur de lecture',
    description: 'Cliquez pour plus de détails'
  }
};

export default function EIDNotificationSystem({ onReadEID, isReading }) {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [cardPresent, setCardPresent] = useState(false);
  const [lastPatient, setLastPatient] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  // Poll for card status
  useEffect(() => {
    let interval;
    
    const checkCardStatus = async () => {
      try {
        const response = await fetch('http://localhost:35963/v1/status', {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const newCardPresent = data.cardPresent || false;
          
          if (newCardPresent && !cardPresent) {
            // Card was just inserted
            setCardPresent(true);
            showNotification('INSERTED');
          } else if (!newCardPresent && cardPresent) {
            // Card was just removed
            setCardPresent(false);
            showNotification('REMOVED', 2000);
          }
        }
      } catch {
        // Service not available, silently ignore
      }
    };

    interval = setInterval(checkCardStatus, 1500);
    return () => clearInterval(interval);
  }, [cardPresent]);

  const showNotification = useCallback((type, autoDismiss = null) => {
    setNotification({ type, timestamp: Date.now() });
    
    if (autoDismiss) {
      setTimeout(() => {
        setNotification(current => 
          current?.timestamp === Date.now() ? null : current
        );
      }, autoDismiss);
    }
  }, []);

  const handleNotificationClick = async () => {
    if (!notification) return;

    switch (notification.type) {
      case 'INSERTED':
        // Start reading
        showNotification('READING');
        const result = await onReadEID();
        
        if (result?.status === 'MATCH' || result?.status === 'CREATED') {
          setLastPatient(result.patient);
          showNotification(result.status === 'MATCH' ? 'SUCCESS' : 'CREATED');
        } else if (result?.status === 'ERROR') {
          setErrorDetails(result.error);
          showNotification('ERROR');
        } else if (result?.status === 'DUPLICATES') {
          // Handle duplicates - navigate to resolution
          setNotification(null);
        }
        break;

      case 'SUCCESS':
      case 'CREATED':
        if (lastPatient) {
          navigate(createPageUrl(`Patients?patient=${lastPatient.id}`));
          setNotification(null);
        }
        break;

      case 'ERROR':
        // Show more details in a toast or modal
        setNotification(null);
        break;

      default:
        break;
    }
  };

  const dismissNotification = (e) => {
    e.stopPropagation();
    setNotification(null);
  };

  if (!notification) return null;

  const config = NOTIFICATION_TYPES[notification.type];
  const Icon = config.icon;
  const isClickable = ['INSERTED', 'SUCCESS', 'CREATED', 'ERROR'].includes(notification.type);
  const isAnimating = notification.type === 'READING';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
      >
        <div
          onClick={isClickable ? handleNotificationClick : undefined}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
            ${config.color} text-white
            ${isClickable ? 'cursor-pointer hover:brightness-110' : ''}
            transition-all min-w-[300px]
          `}
        >
          <div className={`w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ${isAnimating ? 'animate-pulse' : ''}`}>
            <Icon className={`w-5 h-5 ${isAnimating ? 'animate-spin' : ''}`} />
          </div>
          
          <div className="flex-1">
            <p className="font-semibold">{config.title}</p>
            {config.description && (
              <p className="text-sm text-white/80">{config.description}</p>
            )}
            {notification.type === 'SUCCESS' && lastPatient && (
              <p className="text-sm text-white/80">
                {lastPatient.name?.[0]?.given?.join(' ')} {lastPatient.name?.[0]?.family}
              </p>
            )}
            {notification.type === 'ERROR' && errorDetails && (
              <p className="text-sm text-white/80 truncate max-w-[200px]">{errorDetails}</p>
            )}
          </div>

          {isClickable && notification.type !== 'ERROR' && (
            <ArrowRight className="w-5 h-5 opacity-60" />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={dismissNotification}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}