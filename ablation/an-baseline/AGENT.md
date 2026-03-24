# AGENT ENTRY POINT

## Quick Orient
- **Stack**: TypeScript, Express.js, Jest
- **Entry**: src/app.ts
- **Test**: `npm test`
- **Data**: In-memory Maps (no external DB)

## Read This Before Touching Anything
1. `.agent/INVARIANTS.md` — constraints that must never be violated
2. `.agent/IMPACT_MAP.yaml` — what affects what
3. `.agent/MANIFEST.yaml` — full capability index

## Capability Index
| Capability | Handler | Contract |
|-----------|---------|---------|
| user.create | src/user/user.create.handler.ts | src/user/user.contract.ts |
| user.get | src/user/user.get.handler.ts | src/user/user.contract.ts |
| user.update | src/user/user.update.handler.ts | src/user/user.contract.ts |
| user.delete | src/user/user.delete.handler.ts | src/user/user.contract.ts |
| auth.login | src/auth/auth.login.handler.ts | src/auth/auth.contract.ts |
| auth.logout | src/auth/auth.logout.handler.ts | src/auth/auth.contract.ts |

## Known Issues
- INV-002: user.delete does not invalidate sessions (see .agent/INVARIANTS.md)

## Common Tasks
- Add feature → `.agent/TASK_TEMPLATES/add_feature.md`
- Fix bug → `.agent/TASK_TEMPLATES/fix_bug.md`
- Refactor → `.agent/TASK_TEMPLATES/refactor.md`

## Route Map
```
POST   /users          -> user.create.handler (no auth required)
GET    /users/:id      -> user.get.handler    (auth required - INV-003)
PUT    /users/:id      -> user.update.handler (auth required - INV-003)
DELETE /users/:id      -> user.delete.handler (auth required - INV-003)
POST   /auth/login     -> auth.login.handler
POST   /auth/logout    -> auth.logout.handler (auth required)
```
