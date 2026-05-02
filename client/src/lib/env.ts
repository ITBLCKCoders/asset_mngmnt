/**
 * Central env access so Jest can replace with a stub (no import.meta in stub).
 */
export function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_BASE || '/api';
}
