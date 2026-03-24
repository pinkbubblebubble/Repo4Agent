# Task Template: Fix Bug

## Pre-flight Checklist
1. Read `.agent/INVARIANTS.md` - the bug may be a documented invariant violation
2. Check `.agent/IMPACT_MAP.yaml` for the affected file
3. Check `known_issues` fields in `.agent/MANIFEST.yaml`

## Steps

### 1. Locate the Bug
- Check MANIFEST.yaml `known_issues` fields
- Check INVARIANTS.md for violated invariants
- Use IMPACT_MAP.yaml to identify the handler file

### 2. Understand Impact
- Read IMPACT_MAP for the affected file
- Check `breaks_if_changed` to avoid regressions
- Check `notify_tests` to know which tests to run

### 3. Implement Fix
- Edit the identified handler
- Do not change function signatures unless necessary (check IMPACT_MAP)
- Add comments explaining the fix

### 4. Update Documentation
- Remove or update `known_issues` in MANIFEST.yaml if fixed
- Update INVARIANTS.md status if applicable
- Update IMPACT_MAP.yaml if the affected stores changed

### 5. Write/Update Tests
- Add a regression test that would have caught this bug
- Run the full `notify_tests` list from IMPACT_MAP

### 6. Run Tests
```bash
npm test
```

## Known Bug: INV-002 (Session not invalidated on delete)
- Location: `src/user/user.delete.handler.ts`
- Fix: Import `deleteSessionsByUserId` from `_shared/db` and call it before `userStore.delete(id)`
- Test: Add test to `src/auth/auth.test.ts` verifying token is invalid after user deletion
- Update: Remove `known_issues` from `user.delete` in MANIFEST.yaml
- Update: Change INV-002 status from VIOLATED to FIXED in INVARIANTS.md
