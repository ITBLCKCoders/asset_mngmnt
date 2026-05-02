/**
 * Central password / bcrypt policy. Import from here instead of hard-coding
 * cost factors per call site (the codebase historically used 10, 12, and 14
 * in different paths — newly registered users were getting weaker hashes
 * than reset passwords).
 *
 * Cost = 12 is OWASP's 2024+ baseline: ~150-300 ms per hash on modern
 * hardware. Strong enough to defend against offline cracking, fast enough
 * not to stall the event loop on cold-start logins. Revisit yearly.
 */
export const BCRYPT_COST = 12;
