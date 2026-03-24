# System Invariants

## INV-001: Password Security
- WHAT: User passwords must NEVER be stored in plaintext
- WHY: Security requirement
- HOW: Always use bcrypt with saltRounds >= 10
- TEST: Any test creating a user should verify stored hash !== input password
- NEVER: Return password field in any API response

## INV-002: Session-User Consistency (KNOWN VIOLATION)
- WHAT: When a user is deleted, all their active sessions MUST be invalidated
- WHY: Security — deleted users must not retain API access
- CURRENT STATUS: VIOLATED

### Fix — follow this order exactly:

**Step 1 — src/_shared/db.ts**
Add `deleteByUserId` to sessionStore. This method does not exist yet.
Without this step, step 2 will throw a runtime error.

```ts
// In the sessionStore object, add:
deleteByUserId(userId: string): void {
  for (const [token, session] of this.sessions) {
    if (session.userId === userId) this.sessions.delete(token)
  }
}
```

**Step 2 — src/user/user.delete.handler.ts**
After the line that removes the user, call:
```ts
sessionStore.deleteByUserId(userId)
```

**Step 3 — verify**
Run: `npm test`
The post-delete session test in src/auth/auth.test.ts must pass.

## INV-003: Auth Protection
- WHAT: All /users/* routes except POST /users require valid session token
- WHY: Data privacy
- HOW: authMiddleware validates token from Authorization header
- TEST: All protected route tests must include a 401 case
