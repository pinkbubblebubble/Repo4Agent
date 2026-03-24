# Task Template: Add Feature

## Pre-flight Checklist
1. Read `.agent/INVARIANTS.md` to understand constraints
2. Check `.agent/MANIFEST.yaml` to see existing capabilities
3. Check `.agent/IMPACT_MAP.yaml` for the modules you'll touch

## Steps

### 1. Define the Contract
- Create or update the relevant `*.contract.ts` file
- Define input types and output types
- Document any new invariants

### 2. Implement the Handler
- Create `[domain].[action].handler.ts`
- Follow existing handler patterns (see any existing handler)
- Document: capability name, contract reference, side_effects, dependencies

### 3. Register in app.ts
- Add route with appropriate auth middleware (INV-003)
- Follow existing route patterns

### 4. Update MANIFEST.yaml
- Add new capability entry
- Fill in: description, handler, contract, side_effects, dependencies, tests

### 5. Update IMPACT_MAP.yaml
- Add entry for new handler file
- Document what it affects and what breaks if changed

### 6. Write Tests
- Add tests in the relevant `*.test.ts` file
- Include: success case, auth protection test (INV-003), not-found case
- Verify INV-001 if creating/modifying users (no password in response)

### 7. Run Tests
```bash
npm test
```

## Example: Adding PATCH /users/:id/email
- Contract: `src/user/user.contract.ts` - add `UpdateEmailInput`
- Handler: `src/user/user.update-email.handler.ts`
- Route in `src/app.ts`: `app.patch('/users/:id/email', authMiddleware, updateEmailHandler)`
- Update MANIFEST + IMPACT_MAP
- Test in `src/user/user.test.ts`
