/// <reference types="vite/client" />

// src/hooks/useIdleTimer.ts
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { logout } from '@/lib/auth'; // This does everything correctly!

const IDLE_TIMEOUT = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || 300_000; // 5 min
const WARNING_TIME = Number(import.meta.env.VITE_WARNING_TIME_MS) || 15_000; // 15 sec
const ENABLE_SOUND = import.meta.env.VITE_ENABLE_IDLE_SOUND === 'true';
const SOUND_PATH = import.meta.env.VITE_IDLE_SOUND_PATH;

export function useIdleTimer() {
  const state = useRef({
    hasUsedStay: false,
    hasLoggedOut: false,
    warningTimer: null as NodeJS.Timeout | null,
    logoutTimer: null as NodeJS.Timeout | null,
    countdownInterval: null as NodeJS.Timeout | null,
  }).current;

  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (ENABLE_SOUND && SOUND_PATH) {
      audio.current = new Audio(SOUND_PATH);
      audio.current.preload = 'auto';
    }

    const play = () => audio.current?.play().catch(() => {});

    const clearAll = () => {
      if (state.warningTimer) clearTimeout(state.warningTimer);
      if (state.logoutTimer) clearTimeout(state.logoutTimer);
      if (state.countdownInterval) clearInterval(state.countdownInterval);
      state.warningTimer = state.logoutTimer = state.countdownInterval = null;
      if (Swal.isVisible()) Swal.close();
    };

    const forceLogout = async () => {
      if (state.hasLoggedOut) return;
      state.hasLoggedOut = true;
      clearAll();

      try {
        await logout(true); // This does EVERYTHING correctly:
        // - Calls backend /auth/logout with isAutoLogout=true
        // - Removes token from localStorage
        // - Sets in-memory accessToken = null
      } catch (err) {
        console.error('Idle logout failed:', err);
      }

      toast.warning('Logged out due to inactivity');

      // Full redirect — forces PrivateRoute to re-evaluate token on next mount
      window.location.replace('/login');
    };

    const startCycle = () => {
      // console.log('IDLE TIMER: startCycle called, timeout:', IDLE_TIMEOUT, 'ms');
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
      if (state.hasLoggedOut || state.hasUsedStay || Swal.isVisible()) return;

      play();

      let secondsLeft = Math.ceil(WARNING_TIME / 1000);

      if (!document.getElementById('idle-style')) {
        const s = document.createElement('style');
        s.id = 'idle-style';
        s.textContent = `
          #big-num{font-size:5rem;font-weight:700;color:#EE1D25;
            animation:p 1.4s infinite,g 1.4s infinite alternate}
          @keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
          @keyframes g{0%{text-shadow:0 0 20px #EE1D25}100%{text-shadow:0 0 50px #EE1D25}}
          .swal2-timer-progress-bar{background:#EE1D25!important;height:7px!important}
          .swal2-popup{overflow-x:hidden!important;max-width:420px!important}
          body.swal2-shown{overflow:hidden!important}
        `;
        document.head.appendChild(s);
      }

      Swal.fire({
        title: 'Session Expiring',
        html: `
          <div style="text-align:center;padding:24px 0">
            <div id="big-num">${secondsLeft}</div>
            <p style="margin:16px 0;font-size:1.1rem">
              Auto logout in <strong>${secondsLeft}</strong> seconds<br>
              <small style="color:#666">You have 1 chance to stay logged in</small>
            </p>
          </div>
        `,
        icon: 'warning',
        timer: WARNING_TIME,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: 'Stay Logged In',
        confirmButtonColor: '#EE1D25',
        showCancelButton: true,
        cancelButtonText: 'Logout Now',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          play();
          state.countdownInterval = setInterval(() => {
            secondsLeft--;
            const num = document.getElementById('big-num');
            const strong = document.querySelector(
              '.swal2-html-container strong'
            );
            if (num) num.textContent = secondsLeft.toString();
            if (strong) strong.textContent = secondsLeft.toString();
            if (secondsLeft <= 10 && num) num.style.animationDuration = '0.6s';
          }, 1000);
        },
        willClose: () => {
          if (state.countdownInterval) clearInterval(state.countdownInterval);
          state.countdownInterval = null;
        },
      }).then(result => {
        // If logout already ran (e.g. logoutTimer won the race), do nothing.
        if (state.hasLoggedOut) return;

        if (result.isConfirmed) {
          clearAll();
          state.hasUsedStay = true;
          toast.success('Session extended – next inactivity will log you out');
          startCycle();
        } else {
          // Timer finished, "Logout Now", or other dismiss — always end session.
          // Previously timer dismiss cleared logoutTimer via clearAll() but skipped
          // forceLogout(), leaving the user logged in with no idle timers running.
          forceLogout();
        }
      });
    };

    const onActivity = () => {
      //  console.log('IDLE TIMER: activity detected, resetting timer');
      if (!state.hasLoggedOut && !Swal.isVisible()) {
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
}
