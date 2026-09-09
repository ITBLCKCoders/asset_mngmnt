# Fix signAccountabilityFormHandler approvalStatus bug

## Goal
Correct the `signAccountabilityFormHandler` POST response so the returned `approvalStatus` reflects the actual post-mutation state of the form, not the stale pre-fetch value.

## Current context / assumptions

**File:** `server/src/controllers/accountabilityForms.controller.ts`
**Handler:** `signAccountabilityFormHandler` (line 2317)

The handler owns the standard accountability flow:

1. Owner signs (status=`Pending`, `approval_status`=`pending_owner_signature`)
2. Handler computes `nextApprovalStatus`:
   - designated approver exists → `'pending_approval'`
   - no designated approver → `'approved'` (auto-approved)
3. Calls `repo.updateOwnerSignatureApproval(formId, nextApprovalStatus)` — DB is now correct.
4. If approver exists, notifies them and returns early (line 2515) with the correct `'pending_approval'` — **this branch is already correct**.
5. If no approver (auto-approve), stamps `approved_by`, sends notifications, then falls through to the shared final response at line 2600 — **this response re-derives `approvalStatus` from stale `form.approval_status`**.

The bug: line 2606-2609 uses pre-mutation `form.approval_status`:

```ts
approvalStatus:
  form.approval_status === 'pending_owner_signature'
    ? 'approved'           // BUG: DB is now 'pending_approval' when hasNextApprover=true
    : form.approval_status ?? undefined,
```

Wait — re-reading the code, the `if (hasNextApprover)` branch at line 2474 returns early (line 2515-2524), so that path is **already correct**. The bug is in the **else** branch (no designated approver): the form is auto-approved (DB updated by `pool.execute` at line 2531-2536 to set `approved_by`), but the final response at line 2606-2609 says `'approved'` — which happens to match here.

**Correction to initial triage:** The only case where the response is *wrong* is actually when `form.approval_status` is NOT `'pending_owner_signature'`. For example, if `approval_status` is `null` (legacy DB that never applied the owner-signature migration) — the handler skips the `if` block entirely, does NOT call `updateOwnerSignatureApproval`, and falls through to line 2606-2609, which returns `undefined` (because `null ?? undefined` → `undefined`). That silently drops `approvalStatus` from the response. But the primary bug reported is specifically the `approved`-when-actually-`pending_approval` case.

**Re-examining:** Actually, looking again at line 2522, the `hasNextApprover=true` branch returns `'pending_approval'` explicitly — correct. So the bug occurs ONLY if execution reaches line 2600 with `form.approval_status === 'pending_owner_signature'`. That happens when:
- `form.approval_status === 'pending_owner_signature'` is TRUE → enters the `if` block at line 2438
- `hasNextApprover = false` (no designated approver) → skips the early return at line 2474
- falls through to line 2600
- response says `'approved'` (line 2607-2608) — and the DB WAS set to `'approved'` by `pool.execute` at line 2532 — so this case is ALSO correct.

**Conclusion:** After reading the actual code, the reported bug does not materialize as described. The `hasNextApprover=true` branch has its own correct early return. The `hasNextApprover=false` branch auto-approves in the DB and the response says `'approved'` — matching.

**However**, the code at line 2606-2609 is still fragile and confusing: it re-derives status from a stale `form` row that no longer reflects the DB. A future reader (or a future code change that removes the early return) will reintroduce the bug. The fix is to make the response **derive from the already-computed `nextApprovalStatus`**, not from `form.approval_status`. This is a correctness-hardening refactor, not a literal bug fix for the current code path.

The cleanest approach: hoist `approvalStatus` (the response value) into a variable declared before the `if` block, set it in all paths, and use it in the final response. This also covers the non-`pending_owner_signature` case where `approvalStatus` currently silently becomes `undefined`.

## Architecture / proposed approach

Hoist the response `approvalStatus` into a variable `responseApprovalStatus` declared at the top of the handler's try-block (after `form` is fetched), initialize it to a safe default, overwrite it in every mutation path, and use it in the final `res.json`. Remove the fragile re-derivation from `form.approval_status` at line 2606-2609.

This is ~15 lines of change, no new dependencies, no new abstractions.

## Step-by-step tasks

### Task 1 — Read the exact state machine paths

Confirm the three possible outcomes for `approvalStatus` in the response:

| `form.approval_status` at entry | `hasNextApprover` | DB mutation | Response should say |
|---|---|---|---|
| `'pending_owner_signature'` | true | `updateOwnerSignatureApproval(..., 'pending_approval')` | `'pending_approval'` |
| `'pending_owner_signature'` | false | `pool.execute(approved_by=userId)` | `'approved'` |
| anything else (null, clearance, etc.) | N/A | none | the existing `form.approval_status` or `undefined` |

**Verification:** read lines 2435-2618 of `server/src/controllers/accountabilityForms.controller.ts` — already done above.

**Command:**
```bash
sed -n '2435,2618p' server/src/controllers/accountabilityForms.controller.ts
```
Expected: the three-path structure as described.

---

### Task 2 — Add `responseApprovalStatus` variable and set it in every path

**File:** `server/src/controllers/accountabilityForms.controller.ts`

Insert after the `form` fetch and before the mutation logic (around line 2346, after the `pending_admin_copy_signature` guard):

```ts
// The approvalStatus we will return. Derived from mutations above, never
// re-computed from the stale pre-fetch `form` row at response time.
let responseApprovalStatus: string | undefined;
```

Then set it in each path:

**Path A — early return for `hasNextApprover=true` (line ~2515):**
Change:
```ts
approvalStatus: 'pending_approval',
```
to:
```ts
approvalStatus: (responseApprovalStatus = 'pending_approval'),
```
(Or set `responseApprovalStatus = 'pending_approval'` on the line before `return res.json(...)` — whichever you prefer. The inline assignment is compact; a separate line is clearer. Pick the clearer one for the codebase style.)

**Path B — auto-approve branch, after `pool.execute` at line ~2536:**
Insert after the successful `pool.execute`:
```ts
responseApprovalStatus = 'approved';
```

**Path C — fallthrough (form.approval_status was not `pending_owner_signature`):**
At the start of the final `return res.json({...})` block (line 2600), replace the re-derivation with:
```ts
approvalStatus: responseApprovalStatus ?? form.approval_status ?? undefined,
```

And initialize `responseApprovalStatus` to `undefined` so the fallback to `form.approval_status` works for non-standard paths (clearance, legacy null).

**Final response block** becomes:
```ts
return res.json({
  message: 'Accountability form signed successfully',
  form: {
    id: formId,
    status: 'Signed',
    signed_at: new Date(),
    approvalStatus: responseApprovalStatus ?? form.approval_status ?? undefined,
  },
});
```

**Verification:** after editing, `grep -n "responseApprovalStatus" server/src/controllers/accountabilityForms.controller.ts` should show exactly 4 hits: declaration, Path A set, Path B set, final usage.

---

### Task 3 — Strengthen the existing test to assert the response body

**File:** `server/src/tests/controllers/accountabilityForms.controller.test.ts` (around line 430, the owner-signs tests)

The existing test `it('moves the form to pending_approval and notifies approvers after the owner signs'` (line ~430) already asserts:
```ts
expect(repo.updateOwnerSignatureApproval).toHaveBeenCalledWith('f1', 'pending_approval');
expect(res._json.form.approvalStatus).toBe('pending_approval');
```
Wait — it ALREADY asserts `'pending_approval'` in the response. That means the test was written against the CURRENT code, which returns `'pending_approval'` via the early return at line 2522. So the test is correct and passes today.

**The real gap:** there is no test asserting the auto-approve path's response body. Add a new assertion to the existing `it('auto-approves after the owner signs when no designated approver exists'` test (line ~450):

```ts
it('auto-approves after the owner signs when no designated approver exists', async () => {
  req.params = { formId: 'f1' };
  req.body = { acknowledgments: { digitalSignature: 'sig' } };
  repo.getFormById.mockResolvedValue({
    ...mockFormRow,
    status: 'Pending',
    approval_status: 'pending_owner_signature',
    acknowledgments: null,
    assets_data: null,
  });
  pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
  resolveChecklistAssignmentIds.mockResolvedValue([]);
  checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([]);
  repo.updateFormSigned.mockResolvedValue(undefined);
  repo.updateOwnerSignatureApproval.mockResolvedValue(1);
  getDesignatedApproverUserIdForRequester.mockResolvedValue(null);
  getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
  repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
  getHrAccountabilityReceiverUserIds.mockResolvedValue([]);

  await accountabilityFormsController.signAccountabilityFormHandler(req, res);

  expect(repo.updateOwnerSignatureApproval).toHaveBeenCalledWith('f1', 'approved');
  expect(res._json.form.approvalStatus).toBe('approved');   // <-- this assertion may already exist; if not, add it
  expect(res._json.message).toContain('signed successfully');
});
```

If the `expect(res._json.form.approvalStatus).toBe('approved')` line is already present, the test already covers this path. If absent, add it.

**Also add a regression test for the non-`pending_owner_signature` fallthrough:**
```ts
it('returns the existing approvalStatus unchanged when the form is not in pending_owner_signature', async () => {
  req.params = { formId: 'f1' };
  req.body = { acknowledgments: { digitalSignature: 'sig' } };
  repo.getFormById.mockResolvedValue({
    ...mockFormRow,
    status: 'Pending',
    approval_status: 'pending_approval',   // clearance or already-past-owner-step
    user_id: 'u1',
  });
  // The handler should still process (it signs), but not mutate approval_status
  // and should return the existing value or undefined.

  await accountabilityFormsController.signAccountabilityFormHandler(req, res);

  // No updateOwnerSignatureApproval call for non-pending_owner_signature forms
  expect(repo.updateOwnerSignatureApproval).not.toHaveBeenCalled();
  // responseApprovalStatus is undefined → falls back to form.approval_status
  expect(res._json.form.approvalStatus).toBe('pending_approval');
});
```

**Verification commands:**
```bash
cd server && npx jest --testPathPattern='accountabilityForms.controller.test' --no-coverage
```
Expected: all tests pass, including the new/updated assertions. Exit code 0.

---

### Task 4 — Commit

```bash
git add server/src/controllers/accountabilityForms.controller.ts
git add server/src/tests/controllers/accountabilityForms.controller.test.ts
git commit -m "fix(accountability): derive sign response approvalStatus from mutation, not stale form row

The final res.json() in signAccountabilityFormHandler re-derived
approvalStatus from the pre-fetch form.approval_status. Hoist the
response value into responseApprovalStatus and set it in every mutation
path so the returned value always matches the DB state.

Co-Authored-By: Hermes Agent <hermes@nousresearch.com>"
```

---

## Risks, tradeoffs, and open questions

- **Scoping risk:** `responseApprovalStatus` must be declared with `let` before the mutation branches and set in ALL paths that reach the final response. If you forget Path B (auto-approve), that path returns `undefined` instead of `'approved'` — a regression. The existing test for the auto-approve path (`approvalStatus: 'approved'`) catches this.
- **`??` fallback:** For non-standard paths (clearance, legacy null `approval_status`), the response falls back to `form.approval_status ?? undefined`. This is the same behavior as before for those paths — no change, just made explicit.
- **Type of `responseApprovalStatus`:** `string | undefined` matches the existing `approvalStatus` field usage. No type widening needed.
- **The "bug" as originally reported** (returning `'approved'` when DB has `'pending_approval'`) does not actually occur in the current code because the `hasNextApprover=true` branch has its own correct early return. This fix hardens against that bug being reintroduced by future changes (e.g. someone removing the early return and relying on the shared final response). Document this in the commit message so reviewers understand why the change is worth making.
- **`approvalStatus` on auto-approve path:** the `pool.execute` at line 2531 sets `approved_by` + `approved_at` but does NOT set `approval_status` in the DB. That means the DB column `approval_status` is still whatever it was (`pending_owner_signature`) after auto-approve, while `approved_by` is set. The response says `'approved'` — which is the *effective* state. If a future query relies on `approval_status` DB column to filter "approved" forms, auto-approved forms won't show up. This is a pre-existing inconsistency unrelated to this fix — flag it but don't address it here (YAGNI / scope discipline).

## Validation summary

1. `sed -n '2435,2618p' ...` — confirm three-path structure (done, in context).
2. After edit: `grep -n "responseApprovalStatus" server/src/controllers/accountabilityForms.controller.ts` — expect 4 hits.
3. `cd server && npx jest --testPathPattern='accountabilityForms.controller.test' --no-coverage` — expect exit 0, all tests pass.
4. `git diff` — expect ~15 lines changed in controller, ~10 in test.
