# INVARIANTS

## Active Violations (Current Bugs)

### INV-001 — DELETE /users/:id does not invalidate sessions

- **WHERE**: `src/controllers/userController.ts`, lines 110–112 (`deleteUser` function)
- **WHAT**: `userStore.delete(id)` removes the user record, but all `sessionStore` entries with `session.userId === id` are left intact. Those tokens continue to pass `authMiddleware` (which only checks `sessionStore`, not `userStore`). A deleted user's bearer token can still authenticate subsequent requests.
- **FIX**: After `userStore.delete(id)`, iterate `sessionStore` and delete every entry where `session.userId === id`:
  ```ts
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === id) sessionStore.delete(sessionId);
  }
  ```
  Both `userStore` and `sessionStore` are imported from `src/utils/db.ts`; `sessionStore` is already imported in `authController.ts` but is not imported in `userController.ts` — add the import.
- **HELPER**: `clearStores()` in `src/utils/db.ts` (test-only; do not use in production)
- **TEST**: Add to `tests/user.test.ts` under `DELETE /users/:id`: after deleting the user, attempt a request with the old token and assert `401`.

---

## Invariants (Rules That Must Hold)

### INV-002 — passwordHash must never leave the server

- **RULE**: HTTP responses for user data must always be produced by `toUserResponse()` (`src/models/User.ts`), which omits `passwordHash`.
- **WHY**: `passwordHash` is a bcrypt digest of the user's password. Leaking it enables offline dictionary attacks.
- **WHERE ENFORCED**: `src/controllers/userController.ts` — both `createUser` and `updateUser` call `toUserResponse()` before `res.json()`.
- **GOTCHA**: If you add a new user endpoint, you must call `toUserResponse()`. Returning the raw `User` object from `userStore` directly will expose `passwordHash`.

### INV-003 — Both stores share a single module; changes to db.ts affect all consumers

- **RULE**: `userStore` and `sessionStore` are module-level singletons exported from `src/utils/db.ts`. Any code that imports them shares the same in-memory state for the lifetime of the process.
- **WHY**: There is no database abstraction layer. State is global.
- **WHERE ENFORCED**: `src/utils/db.ts` (exported Maps); consumed by `userController.ts`, `authController.ts`, and `authMiddleware.ts`.
- **GOTCHA**: Tests call `clearStores()` in `beforeEach` to reset state. Forgetting this in a new test file will cause cross-test contamination. Do not call `clearStores()` in any production code path.

### INV-004 — No resource ownership enforcement

- **RULE**: `authMiddleware` only confirms that a valid session exists. It does NOT verify that `req.userId === req.params.id`. Any authenticated user can read, modify, or delete any other user's record.
- **WHY**: Ownership checks were never implemented.
- **WHERE ENFORCED**: Nowhere — this is a missing invariant.
- **GOTCHA**: Adding an ownership check requires comparing `req.userId` (set by `authMiddleware`) to `req.params.id` in each protected controller before performing the operation.

### INV-005 — Email uniqueness is not atomic

- **RULE**: Email must be unique across `userStore`.
- **WHY**: Prevents duplicate accounts for the same address.
- **WHERE ENFORCED**: `userController.ts` `createUser` and `updateUser` — linear scan before write.
- **GOTCHA**: The check and the write are two separate operations with no lock. Concurrent requests for the same email can both pass the check and both insert, producing duplicate emails. This is acceptable only while the data layer is a single-process in-memory Map.
