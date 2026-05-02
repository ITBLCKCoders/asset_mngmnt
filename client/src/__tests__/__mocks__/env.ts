export function getApiBase(): string {
  return (
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE) || '/api'
  );
}
