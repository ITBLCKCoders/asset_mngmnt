# Phase 1: Server Auth + Repositories Unit Tests

## Overview
Write ~15 new test files for untested server auth modules, key repositories, and remaining services. Follow existing patterns: Jest + ts-jest, mock pool/logger/config, `__mocks__/vonage.cjs` for SMS.

---

## Step 1.1 — Auth Service Tests (8 test files)

### 1a. `server/src/tests/auth/tokens.test.ts`
**Module:** `auth/tokens.ts`
- `generateAccessToken` — returns valid JWT, encodes userId/email/sessionId
- `verifyAccessToken` — decodes valid token, returns null for tampered/expired/different-secret tokens
- `generateRefreshToken` — calls SPs, returns refreshToken + sessionId, logs deleted sessions
- `generateTokens` — returns both tokens, accessToken is decodable
- `refreshSessionTokens` — UPDATE sessions, returns new tokens
- **Mocks:** `db.js` (pool), `logger.js`, `config/validation.js`

### 1b. `server/src/tests/auth/password.test.ts`
**Module:** `auth/password.ts`
- `validatePassword` — tests all policy rules: min length, uppercase, lowercase, numbers, special chars; valid password passes
- `checkPasswordExpiration` — null date = expired, 0 days = never expires, >7 days = OK, <=7 days = expiringSoon, <=0 = expired
- `forgotPassword` (email channel) — user found → OTP sent, user not found → silent message
- `forgotPassword` (sms channel) — SMS sent/fallback
- `verifyPasswordResetOTP` — valid OTP → success + extended, invalid/expired → error
- `resetPassword` — valid token → hash + update + generate new tokens, invalid token → error
- **Mocks:** `db.js` (pool), `logger.js`, `config/validation.js`, `SettingModel`, `email.js`, `sms.js`, `tokens.js`

### 1c. `server/src/tests/auth/session.test.ts`
**Module:** `auth/session.ts`
- `checkInactivity` — no session → true, within timeout → false, exceeded → deletes sessions + audit log
- `updateActivity` — updates last_activity, respects throttle window
- `verifyRefreshToken` — valid session → returns user info, missing session → null, IP/UA mismatch in production → revoked + audit + null
- `revokeRefreshToken` — calls delete SP
- `logout` — calls delete SP by user
- **Mocks:** `db.js` (pool), `logger.js`, `SettingModel`, `utils/audit.js`

### 1d. `server/src/tests/auth/email.test.ts`
**Module:** `auth/email.ts`
- `sendVerificationOTP` — deletes old tokens, inserts new, sends email
- `verifyOTP` — valid OTP → marks verified + returns user, invalid/expired → error
- **Mocks:** `db.js` (pool), `logger.js`, `config/validation.js`, `email.js`

### 1e. `server/src/tests/auth/sms.test.ts`
**Module:** `auth/sms.ts`
- `sendSmsVerification` — dev mode stores code in-memory, vonage mode calls vonage.sms.send
- `checkSmsVerification` — valid code → success, wrong code → error, expired → error, no code → error
- **Mocks:** `logger.js`, `config/validation.js`, `@vonage/server-sdk` (auto-mocked by jest config)

### 1f. `server/src/tests/auth/mfa.test.ts`
**Module:** `auth/mfa.ts`
- `generateTOTPSecret` — generates secret + QR + stores unverified
- `verifyTOTPSetup` — valid token → enables MFA + backup codes, invalid → error, no secret → error
- `verifyTOTP` — valid TOTP → success(method:totp), valid backup code → success(method:backup), invalid → error
- `disableMFA` — correct password → disables + cleans up, wrong password → error
- `isMFAEnabled` — enabled → true, not enabled → false
- `regenerateBackupCodes` — MFA enabled + correct password → new codes, not enabled → error
- `sendMFARecoveryOTP` — inserts recovery token + sends email
- `verifyMFARecoveryOTP` — valid token → success + deletes, invalid → error
- **Mocks:** `db.js` (pool), `logger.js`, `email.js`, `speakeasy`, `qrcode`

### 1g. `server/src/tests/auth/user.test.ts`
**Module:** `auth/user.ts`
- `register` — success creates user, duplicate email/username/employee → error, weak password → error
- `login` — user not found → null, inactive → error, locked → error, wrong password → increments attempts + optional lockout, not verified → error, must change password → tempToken, password expired → tempToken, MFA required → tempToken, success → tokens
- `generatePasswordChangeToken` — returns valid short-lived JWT with type=password_change_temp
- **Mocks:** `db.js` (pool), `logger.js`, `config/validation.js`, `tokens.js`, `password.js`, `SettingModel`, `NotificationService`, `socketManager.js`, `sockets/socketHandlers.js`

### 1h. `server/src/tests/auth/cleanup.test.ts`
**Module:** `auth/cleanup.ts`
- `cleanupExpiredSessions` — calls SP, handles missing procedure gracefully
- **Mocks:** `db.js` (pool), `logger.js`

---

## Step 1.2 — Auth Routes Test (1 test file)

### `server/src/tests/auth/routes.test.ts`
**Module:** `routes/auth.routes.ts` (via supertest)
- Test route registration (/api/auth/*)
- Mock controllers to verify routing + middleware
- **Mocks:** supertest, controller modules

---

## Step 1.3 — Key Repository Tests (3 test files)

### 3a. `server/src/tests/repositories/asset.repository.test.ts`
**Module:** `repositories/asset.repository.ts` (and `AssetRepository.ts`)
- CRUD operations: findById, create, update, delete
- Scope-based filtering (IT/Admin)
- Column-availability fallback
- **Mocks:** `db.js` (pool), `logger.js`

### 3b. `server/src/tests/repositories/accountabilityForm.repository.test.ts`
**Module:** `repositories/accountabilityForm.repository.ts`
- Create/update accountability forms
- Transactional rollback
- Dynamic column checks
- Signature handling
- **Mocks:** `db.js` (pool), `logger.js`

### 3c. `server/src/tests/repositories/user.repository.test.ts`
*(Note: may use UserModel from `models/` instead)*
- findAll, findById, findByEmail
- **Mocks:** model modules, `logger.js`, `utils/audit.js`

---

## Step 1.4 — Remaining Service Tests (5 test files)

### 4a. `server/src/tests/services/asset.service.test.ts`
**Module:** `services/asset.service.ts`
- Asset CRUD orchestration
- Validation + state transitions
- **Mocks:** repositories, `logger.js`

### 4b. `server/src/tests/services/assetAssignment.service.test.ts`
**Module:** `services/assetAssignment.service.ts`
- Assignment lifecycle
- Dynamic room/department creation
- **Mocks:** repositories, `logger.js`

### 4c. `server/src/tests/services/assetBorrowRequests.service.test.ts`
**Module:** `services/assetBorrowRequests.service.ts`
- State machine transitions (pending→approved→active→returned)
- **Mocks:** repositories, `logger.js`

### 4d. `server/src/tests/services/assetTransfer.service.test.ts`
**Module:** `services/assetTransfer.service.ts`
- Transfer lifecycle
- **Mocks:** repositories, `logger.js`

### 4e. `server/src/tests/services/assetReturn.service.test.ts`
**Module:** `services/assetReturn.service.ts`
- Return lifecycle
- **Mocks:** repositories, `logger.js`

---

## Execution Order

1. Step 1.1a (tokens) — no DB mocking needed, simplest
2. Step 1.1c (session) — builds on tokens
3. Step 1.1b (password) — builds on tokens + session
4. Step 1.1d (email) — standalone OTP logic
5. Step 1.1e (sms) — standalone SMS verification
6. Step 1.1f (mfa) — depends on email + sms patterns
7. Step 1.1g (user) — integrates all auth modules
8. Step 1.1h (cleanup) — trivial
9. Step 1.2 (routes) — supertest integration
10. Step 1.3 (repositories) — DB mock patterns
11. Step 1.4 (services) — business logic orchestration

---

## Verification

After each file: `npm run test:unit --workspace=server`
Final verification: `npm run test:server`
