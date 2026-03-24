# Agent-Native Repo v2 — Design Notes

## What's wrong with v1

v1 introduced three useful static files: `MANIFEST.yaml`, `INVARIANTS.md`, `IMPACT_MAP.yaml`.
They proved effective (+25pp pass rate), but have a structural weakness: **they're static**.

After an agent completes a task, nothing tells it to update the metadata. Five tasks later,
MANIFEST no longer reflects the actual capabilities, INVARIANTS still lists resolved bugs,
and IMPACT_MAP is missing newly discovered dependencies. The next agent reads stale data and
makes worse decisions than if the metadata didn't exist at all.

v1 also still requires **grep/glob to locate files**. Even with MANIFEST, an agent asking
"where is session invalidation handled?" needs 3–5 tool calls to find the answer.

---

## v2 Design Principles

### 1. Every file is indexed (FILES.yaml)

`FILES.yaml` maps every source file to:
- `what` — one-line description (replaces file-open to understand purpose)
- `exports` — what the file exposes
- `reads_from` / `writes_to` — data flow without reading code
- `before_editing` — per-file pre-edit checklist (guard rails at the point of action)

**Effect**: File discovery goes from 3–5 tool calls → 0. The agent reads FILES.yaml once and
knows exactly which file to open. The `before_editing` block delivers constraint warnings
exactly when relevant — not buried in a separate document the agent might skip.

### 2. Route → handler lookup is instant (ROUTES.yaml)

`ROUTES.yaml` is a complete route registry. Given `PATCH /users/:id`, the agent immediately
knows `src/user/user.update.handler.ts#updateUser`, auth requirements, and which tests to run.

**Effect**: No more reading `src/app.ts` to find handler wiring. No more grepping for route strings.

### 3. Semantic search index (CONCEPTS.yaml)

When an agent knows *what* it wants to change but not *where* it lives, `CONCEPTS.yaml` maps
domain concepts (authentication, session_management, password_security) to their primary files,
contracts, stores, and relevant invariants.

**Effect**: "Where is session invalidation?" → open CONCEPTS.yaml → `session_management` →
three files, one known issue. One lookup instead of a grep loop.

### 4. Metadata stays fresh (COMMIT_PROTOCOL.md)

The critical innovation: every task ends with a structured update checklist. The agent is
explicitly instructed which metadata files to update depending on what it changed.

The checklist uses a decision tree:
```
Added new file?    → FILES.yaml + MANIFEST + ROUTES
Fixed a bug?       → INVARIANTS.md + FILES.yaml (before_editing of fixed file)
Changed db.ts?     → IMPACT_MAP + FILES.yaml
```

**Effect**: Metadata compounds in value with every task instead of decaying.

### 5. Operation log (CHANGELOG.agent.yaml)

Every completed task appends a structured log entry: what changed, which files were touched,
which invariants were resolved or introduced, which metadata files were updated.

**Effect**: The next agent can read the last 3 log entries and immediately understand recent
history — without parsing git log or reading diffs.

---

## Token cost comparison

| Action | v1 tool calls | v2 tool calls |
|:--|:-:|:-:|
| Find handler for a route | 3–5 (grep app.ts, read file) | 1 (read ROUTES.yaml) |
| Find all files related to "auth" | 4–7 (glob + read each) | 1 (read CONCEPTS.yaml) |
| Understand what a file does | 1 (read file) | 0 (read FILES.yaml entry) |
| Know what to update after a change | 0 (agent guesses) | 1 (read COMMIT_PROTOCOL) |

The dominant saving is **not reading files you don't need to edit**. A well-maintained
FILES.yaml means the agent forms an accurate mental model of the codebase from a single
YAML read, then opens only the 1–2 files it actually needs to change.

---

## The key design tension

More metadata = more maintenance burden. The rule from v1 still holds:
**document only what is non-obvious.** If the code is self-explanatory, the metadata entry
should be short. The `before_editing` field should contain constraints and cross-file
dependencies that an agent would not discover by reading the file alone — not a summary
of what the code does (the code says that already).

The COMMIT_PROTOCOL makes this sustainable: metadata updates are small, incremental, and
happen immediately after each task while context is fresh.
