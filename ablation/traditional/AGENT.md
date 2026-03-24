Read .agent/INVARIANTS.md and .agent/MANIFEST.yaml BEFORE touching any file.

## Capabilities

| ID   | Operation   | Handler File                              | Method + Path        | Auth Required |
|------|-------------|-------------------------------------------|----------------------|---------------|
| U-01 | Create user | src/controllers/userController.ts         | POST /users          | No            |
| U-02 | Get user    | src/controllers/userController.ts         | GET /users/:id       | Yes           |
| U-03 | Update user | src/controllers/userController.ts         | PUT /users/:id       | Yes           |
| U-04 | Delete user | src/controllers/userController.ts         | DELETE /users/:id    | Yes           |
| A-01 | Login       | src/controllers/authController.ts         | POST /auth/login     | No            |
| A-02 | Logout      | src/controllers/authController.ts         | POST /auth/logout    | Yes           |

## Known Issues

- **INV-001 (ACTIVE BUG)**: `DELETE /users/:id` (U-04) removes the user from `userStore` but does NOT purge that user's sessions from `sessionStore`. After deletion, the deleted user's bearer tokens remain valid and will pass `authMiddleware`. See `.agent/INVARIANTS.md` for the exact fix.
  - Location: `src/controllers/userController.ts`, line 110–112
  - No test asserts the session is gone after delete (the existing test comment in `tests/user.test.ts` line 140–146 acknowledges this bug).

- **No session expiry**: Sessions live forever in `sessionStore` — there is no TTL, no `expiresAt` field, and no cleanup job.

- **No authorization check on resource ownership**: Any authenticated user can GET, PUT, or DELETE any other user's record. `authMiddleware` only verifies that a valid session exists; it does not compare `req.userId` to `req.params.id`.

## Architecture

| Aspect        | Detail                                              |
|---------------|-----------------------------------------------------|
| Language      | TypeScript 5.3                                      |
| Framework     | Express 4.18                                        |
| Data layer    | In-memory `Map` (no external DB); two stores: `userStore`, `sessionStore` defined in `src/utils/db.ts` |
| Entry point   | `src/app.ts` (dev: `ts-node src/app.ts`)            |
| Test command  | `npm test` (runs `jest --forceExit` via ts-jest)    |
| Test files    | `tests/user.test.ts`, `tests/auth.test.ts`          |
| Build output  | `dist/app.js` (production: `node dist/app.js`)      |

## Key Invariants

1. **Both stores must stay consistent**: deleting a user MUST also delete all sessions for that user. Violating this allows ghost sessions. See INV-001 in `.agent/INVARIANTS.md`.
2. **`passwordHash` must never appear in any HTTP response**: `toUserResponse()` in `src/models/User.ts` strips it; always go through that function.
3. **Email uniqueness is enforced in application code only** (linear scan of `userStore`). There is no DB-level constraint — concurrent requests are not protected.
4. **`clearStores()` wipes BOTH stores**: tests call this in `beforeEach`. Never call it in production paths.
5. **Auth token is a raw UUID stored in `sessionStore`**: it is not a JWT; validation is a `Map` lookup, not a cryptographic check.
