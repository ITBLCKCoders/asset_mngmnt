'use client';

import { useEffect, useRef } from 'react';
/** USB scanners on long QR URLs can pause briefly between character bursts. */
const SCAN_CHAR_GAP_MS = 300;
const SCAN_COMPLETE_IDLE_MS = 200;

function looksLikeIncompleteScan(buffer: string): boolean {
  return /https?:\/\/|:\/\/|\/assets\/details\/|assets\/details\/|details\//i.test(buffer);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useBarcodeScanner(onScan: (code: string) => void) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  const bufferRef = useRef('');
  const timerRef = useRef<number | undefined>(undefined);
  const lastKeyAtRef = useRef(0);

  useEffect(() => {
    const flush = () => {
      const raw = bufferRef.current.trim();
      bufferRef.current = '';
      window.clearTimeout(timerRef.current);
      if (raw) {
        onScanRef.current(raw);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Shift' || e.key === 'CapsLock') return;
      if (e.key.length > 1 && e.key.startsWith('F') && e.key.length <= 3) return;

      const now = Date.now();
      if (
        bufferRef.current &&
        now - lastKeyAtRef.current > SCAN_CHAR_GAP_MS &&
        !looksLikeIncompleteScan(bufferRef.current)
      ) {
        bufferRef.current = '';
      }
      lastKeyAtRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        flush();
        return;
      }

      if (e.key.length !== 1) return;

      bufferRef.current += e.key;

      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, SCAN_COMPLETE_IDLE_MS);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timerRef.current);
    };
  }, []);
}
