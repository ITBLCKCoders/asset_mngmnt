# Asset Management System — Activity Log

**Project:** Asset Management System  
**Period:** June 22 – July 5, 2026 (weekdays only)  
**Hours:** 8 hours per day (08:00 – 16:00 UTC+8)  

---

### Monday, June 22, 2026

*Theme: Asset assignment search — include asset description in issuance search*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:20 | 20 min | Reviewed asset assignment issuance page search behavior and existing filter fields |
| 08:20 | 08:45 | 25 min | Analyzed how asset code and name matching works in assetsIssuance.tsx |
| 08:45 | 09:15 | 30 min | Extended search filter logic to include asset description field |
| 09:15 | 09:50 | 35 min | Updated assetsIssuance.tsx search predicate to match description text |
| 09:50 | 10:20 | 30 min | Tested search with sample assets containing description keywords |
| 10:20 | 10:45 | 25 min | Verified case-insensitive matching for description search terms |
| 10:45 | 11:20 | 35 min | Checked search behavior when description is empty or null |
| 11:20 | 11:50 | 30 min | Validated search results update on keystroke without page reload |
| 11:50 | 12:10 | 20 min | Confirmed IT asset tab search includes description after change |
| 12:10 | 12:45 | 35 min | Verified Admin asset tab search includes description consistently |
| 12:45 | 13:15 | 30 min | Tested combined search across code, name, and description fields |
| 13:15 | 13:45 | 30 min | Reviewed edge cases for partial word matches in description |
| 13:45 | 14:20 | 35 min | Smoke-tested asset assignment flow end-to-end with new search |
| 14:20 | 14:50 | 30 min | Documented search field coverage for asset issuance page |
| 14:50 | 15:25 | 35 min | Committed asset assignment description search enhancement |
| 15:25 | 16:00 | 35 min | Prepared handoff notes on issuance search filter changes |
| **Total** | **16:00** | **8h 00m** | |

### Tuesday, June 23, 2026

*Theme: Client unit tests, E2E Playwright setup, login/registration UI/UX*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:25 | 25 min | Set up client unit test scaffolding for route guard components |
| 08:25 | 08:55 | 30 min | Wrote tests for PrivateRoute, PublicRoute, and PermissionRoute wrappers |
| 08:55 | 09:25 | 30 min | Added VerifyOtpRoute and LandingRedirect component test coverage |
| 09:25 | 09:55 | 30 min | Created unit tests for PageHeader, ErrorBoundary, and PdfPreviewModal |
| 09:55 | 10:30 | 35 min | Wrote hook tests for useDepartments, usePositions, and useIdleTimer |
| 10:30 | 10:55 | 25 min | Added useDelayedLoading and useAuditFieldLookups hook test cases |
| 10:55 | 11:25 | 30 min | Wrote useAssetAssignmentNotifications hook test coverage |
| 11:25 | 12:00 | 35 min | Created lib utility tests for currency, env, logger, and assetScope |
| 12:00 | 12:20 | 20 min | Added PDF generator unit tests for borrow, return, transfer, and checklist |
| 12:20 | 12:50 | 30 min | Refactored registration.tsx form layout and validation flow |
| 12:50 | 13:25 | 35 min | Simplified login.tsx UI and improved error display handling |
| 13:25 | 13:50 | 25 min | Updated ConfirmationModal component styling and button behavior |
| 13:50 | 14:20 | 30 min | Set up Playwright E2E fixtures and seed data for asset flows |
| 14:20 | 14:55 | 35 min | Wrote E2E specs for asset-assignment, asset-list, and protected routes |
| 14:55 | 15:25 | 30 min | Added E2E tests for auth MFA, password reset, and navigation |
| 15:25 | 16:00 | 35 min | Ran client test suite and fixed failing assertions |
| **Total** | **16:00** | **8h 00m** | |

### Wednesday, June 24, 2026

*Theme: Server middleware tests (CORS, rate limiters, permissions, file magic bytes)*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:30 | 30 min | Reviewed server middleware stack and test coverage gaps |
| 08:30 | 08:55 | 25 min | Wrote corsPolicy middleware unit tests with allowed origin scenarios |
| 08:55 | 09:30 | 35 min | Added originCheck middleware tests for blocked and permitted requests |
| 09:30 | 09:50 | 20 min | Created rateLimiters middleware test cases for throttle behavior |
| 09:50 | 10:20 | 30 min | Wrote requirePermission middleware tests for missing and valid permissions |
| 10:20 | 10:55 | 35 min | Added requireRole middleware tests for role-based access control |
| 10:55 | 11:20 | 25 min | Created verifyFileMagicBytes tests for upload validation |
| 11:20 | 11:50 | 30 min | Wrote enhancedErrorHandling middleware test coverage |
| 11:50 | 12:25 | 35 min | Updated corsPolicy.ts to handle edge-case origin header formats |
| 12:25 | 12:45 | 20 min | Tested CORS preflight OPTIONS requests against middleware chain |
| 12:45 | 13:15 | 30 min | Verified rate limiter resets after window expiry in tests |
| 13:15 | 13:50 | 35 min | Ran server middleware test suite and resolved mock setup issues |
| 13:50 | 14:20 | 30 min | Reviewed middleware execution order in index.ts route mounting |
| 14:20 | 14:45 | 25 min | Documented middleware test patterns for future contributors |
| 14:45 | 15:20 | 35 min | Fixed flaky test timing in rateLimiter mock assertions |
| 15:20 | 16:00 | 40 min | Committed server middleware test expansion |
| **Total** | **16:00** | **8h 00m** | |

### Thursday, June 25, 2026

*Theme: Repository and service unit tests (assignments, transfers, returns, gate pass)*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:25 | 25 min | Reviewed repository layer test coverage for asset operations |
| 08:25 | 08:55 | 30 min | Wrote assetAssignment.repository.test.ts with assign and list cases |
| 08:55 | 09:30 | 35 min | Added assetTransferForm.repository.test.ts for transfer CRUD operations |
| 09:30 | 09:55 | 25 min | Created assetReturn.repository.test.ts for return request persistence |
| 09:55 | 10:25 | 30 min | Wrote gatePass.repository.test.ts for gate pass record queries |
| 10:25 | 10:55 | 30 min | Added assetChecklist.repository and assetChecklistList repository tests |
| 10:55 | 11:30 | 35 min | Created accountabilityForm.repository.test.ts for form data retrieval |
| 11:30 | 11:50 | 20 min | Wrote intangibleAssets.repository.test.ts for intangible asset queries |
| 11:50 | 12:25 | 35 min | Added assetBorrowRequests.service.test.ts for borrow approval flow |
| 12:25 | 12:55 | 30 min | Wrote assetRequest.service.test.ts for request lifecycle handling |
| 12:55 | 13:20 | 25 min | Created assetTransfer.service.test.ts for transfer business rules |
| 13:20 | 13:55 | 35 min | Added notification.service.test.ts for assignment notification triggers |
| 13:55 | 14:25 | 30 min | Wrote role.service.test.ts and setting.service.test.ts coverage |
| 14:25 | 15:00 | 35 min | Ran repository test suite and fixed SQL mock parameter mismatches |
| 15:00 | 15:25 | 25 min | Reviewed service-to-repository call patterns for consistency |
| 15:25 | 16:00 | 35 min | Committed repository and service unit test batch |
| **Total** | **16:00** | **8h 00m** | |

### Friday, June 26, 2026

*Theme: Asset builder controller, accountability form DB fix script, PDF generator tests*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:35 | 35 min | Implemented assetBuilders.controller.ts CRUD handlers for builder records |
| 08:35 | 09:00 | 25 min | Added validation and error responses in builder create/update endpoints |
| 09:00 | 09:30 | 30 min | Wrote builder controller integration with assetBuilder repository |
| 09:30 | 10:00 | 30 min | Created db/fix_builder_accountability.sql migration for orphaned records |
| 10:00 | 10:25 | 25 min | Tested accountability form linkage after builder migration script |
| 10:25 | 11:00 | 35 min | Added accountabilityForm.service.test.ts for form merge and status logic |
| 11:00 | 11:30 | 30 min | Wrote accountabilityFormAssetsData utility tests for JSON parsing |
| 11:30 | 11:50 | 20 min | Created accountabilityFormOnReturn utility tests for return side effects |
| 11:50 | 12:25 | 35 min | Added returnAssignmentSideEffects.test.ts for assignment cleanup |
| 12:25 | 12:55 | 30 min | Wrote approverNotifications.test.ts for notification routing |
| 12:55 | 13:20 | 25 min | Extended E2E seed.sql with builder and accountability test fixtures |
| 13:20 | 13:50 | 30 min | Added E2E helpers for form submission in e2e/helpers/forms.ts |
| 13:50 | 14:25 | 35 min | Wrote E2E specs for accountability-form, transfer-form, and return-form |
| 14:25 | 14:55 | 30 min | Ran E2E asset flow tests and fixed selector timing issues |
| 14:55 | 15:30 | 35 min | Reviewed asset builder edit flow in assetBuilder.tsx for regressions |
| 15:30 | 16:00 | 30 min | Committed asset builder controller and accountability DB fix |
| **Total** | **16:00** | **8h 00m** | |

### Monday, June 29, 2026

*Theme: Intangible asset edit/assign bug fixes, location and active-company scoping*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:20 | 20 min | Investigated intangible asset edit form not saving location changes |
| 08:20 | 08:55 | 35 min | Debugged active company filter excluding intangible assets from list |
| 08:55 | 09:25 | 30 min | Fixed location repository query to respect active company context |
| 09:25 | 09:50 | 25 min | Updated intangible asset edit handler to validate company scope |
| 09:50 | 10:25 | 35 min | Resolved intangible asset assignment failing on missing department |
| 10:25 | 10:55 | 30 min | Tested intangible asset assign flow with multiple department options |
| 10:55 | 11:15 | 20 min | Fixed active company error on location dropdown in asset forms |
| 11:15 | 11:50 | 35 min | Reviewed sp_get_locations stored procedure company filter logic |
| 11:50 | 12:20 | 30 min | Updated client location selector to pass active company ID |
| 12:20 | 12:45 | 25 min | Verified intangible asset list refreshes after edit and assign |
| 12:45 | 13:20 | 35 min | Wrote regression test for intangible asset edit with location change |
| 13:20 | 13:50 | 30 min | Tested cross-company intangible asset visibility restrictions |
| 13:50 | 14:15 | 25 min | Reviewed assetAssignment.repository.ts assign method constraints |
| 14:15 | 14:50 | 35 min | Smoke-tested intangible asset tab in AssetsPage after fixes |
| 14:50 | 15:20 | 30 min | Documented active company scoping rules for intangible assets |
| 15:20 | 16:00 | 40 min | Committed intangible asset edit and location scoping fixes |
| **Total** | **16:00** | **8h 00m** | |

### Tuesday, June 30, 2026

*Theme: Accountability form department field, registration flow, positions fix*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:30 | 30 min | Debugged accountability form department field not populating on load |
| 08:30 | 09:00 | 30 min | Fixed department JSON parsing in accountabilityForm.tsx table rows |
| 09:00 | 09:25 | 25 min | Updated accountability form preview to display department name correctly |
| 09:25 | 10:00 | 35 min | Resolved asset accountability form dept mismatch on PDF export |
| 10:00 | 10:30 | 30 min | Reviewed registration.tsx multi-step form state management |
| 10:30 | 11:05 | 35 min | Fixed registration validation errors on company and position fields |
| 11:05 | 11:25 | 20 min | Simplified registration form field layout and error messaging |
| 11:25 | 11:55 | 30 min | Debugged positions dropdown returning stale data after company switch |
| 11:55 | 12:30 | 35 min | Fixed positions API query to filter by selected company ID |
| 12:30 | 12:55 | 25 min | Updated usePositions hook to refetch on company context change |
| 12:55 | 13:30 | 35 min | Tested registration flow from signup through email verification |
| 13:30 | 14:00 | 30 min | Verified position selection persists through registration steps |
| 14:00 | 14:25 | 25 min | Wrote formBatchOrgFilters.test.ts for org filter utility coverage |
| 14:25 | 15:00 | 35 min | Ran registration and accountability form manual QA pass |
| 15:00 | 15:30 | 30 min | Reviewed audit log entries for accountability form department changes |
| 15:30 | 16:00 | 30 min | Committed accountability dept, registration, and positions fixes |
| **Total** | **16:00** | **8h 00m** | |

### Wednesday, July 1, 2026

*Theme: Asset list visibility — company/scope alignment, builder IT/Admin scope*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:25 | 25 min | Investigated newly created assets not appearing in IT/Admin asset lists |
| 08:25 | 09:00 | 35 min | Traced create-to-list flow through assets.controller and asset.repository |
| 09:00 | 09:30 | 30 min | Fixed createAssetHandler company ID validation and default scoping |
| 09:30 | 09:55 | 25 min | Updated getUserRoleById to return manager_role for list scoping |
| 09:55 | 10:25 | 30 min | Aligned AddAssetModal company default with active company context |
| 10:25 | 11:00 | 35 min | Passed current tab scope (IT/Admin) from AssetsPage to asset modal |
| 11:00 | 11:30 | 30 min | Replaced unsafe department JSON.parse in useAssetsData.ts mapping |
| 11:30 | 11:50 | 20 min | Fixed builder scope filter for IT asset vs Admin asset categories |
| 11:50 | 12:25 | 35 min | Tested asset creation from IT tab appears in IT list immediately |
| 12:25 | 12:55 | 30 min | Tested asset creation from Admin tab appears in Admin list |
| 12:55 | 13:20 | 25 min | Verified company switch updates asset list without stale rows |
| 13:20 | 13:55 | 35 min | Wrote activeCompany.test.ts utility coverage for company resolution |
| 13:55 | 14:25 | 30 min | Added computerTypeAsset.test.ts for asset type classification |
| 14:25 | 15:00 | 35 min | Ran asset list visibility regression tests across both tabs |
| 15:00 | 15:25 | 25 min | Documented company/scope alignment rules for asset create and list |
| 15:25 | 16:00 | 35 min | Committed asset list visibility and builder scope fixes |
| **Total** | **16:00** | **8h 00m** | |

### Thursday, July 2, 2026

*Theme: Transfer and return flow hardening, audit/notification utility tests*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:30 | 30 min | Reviewed asset transfer request flow from form submit to approval |
| 08:30 | 08:55 | 25 min | Debugged transfer form status transitions in transferFormStatus utility |
| 08:55 | 09:30 | 35 min | Fixed transfer assignment side effects on approval completion |
| 09:30 | 10:00 | 30 min | Hardened return request flow status handling and validation |
| 10:00 | 10:25 | 25 min | Updated assetReturns.controller error responses for invalid states |
| 10:25 | 11:00 | 35 min | Fixed assetTransfers.controller permission checks on approve action |
| 11:00 | 11:30 | 30 min | Wrote transferFormStatus.test.ts for status transition matrix |
| 11:30 | 11:50 | 20 min | Added audit.test.ts coverage for audit log field redaction |
| 11:50 | 12:25 | 35 min | Created redact.test.ts for sensitive data masking in logs |
| 12:25 | 12:55 | 30 min | Wrote dtoTransformers.test.ts for request/response shape mapping |
| 12:55 | 13:20 | 25 min | Added validationSchemas.test.ts for Zod schema edge cases |
| 13:20 | 13:50 | 30 min | Tested transfer OTP flow matches existing approval pattern |
| 13:50 | 14:25 | 35 min | Verified return checklist integration after return approval |
| 14:25 | 15:00 | 35 min | Ran transfer and return E2E specs and fixed flaky waits |
| 15:00 | 15:25 | 25 min | Reviewed audit trail entries for transfer and return operations |
| 15:25 | 16:00 | 35 min | Committed transfer/return flow hardening and utility tests |
| **Total** | **16:00** | **8h 00m** | |

### Friday, July 3, 2026

*Theme: E2E specs (borrow, transfer, return, assignment), query optimizer tests*

| Start | End | Duration | Activity |
|-------|-----|----------|----------|
| 08:00 | 08:35 | 35 min | Expanded E2E test-data.ts fixtures with borrow and transfer scenarios |
| 08:35 | 08:55 | 20 min | Wrote asset-borrow.spec.ts Playwright spec for borrow request flow |
| 08:55 | 09:25 | 30 min | Added asset-transfer.spec.ts E2E coverage for transfer approval |
| 09:25 | 10:00 | 35 min | Created asset-return.spec.ts E2E spec for return gate pass flow |
| 10:00 | 10:25 | 25 min | Updated asset-assignment.spec.ts with description search assertions |
| 10:25 | 10:55 | 30 min | Extended dashboard.spec.ts with asset count widget checks |
| 10:55 | 11:30 | 35 min | Wrote queryOptimizer.test.ts for SQL query batching and caching |
| 11:30 | 12:00 | 30 min | Added phone.test.ts utility coverage for phone number formatting |
| 12:00 | 12:20 | 20 min | Created auditFieldLabels.test.ts for audit display label mapping |
| 12:20 | 12:55 | 35 min | Ran full E2E suite against local dev environment |
| 12:55 | 13:25 | 30 min | Fixed E2E seed data foreign key constraints for test isolation |
| 13:25 | 13:50 | 25 min | Updated e2e/fixtures/seed.sql with additional test users and assets |
| 13:50 | 14:25 | 35 min | Reviewed Playwright report for failed specs and fixed selectors |
| 14:25 | 14:55 | 30 min | Ran server unit test suite for final regression pass |
| 14:55 | 15:25 | 30 min | Documented E2E test setup and seed data refresh procedure |
| 15:25 | 16:00 | 35 min | Committed E2E spec expansion and query optimizer tests |
| **Total** | **16:00** | **8h 00m** | |

---

**Summary:** 10 weekdays × 8 hours = **80 hours total**
