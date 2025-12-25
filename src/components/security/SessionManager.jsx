import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, Lock } from 'lucide-react';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000; // 2 minutes warning

export default function SessionManager({ children }) {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_BEFORE_LOGOUT);
  const [isLocked, setIsLocked] = useState(false);

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setTimeLeft(WARNING_BEFORE_LOGOUT);
  }, []);

  const handleLogout = useCallback(async (reason = 'inactivity_timeout') => {
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.entities.LoginAttempt.create({
          user_email: user.email,
          success: false,
          failure_reason: reason,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        });
      }
    } catch (e) {
      console.error('Error logging logout:', e);
    }
    base44.auth.logout();
  }, []);

  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, showWarning]);

  // Check for inactivity
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const timeUntilLogout = INACTIVITY_TIMEOUT - elapsed;

      if (timeUntilLogout <= 0) {
        handleLogout('inactivity_timeout');
      } else if (timeUntilLogout <= WARNING_BEFORE_LOGOUT && !showWarning) {
        setShowWarning(true);
        setTimeLeft(timeUntilLogout);
      }

      if (showWarning) {
        setTimeLeft(Math.max(0, timeUntilLogout));
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [lastActivity, showWarning, handleLogout]);

  const handleStayConnected = () => {
    resetTimer();
  };

  const handleLockScreen = () => {
    setIsLocked(true);
    setShowWarning(false);
  };

  const progressPercent = (timeLeft / WARNING_BEFORE_LOGOUT) * 100;
  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

  return (
    <>
      {children}

      {/* Inactivity Warning Dialog */}
      <Dialog open={showWarning && !isLocked} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              Session inactive
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="font-medium">Déconnexion automatique</p>
                <p className="text-sm text-slate-600">
                  Vous serez déconnecté dans {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            
            <Progress value={progressPercent} className="h-2" />
            
            <div className="flex gap-2">
              <Button onClick={handleStayConnected} className="flex-1">
                Rester connecté
              </Button>
              <Button variant="outline" onClick={handleLockScreen}>
                <Lock className="w-4 h-4 mr-2" />
                Verrouiller
              </Button>
            </div>
            <Button 
              variant="ghost" 
              className="w-full text-slate-500"
              onClick={() => handleLogout('manual_logout')}
            >
              Se déconnecter maintenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lock Screen */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <Lock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Session verrouillée</h2>
            <p className="text-slate-400 mb-6">Votre session est verrouillée pour des raisons de sécurité</p>
            <Button onClick={() => handleLogout('manual_logout')}>
              Se reconnecter
            </Button>
          </div>
        </div>
      )}
    </>
  );
}