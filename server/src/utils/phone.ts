export function normalizePhoneToE164PH(input: string): string | null {
  if (!input) return null;

  const cleaned = input.replace(/[\s\-()]/g, '');
  if (/^\+639\d{9}$/.test(cleaned)) return cleaned;
  if (/^639\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^09\d{9}$/.test(cleaned)) return `+63${cleaned.slice(1)}`;
  if (/^9\d{9}$/.test(cleaned)) return `+63${cleaned}`;

  return null;
}

export function buildPhoneLookupVariants(normalizedE164: string): string[] {
  if (!/^\+639\d{9}$/.test(normalizedE164)) {
    return [normalizedE164];
  }

  const withoutPlus = normalizedE164.slice(1);
  const local = `0${normalizedE164.slice(3)}`;
  const shortLocal = normalizedE164.slice(3);

  return Array.from(new Set([normalizedE164, withoutPlus, local, shortLocal]));
}
