'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';

const TOUR_KEY = 'initials-tour-active';
const TOUR_STEP_KEY = 'initials-tour-step';

function isTourActive(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('tour') === 'initials' && localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

function clearTourState(navigate?: (path: string, opts?: any) => void, searchParams?: URLSearchParams) {
  try {
    localStorage.removeItem(TOUR_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
  } catch {}
  if (navigate && searchParams) {
    const next = new URLSearchParams(searchParams);
    if (next.has('tour')) {
      next.delete('tour');
      const qs = next.toString();
      navigate(`/profile${qs ? `?${qs}` : '?tab=basic'}`, { replace: true });
    }
  }
}

function getDriverSteps() {
  return [
    {
      element: '#tour-step-1-edit-profile',
      popover: {
        title: 'Step 1 — Edit Profile',
        description: 'Click <b>Edit Profile</b> to start adding your digital initials.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '#tour-step-2-canvas',
      popover: {
        title: 'Step 2 — Draw your digital initials',
        description: 'Use your mouse or touchscreen to draw your initials inside the canvas.',
        side: 'top' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#tour-step-3-mark-done',
      popover: {
        title: 'Step 3 — Mark as Complete',
        description: 'Once you are happy with your drawing, click <b>Mark as Done</b>.',
        side: 'top' as const,
        align: 'end' as const,
      },
    },
    {
      element: '#tour-step-4-save-profile',
      popover: {
        title: 'Step 4 — Save Profile',
        description: 'Click <b>Save Changes</b> at the top of the profile card to proceed to confirmation.',
        side: 'bottom' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#tour-step-5-confirm-save',
      popover: {
        title: 'Step 5 — Confirm Save',
        description: 'Click <b>Yes, Save Changes</b> in the confirmation dialog.',
        side: 'bottom' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#tour-step-6-agree-save',
      popover: {
        title: 'Step 6 — I Agree & Save Initials',
        description:
          '<b>Please check all the checkboxes and make sure you read all of it.</b><br/>Read each consent statement, check all boxes, then click <b>I Agree & Save Initials</b>. You can also <a href="/user-manual?section=digital-initials" target="_blank" rel="noopener" style="color:#dc2626;text-decoration:underline">visit the user manual to follow the guide</a>.',
        side: 'top' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#tour-step-7-verify-otp',
      popover: {
        title: 'Step 7 — Verify OTP',
        description:
          '<b>Check your email for the OTP code.</b><br/>Enter the 6-digit code sent to your registered mobile number and click <b>Verify</b> to complete setup.',
        side: 'top' as const,
        align: 'center' as const,
      },
    },
  ];
}

function isElementVisible(selector: string): boolean {
  try {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  } catch { return false; }
}

function waitForElement(selector: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise(resolve => {
    if (isElementVisible(selector)) return resolve(true);
    let elapsed = 0;
    const iv = window.setInterval(() => {
      elapsed += 100;
      if (isElementVisible(selector)) { window.clearInterval(iv); resolve(true); }
      else if (elapsed >= timeoutMs) { window.clearInterval(iv); resolve(false); }
    }, 100);
  });
}

// Module-level singleton so multiple hook users share one driver
let singletonDriver: Driver | null = null;
let singletonStarted = false;

export function tourMoveNext() {
  try {
    const d: any = singletonDriver;
    if (!d) return;
    if (typeof (window as any).__tourMoveNextLocal === 'function') (window as any).__tourMoveNextLocal();
    if (d.isActive && d.isActive()) d.moveNext();
    else if (d.moveNext) d.moveNext();
  } catch {}
}

export async function tourMoveNextWhenReady(nextSelector?: string) {
  if (nextSelector) {
    const ok = await waitForElement(nextSelector, 2500);
    if (!ok) {
      // element still not visible — scroll top/canvas area into view and retry once
      try { document.querySelector(nextSelector)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      await new Promise(r => window.setTimeout(r, 400));
    }
    // small settle for Radix dialog animation (200ms) + driver stage
    await new Promise(r => window.setTimeout(r, 120));
  }
  tourMoveNext();
}
if (typeof window !== 'undefined') (window as any).tourMoveNextWhenReady = tourMoveNextWhenReady;
export function tourDestroy() {
  try { singletonDriver?.destroy(); } catch {}
  singletonDriver = null;
  singletonStarted = false;
  try {
    localStorage.removeItem(TOUR_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tour') === 'initials') {
      url.searchParams.delete('tour');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {}
}
// Expose global for basicInfoTab without hook import coupling
if (typeof window !== 'undefined') (window as any).tourMoveNext = tourMoveNext;

export function useDigitalInitialsTour() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);

  const destroyTour = useCallback(() => {
    try {
      driverRef.current?.destroy();
    } catch {}
    try { singletonDriver?.destroy(); } catch {}
    singletonDriver = null;
    singletonStarted = false;
    driverRef.current = null;
    clearTourState(navigate as any, searchParams as any);
  }, [navigate, searchParams]);

  const moveNext = useCallback(() => {
    try {
      const d: any = driverRef.current || singletonDriver;
      // mirror to window helper
      (window as any).__tourMoveNextLocal = () => {
        try { (d as any)?.moveNext?.(); } catch {}
      };
      if (!d) return;
      if (d.isActive && d.isActive()) d.moveNext();
      else if (d.moveNext) d.moveNext();
    } catch {}
  }, []);

  // Persist current step index for resume after refresh
  const persistStep = useCallback((idx: number) => {
    try {
      sessionStorage.setItem(TOUR_STEP_KEY, String(idx));
    } catch {}
  }, []);

  useEffect(() => {
    if (startedRef.current || singletonStarted) return;
    if (!isTourActive()) return;

    // Small delay to let Profile page mount (tabs, header, canvas)
    const t = window.setTimeout(async () => {
      if (startedRef.current || singletonStarted) return;
      const steps = getDriverSteps();

      // Resume index if we reloaded mid-tour — but validate element for that step is actually visible
      let startAt = 0;
      try {
        const saved = sessionStorage.getItem(TOUR_STEP_KEY);
        if (saved) {
          const n = Number(saved);
          if (!Number.isNaN(n) && n >= 0 && n < steps.length) startAt = n;
        }
        // If resuming mid-tour but Save-related steps require editing, reset if not editing
        if (startAt >= 3) {
          const isEditingNow = !!document.getElementById('tour-step-4-save-profile');
          if (!isEditingNow) startAt = 0;
        }
      } catch {}
      // Ensure first element is visible before driving
      const firstSel = (steps[startAt] as any)?.element as string | undefined;
      if (firstSel) await waitForElement(firstSel, 2000);

      const d = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        allowClose: true,
        overlayColor: 'rgba(0,0,0,0.65)',
        stagePadding: 10,
        smoothScroll: true,
        animate: true,
        allowKeyboardControl: true,
        disableActiveInteraction: false,
        popoverClass: 'digital-initials-tour-popover',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done ✓',
        progressText: 'Step {{current}} of {{total}}',
        onHighlightStarted: (_el: any, step: any, opts: any) => {
          const idx = (opts as any)?.state?.activeIndex ?? 0;
          persistStep(idx);
          // Let driver handle smoothScroll; add a gentle ensure-visible as fallback
          try {
            const sel = (step as any).element;
            const node = typeof sel === 'string' ? document.querySelector(sel) : sel;
            // Defer to next frame so driver has measured rect
            window.requestAnimationFrame(() => {
              try { (node as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch {}
            });
          } catch {}
        },
        onHighlighted: (_el: any, step: any) => {
          // Refresh stage after scroll/animation settle — fixes "highlight in wrong place"
          window.setTimeout(() => {
            try {
              // driver.js exposes refresh() in some builds
              const anyD: any = d as any;
              if (typeof anyD.refresh === 'function') anyD.refresh();
              else if (typeof anyD.redraw === 'function') anyD.redraw();
            } catch {}
          }, 250);
        },
        onDestroyed: () => {
          // Only clear if user explicitly closed via driver close/Esc/overlay — keep if we programatically moveNext to end?
          // For skip we clear. For completion the Verify button's handler also clears.
          // Detect if last step was reached: if saved index == last, clear permanently
          try {
            const lastIdx = steps.length - 1;
            const saved = Number(sessionStorage.getItem(TOUR_STEP_KEY) ?? '-1');
            // If destroyed not via our destroyTour wrapper, still clean up localStorage so tour doesn't restart
            if (saved >= lastIdx || saved === -1) {
              localStorage.removeItem(TOUR_KEY);
              sessionStorage.removeItem(TOUR_STEP_KEY);
              // remove ?tour param without navigation loop — schedule
              window.setTimeout(() => {
                try {
                  const url = new URL(window.location.href);
                  if (url.searchParams.get('tour') === 'initials') {
                    url.searchParams.delete('tour');
                    window.history.replaceState({}, '', url.toString());
                  }
                } catch {}
              }, 0);
            }
          } catch {}
        },
        steps,
      } as any);

      driverRef.current = d;
      singletonDriver = d;
      singletonStarted = true;
      (window as any).__tourMoveNextLocal = () => { try { (d as any).moveNext(); } catch {} };
      (window as any).tourMoveNext = tourMoveNext;

      // Handle overlay click / Esc as Skip (destroy clears state)
      // driver.js already closes on Esc/overlay when allowClose=true, onDestroyed handles cleanup.

      // Start at persisted index
      (d as any).drive(startAt);
      startedRef.current = true;

      // Custom footer: add "Skip tour" link + manual link inside popover title area would require DOM injection.
      // Instead we rely on driver's Close button as Skip. Optionally inject a small skip handler.
      // Inject "Visit manual" link into first popover description already contains <a>.
    }, 600);

    return () => window.clearTimeout(t);
  }, [searchParams, persistStep]);

  // Also listen to tour param removal to destroy if user navigates away
  useEffect(() => {
    if (!isTourActive() && (driverRef.current || singletonDriver)) {
      try { driverRef.current?.destroy(); } catch {}
      try { singletonDriver?.destroy(); } catch {}
      driverRef.current = null;
      singletonDriver = null;
      startedRef.current = false;
      singletonStarted = false;
    }
  }, [searchParams]);

  return { destroyTour, moveNext, driverRef };
}
