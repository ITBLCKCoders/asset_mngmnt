/// <reference types="vite/client" />

// src/hooks/useIdleTimer.ts
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logout } from '@/lib/auth'; // This does everything correctly!

const IDLE_TIMEOUT = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || 300_000; // 5 min
const WARNING_TIME = Number(import.meta.env.VITE_WARNING_TIME_MS) || 15_000; // 15 sec
const ENABLE_SOUND = import.meta.env.VITE_ENABLE_IDLE_SOUND === 'true';
const SOUND_PATH = import.meta.env.VITE_IDLE_SOUND_PATH;

export function useIdleTimer() {
  const [showDialog, setShowDialog] = useState(false);
  const state = useRef({
    hasUsedStay: false,
    hasLoggedOut: false,
    warningTimer: null as NodeJS.Timeout | null,
    logoutTimer: null as NodeJS.Timeout | null,
  }).current;

  const audio = useRef<HTMLAudioElement | null>(null);

  const handleStay = () => {
    setShowDialog(false);
    if (state.warningTimer) clearTimeout(state.warningTimer);
    if (state.logoutTimer) clearTimeout(state.logoutTimer);
    state.warningTimer = state.logoutTimer = null;
    state.hasUsedStay = true;
    toast.success('Session extended – next inactivity will log you out');
    // Restart the cycle with full timeout
    if (!state.hasLoggedOut) {
      state.logoutTimer = setTimeout(() => {
        if (!state.hasLoggedOut) {
          state.hasLoggedOut = true;
          logout(true).catch(err => console.error('Idle logout failed:', err));
          toast.warning('Logged out due to inactivity');
          window.location.replace('/login');
        }
      }, IDLE_TIMEOUT);
    }
  };

  const handleLogout = () => {
    setShowDialog(false);
    if (state.hasLoggedOut) return;
    state.hasLoggedOut = true;
    if (state.warningTimer) clearTimeout(state.warningTimer);
    if (state.logoutTimer) clearTimeout(state.logoutTimer);
    state.warningTimer = state.logoutTimer = null;
    logout(true).catch(err => console.error('Idle logout failed:', err));
    toast.warning('Logged out due to inactivity');
    window.location.replace('/login');
  };

  useEffect(() => {
    if (ENABLE_SOUND && SOUND_PATH) {
      audio.current = new Audio(SOUND_PATH);
      audio.current.preload = 'auto';
    }

    const play = () => audio.current?.play().catch(() => {});

    const clearAll = () => {
      if (state.warningTimer) clearTimeout(state.warningTimer);
      if (state.logoutTimer) clearTimeout(state.logoutTimer);
      state.warningTimer = state.logoutTimer = null;
      setShowDialog(false);
    };

    const forceLogout = async () => {
      if (state.hasLoggedOut) return;
      state.hasLoggedOut = true;
      clearAll();

      try {
        await logout(true);
      } catch (err) {
        console.error('Idle logout failed:', err);
      }

      toast.warning('Logged out due to inactivity');
      window.location.replace('/login');
    };

    const startCycle = () => {
      if (state.hasLoggedOut) return;
      clearAll();

      if (state.hasUsedStay) {
        state.logoutTimer = setTimeout(forceLogout, IDLE_TIMEOUT);
        return;
      }

      state.warningTimer = setTimeout(showWarning, IDLE_TIMEOUT - WARNING_TIME);
      state.logoutTimer = setTimeout(forceLogout, IDLE_TIMEOUT);
    };

    const showWarning = () => {
      if (state.hasLoggedOut || state.hasUsedStay || showDialog) return;
      play();
      setShowDialog(true);
    };

    const onActivity = () => {
      if (!state.hasLoggedOut && !showDialog) {
        startCycle();
      }
    };

    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'wheel',
    ];

    const listenerOpts: AddEventListenerOptions = { passive: true };
    events.forEach(ev => document.addEventListener(ev, onActivity, listenerOpts));
    startCycle();

    return () => {
      events.forEach(ev =>
        document.removeEventListener(ev, onActivity, listenerOpts)
      );
      clearAll();
    };
  }, []);

  return {
    showDialog,
    setShowDialog,
    onStay: handleStay,
    onLogout: handleLogout,
    warningTime: WARNING_TIME,
  };
}
