# System Invariants

## INV-001: Password Security
- WHAT: User passwords must NEVER be stored in plaintext
- WHY: Security requirement
- HOW: Always use bcrypt with saltRounds >= 10
- TEST: Any test creating a user should verify stored hash !== input password
- NEVER: Return password field in any API response

## INV-002: Session-User Consistency (KNOWN VIOLATION)
- WHAT: When a user is deleted, all their active sessions MUST be invalidated
- WHY: Security - deleted users should not retain access
- CURRENT STATUS: VIOLATED - user.delete.handler does NOT invalidate sessions
- LOCATION: src/user/user.delete.handler.ts
- FIX: When fixing, ensure session_store is purged for deleted userId
- TEST: src/auth/auth.test.ts should include post-delete session test

## INV-003: Auth Protection
- WHAT: All /users/* routes except POST /users (registration) require valid session token
- WHY: Data privacy
- HOW: authMiddleware validates token from Authorization header
- TEST: All protected route tests must include unauthorized access test case
