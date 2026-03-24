---
name: init-agent-repo
description: Transform any repository into an agent-native structure. Generates AGENT.md, .agent/MANIFEST.yaml, .agent/INVARIANTS.md, .agent/IMPACT_MAP.yaml, and .agent/TEST_CONTRACTS.yaml — the 5-file metadata layer proven to improve AI agent task success rates by 30+ percentage points. Use when starting a new project or upgrading an existing repo for AI agent workflows.
---

You are executing the `/init-agent-repo` skill. Your job is to analyze the current repository and generate an **agent-native metadata layer** — a set of structured files that dramatically improve AI agent performance on this codebase.

## Phase 1: Explore the Repository

Before generating anything, build a complete mental model of the codebase. Read in this order:

1. **Entry points**: README.md, package.json / pyproject.toml / go.mod / Cargo.toml / pom.xml (whichever applies)
2. **Directory structure**: Use Glob to map `src/**/*`, `lib/**/*`, `app/**/*`, or equivalent
3. **Core modules**: Read the 6–10 most important files — controllers, handlers, models, services, routers
4. **Tests**: Glob `**/*.test.*`, `**/*_test.*`, `tests/**/*` — understand what's covered
5. **Config**: Any `.env.example`, config files, schema definitions

While exploring, identify:
- **Capabilities**: What operations does this system expose? (API endpoints, CLI commands, exported functions, background jobs)
- **Side effects**: What does each capability write/read/affect beyond its primary return value?
- **Cross-module dependencies**: Which files, when changed, force changes elsewhere?
- **Non-obvious constraints**: Business rules, security requirements, ordering requirements that aren't evident from reading one file
- **Known issues or TODOs**: Comments like `// TODO`, `# FIXME`, `// HACK`, missing validations, incomplete error handling

---

## Phase 2: Generate the Files

Generate all five files. **Do not skip any.** Create the `.agent/` directory if it doesn't exist.

---

### File 1: `AGENT.md` (root of repo)

The agent's entry point. Machine-optimized — no prose, only structured information.

```markdown
# AGENT.md

> Read .agent/INVARIANTS.md and .agent/MANIFEST.yaml BEFORE touching any file.

## Capabilities

| ID | Operation | Handler | Method+Path or Entrypoint |
|----|-----------|---------|--------------------------|
| ... | ... | ... | ... |

## Known Issues (fix before adding features)

| ID | Location | Description |
|----|----------|-------------|
| ... | ... | ... |

## Architecture

- **Language/Runtime**: ...
- **Framework**: ...
- **Data layer**: ...
- **Test runner**: `<exact command to run tests>`
- **Entry point**: ...

## Key Invariants

(List the 3–5 most critical non-obvious constraints. Full details in .agent/INVARIANTS.md)

- INV-001: ...
- INV-002: ...
```

Rules:
- The very first instruction must tell the agent to read INVARIANTS.md and MANIFEST.yaml first
- Capability table must have exact file paths, not vague descriptions
- Test command must be the exact runnable command (e.g., `npm test`, `pytest`, `go test ./...`)
- Known Issues section only lists bugs/violations that currently exist in the code

---

### File 2: `.agent/MANIFEST.yaml`

Capability index. Every externally-visible operation gets an entry.

```yaml
# .agent/MANIFEST.yaml
# Capability index — maps operations to handlers, contracts, side effects, and test coverage.

capabilities:

  <domain>.<operation>:          # e.g., user.create, auth.login, order.cancel
    handler: "src/..."           # exact file path
    method: "POST /path/:param"  # HTTP method+path, CLI command, or function signature
    contract: "src/...contract.ts"  # types/schema file if it exists, omit if not
    side_effects:
      - writes_<store>           # what persistent state this modifies
      - sends_<notification>     # emails, webhooks, events emitted
      - invalidates_<cache>      # cache keys cleared
    dependencies:
      - "src/shared/..."         # shared utilities this calls
    known_issues: |              # omit if none
      "Description of current bug or missing behavior. See INV-XXX."
    test_coverage: "tests/...#<describe_block>"  # exact test location, or "NONE"
```

Rules:
- Every capability must have `handler`, `side_effects`, and `test_coverage`
- `side_effects` is the most important field — this is what agents miss in traditional repos
- If `test_coverage` is `NONE`, add a comment: `# agent: write tests before editing this`
- Group capabilities by domain (user.*, auth.*, order.*, etc.)
- Use dot-notation IDs, not free-form names

---

### File 3: `.agent/INVARIANTS.md`

Non-obvious constraints and known violations. **Only document what isn't self-evident from reading the code.**

```markdown
# INVARIANTS.md
# Non-obvious constraints and known violations.
# Read this before making ANY changes.

## Active Violations (fix these first)

### INV-XXX: <short name> (VIOLATED)
- **WHERE**: `src/exact/file.ts` line ~N
- **WHAT**: One sentence describing what invariant is currently broken
- **FIX**: Exact description of what to call/add/change
- **HELPER**: `src/shared/util.ts` already has `functionName()` — use it
- **TEST**: Add assertion to `tests/file.test.ts#describe_block`

## Invariants (must always hold)

### INV-XXX: <short name>
- **RULE**: The constraint that must always be true
- **WHY**: Why this matters (security, consistency, business logic)
- **WHERE ENFORCED**: Which file/function currently enforces this
- **GOTCHA**: The non-obvious way this can be accidentally broken
```

Rules:
- **Active Violations** = bugs/missing behavior currently in the code. These are the highest-value entries — they directly prevent agent failures.
- **Invariants** = rules that currently hold but are easy to accidentally break
- Do NOT document obvious things (e.g., "passwords must be hashed" is only worth documenting if the hashing is in a non-obvious location or has a specific parameter requirement)
- Maximum 10 entries total. Quality over completeness. A bloated INVARIANTS.md causes information overload → agent over-engineers simple tasks.
- Each entry must have WHERE (exact file path) and FIX or GOTCHA (actionable guidance)
- **Critical: if a fix requires creating something that doesn't exist yet, say so explicitly.** "Call `deleteByUserId()`" causes agents to call a non-existent method. "Step 1: add `deleteByUserId()` to `src/db.ts` — this method does not exist yet. Step 2: call it from the handler." recovers the failure entirely. Always write fix steps in implementation order.

---

### File 4: `.agent/IMPACT_MAP.yaml`

Cross-module impact declarations. Converts "unknown unknowns" into "known unknowns."

```yaml
# .agent/IMPACT_MAP.yaml
# Cross-module impact map.
# "If you change X, you MUST also check/change Y."

impact_map:

  "src/exact/file.ts":
    affects:
      - file: "src/other/file.ts"
        reason: "Shares the UserRecord type — schema changes must propagate"
      - file: "tests/integration/file.test.ts"
        reason: "Integration test mocks this module's output"
    depended_on_by:
      - "src/module/that/imports/it.ts"

  "src/models/Schema.ts":
    affects:
      - file: "src/..."
        reason: "..."
      - file: "migrations/..."
        reason: "Schema changes require a new migration"
```

Rules:
- Only include files where the impact is **non-obvious** (wouldn't be found by just reading imports)
- Focus on: shared type definitions, side-effect utilities, config files, shared DB connection, event emitters
- A file that's only imported in one place doesn't need an entry
- Aim for 5–15 entries — the files that, when changed, most commonly cause missed edits

---

### File 5: `.agent/TEST_CONTRACTS.yaml`

Exact test assertions per capability. An agent that knows precisely what the test expects gets it right on the first attempt — no discovery-by-failure loop.

```yaml
# .agent/TEST_CONTRACTS.yaml
# Exact test assertions per capability.
# Read before writing any implementation — know the target before writing a single line.

contracts:

  <domain>.<operation>:        # matches MANIFEST.yaml capability key

    success:
      status: 200              # exact HTTP status code expected
      body:                    # shape of the response body (use null if no body)
        field: type            # e.g., id: string, token: string
      side_effect: |           # observable state change the test will verify
        "Description of what must be true after this call"

    failure_cases:
      - trigger: "Description of what input/state triggers the failure"
        status: 400            # exact status code for this failure
        body:
          error: "exact error string or field name"

    notes: |                   # omit if not needed
      "Any non-obvious assertion detail the agent would otherwise guess wrong"
```

Rules:
- Every capability in MANIFEST.yaml should have a corresponding contract entry
- `status` must be the exact integer — not a range, not "2xx"
- `side_effect` is the most important field for cross-module operations: state that must be verified beyond the HTTP response (e.g., sessions deleted, cache cleared, event emitted)
- `failure_cases` only lists cases the tests actually assert — do not invent hypothetical validations
- If a capability has `test_coverage: NONE` in MANIFEST.yaml, write the contract for what the tests *should* assert — prefix with `# agent: write this test`
- Keep each contract under 15 lines. If it's longer, you're over-specifying.

---

## Phase 3: Verify

After generating all five files:

1. Run the test command you documented in AGENT.md — confirm tests still pass (you haven't changed any code)
2. Verify `.agent/` directory contains exactly: `MANIFEST.yaml`, `INVARIANTS.md`, `IMPACT_MAP.yaml`, `TEST_CONTRACTS.yaml`
3. Verify `AGENT.md` exists at the repo root
4. Check that every capability in MANIFEST.yaml has a real file path (no placeholders)
5. Check that every capability in MANIFEST.yaml has a matching entry in TEST_CONTRACTS.yaml

---

## Phase 4: Report

Print a summary:

```
✓ AGENT.md                    — N capabilities indexed, M known issues
✓ .agent/MANIFEST.yaml        — N capabilities across D domains
✓ .agent/INVARIANTS.md        — N active violations, M invariants
✓ .agent/IMPACT_MAP.yaml      — N files mapped
✓ .agent/TEST_CONTRACTS.yaml  — N contracts (M with side_effect assertions)

High-value entries:
  - INV-XXX: [description] → agents would have missed this
  - [capability].known_issues: [description] → cross-module side effect documented
  - [capability] contract: [assertion] → prevents over/under-engineering

Next: Run /init-agent-repo again after major refactors to keep metadata current.
```

---

## Design Principles (do not violate)

1. **Specific over general**: "calls `deleteSessionsByUserId()` in `src/shared/db.ts`" beats "invalidates sessions"
2. **Actionable over descriptive**: Every entry should tell the agent what to DO, not just what IS
3. **Sparse INVARIANTS**: 10 high-quality entries outperform 40 mediocre ones — information overload causes over-engineering
4. **Side effects are the #1 value**: The MANIFEST's `side_effects` field is what prevents the "missing edit" failure pattern
5. **IMPACT_MAP targets unknown unknowns**: Only document cross-module effects that aren't findable via grep/import tracing
6. **TEST_CONTRACTS prevents both over- and under-engineering**: Exact assertions tell the agent the precise target — no more over-built abstractions on simple tasks, no more missing side-effect checks on complex ones
