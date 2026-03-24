# INVARIANTS.md — System Constraints
# These are non-negotiable rules. Read before touching any code.
# VIOLATED entries are active bugs — fix them when relevant to your task.

---

## INV-001: Password Security
- **WHAT**: User passwords must NEVER be stored as plaintext
- **WHY**: Security baseline requirement
- **HOW**: Always hash with `bcrypt`, `saltRounds >= 10`, before any write to userStore
- **NEVER**: Return the `password` field in any API response — strip it at the handler level
- **TEST**: Any test creating a user must verify `stored.password !== input.password`
- **FILES**: `src/user/user.create.handler.ts`, `src/user/user.get.handler.ts`, `src/user/user.list.handler.ts`
- **STATUS**: ✅ ENFORCED

---

## INV-002: Session-User Consistency
- **WHAT**: When a user is deleted, ALL their active sessions MUST be invalidated immediately
- **WHY**: Deleted users must not retain API access
- **CURRENT STATUS**: ❌ VIOLATED
- **VIOLATED IN**: `src/user/user.delete.handler.ts`
- **FIX**: After removing user from userStore, call `sessionStore.deleteByUserId(userId)`
- **PREREQUISITE**: `sessionStore` in `src/_shared/db.ts` must expose `deleteByUserId(userId: string)` — add it if missing
- **TEST**: Add to `src/auth/auth.test.ts`: login → delete user → verify token is rejected

---

## INV-003: Route Authorization
- **WHAT**: All `/users/*` routes except `POST /users` require a valid session token
- **WHY**: User data must not be publicly accessible
- **HOW**: `authMiddleware` in `src/_shared/authMiddleware.ts` validates `Authorization` header
- **EXCEPTION**: `POST /users` (registration) is intentionally public
- **EXCEPTION**: `POST /auth/login` and `POST /auth/refresh` are intentionally public
- **TEST**: Every protected route test must include a 401 case with no/invalid token
- **FILES**: `src/_shared/authMiddleware.ts`, `src/app.ts`
- **STATUS**: ✅ ENFORCED
