# AGENT ENTRY POINT — v3

Stack: TypeScript · Express.js · Jest
Entry: src/app.ts | Test: npm test | Data: in-memory Maps

---

## Read before touching anything

1. `.agent/INVARIANTS.md` — constraints + known bugs with exact fix steps
2. `.agent/MANIFEST.yaml` — capability index
3. `.agent/TEST_CONTRACTS.yaml` — exact test assertions for your target capability

Then check `.agent/IMPACT_MAP.yaml` for the file you plan to edit.

---

## Capability index

| Capability | Handler | Contract |
|---|---|---|
| user.create | src/user/user.create.handler.ts | src/user/user.contract.ts |
| user.get    | src/user/user.get.handler.ts    | src/user/user.contract.ts |
| user.update | src/user/user.update.handler.ts | src/user/user.contract.ts |
| user.delete | src/user/user.delete.handler.ts | src/user/user.contract.ts |
| auth.login  | src/auth/auth.login.handler.ts  | src/auth/auth.contract.ts |
| auth.logout | src/auth/auth.logout.handler.ts | src/auth/auth.contract.ts |

## Route map

```
POST   /users          → user.create  (no auth)
GET    /users/:id      → user.get     (auth required)
PUT    /users/:id      → user.update  (auth required)
DELETE /users/:id      → user.delete  (auth required)
POST   /auth/login     → auth.login
POST   /auth/logout    → auth.logout  (auth required)
```

## Known issues

- **INV-002**: user.delete does not invalidate sessions — see INVARIANTS.md for step-by-step fix
