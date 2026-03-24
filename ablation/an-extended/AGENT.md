# AGENT.md
# Stack: TypeScript · Express.js · Jest
# Entry: src/app.ts | Test: npm test | Data: in-memory Maps

---

## Start here — what do you need?

**"What is currently working/broken?"**
→ `.agent/STATUS.yaml`

**"Where is the handler for route X?"**
→ `.agent/ROUTES.yaml`

**"Which file should I edit?"**
→ `.agent/FILES.yaml`

**"What must I not break?"**
→ `.agent/INVARIANTS.md`

**"What exactly does the test expect?"** ← read before writing code
→ `.agent/TEST_CONTRACTS.yaml`

**"How is code written in this codebase?"**
→ `.agent/PATTERNS.yaml`

**"What has changed recently?"**
→ `.agent/CHANGELOG.agent.yaml`

**"What will break if I change file X?"**
→ `.agent/IMPACT_MAP.yaml`

**"Where in the codebase is concept Y?"**
→ `.agent/CONCEPTS.yaml`

---

## Before you write any code

1. Read `STATUS.yaml` — know what's broken before you start
2. Read `TEST_CONTRACTS.yaml` for your target capability — write to match it
3. Check `FILES.yaml` for the target file's `before_editing` block
4. Check `IMPACT_MAP.yaml` for blast radius

## After you finish

→ Follow `.agent/COMMIT_PROTOCOL.md` — task is not done until metadata is updated

---

## Capability map

| Capability | Route | Handler | Status |
|---|---|---|---|
| user.create | POST /users | src/user/user.create.handler.ts | ✅ |
| user.get | GET /users/:id | src/user/user.get.handler.ts | ✅ |
| user.list | GET /users | src/user/user.list.handler.ts | ✅ |
| user.update | PATCH /users/:id | src/user/user.update.handler.ts | ✅ |
| user.delete | DELETE /users/:id | src/user/user.delete.handler.ts | ❌ INV-002 |
| auth.login | POST /auth/login | src/auth/auth.login.handler.ts | ✅ |
| auth.logout | POST /auth/logout | src/auth/auth.logout.handler.ts | ✅ |
| auth.refresh | POST /auth/refresh | src/auth/auth.refresh.handler.ts | ✅ |
