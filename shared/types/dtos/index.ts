/**
 * Shared DTOs barrel.
 *
 * Per-domain DTO files live alongside this barrel:
 *   - asset.dtos        — assets, locations, categories, types, suppliers,
 *                         brands, asset documents, accountability-form
 *                         summaries, audit-log filters
 *   - organization.dtos — users, roles, departments, companies (incl
 *                         ActiveCompany), positions, user permissions
 *   - auth.dtos         — login, register, OTP / password flows, MFA
 *   - audit.dtos        — audit-log responses, settings
 *
 * Existing call sites import from `shared/types/dtos` (or via the
 * `shared/types` barrel) and continue to work unchanged.
 */
export * from './asset.dtos';
export * from './organization.dtos';
export * from './auth.dtos';
export * from './audit.dtos';
