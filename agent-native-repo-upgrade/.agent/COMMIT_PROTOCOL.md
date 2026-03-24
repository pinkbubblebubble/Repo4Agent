# COMMIT PROTOCOL
# A task is NOT complete until this checklist is done.
# Treat metadata updates as part of the task, not optional cleanup.

---

## Decision tree — find your change type, do what it says

```
Added a new source file?
  → FILES.yaml      : add full entry
  → MANIFEST.yaml   : add capability entry (if it's a handler)
  → ROUTES.yaml     : add route entry (if it registers a route)
  → STATUS.yaml     : add capability with status: working

Added a new route in app.ts?
  → ROUTES.yaml     : add route entry
  → FILES.yaml      : update app.ts insertion_points if they shifted

Modified an existing handler's behavior?
  → FILES.yaml      : update what / writes_to / before_editing if changed
  → MANIFEST.yaml   : update side_effects if changed
  → STATUS.yaml     : update status if capability is now working/broken

Fixed a known bug (INV-XXX)?
  → INVARIANTS.md   : change STATUS to ✅ RESOLVED, add RESOLVED_IN field
  → FILES.yaml      : remove or update the known_issues entry on that file
  → STATUS.yaml     : update capability status to working

Discovered a new constraint or bug?
  → INVARIANTS.md   : add new INV-XXX entry
  → FILES.yaml      : add to before_editing on the relevant file
  → STATUS.yaml     : mark capability as broken with broken_because

Added or changed tests?
  → TEST_CONTRACTS.yaml : update the contract for that capability

Changed src/_shared/db.ts interface?
  → IMPACT_MAP.yaml : update affected entries
  → FILES.yaml      : update db.ts missing_methods if resolved

Added a new code pattern?
  → PATTERNS.yaml   : add template entry

Ran npm test?
  → STATUS.yaml     : update tests.last_run, tests.passing, tests.failing
```

---

## Always — after every task

Append to `CHANGELOG.agent.yaml`:

```yaml
- date: "YYYY-MM-DD"
  task: "<one sentence: what you were asked to do>"
  files_modified: []
  files_created: []
  capabilities_added: []
  capabilities_modified: []
  invariants_resolved: []
  invariants_introduced: []
  metadata_updated: []  # list every .agent/ file you updated
  notes: ~              # anything the next agent should know
```

---

## Why this matters

Each skipped update costs the next agent 5–10 extra tool calls to reconstruct what you already knew.
The metadata is only valuable if it reflects the current state of the code.
