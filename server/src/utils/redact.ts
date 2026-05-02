/**
 * Tiny redaction helpers for log output. The goal is to keep enough of an
 * identifier to be useful when reading logs in an incident, but not enough to
 * leak PII or credentials if the log file is shared or shipped to a 3rd-party
 * aggregator.
 */

/** `john.doe@example.com` → `j***@example.com`. */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '<empty>';
  const at = email.indexOf('@');
  if (at <= 0) return '<invalid>';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local[0] ?? ''}***${domain}`;
}

/** `+639171234567` → `+63***4567`. Keeps country code + last 4. */
export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '<empty>';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length <= 5) return '<short>';
  const head = digits.startsWith('+') ? digits.slice(0, 3) : digits.slice(0, 2);
  const tail = digits.slice(-4);
  return `${head}***${tail}`;
}

/** First 4 chars of any opaque token / id, with an ellipsis. */
export function redactToken(value: string | null | undefined): string {
  if (!value) return '<empty>';
  return `${value.slice(0, 4)}…`;
}
