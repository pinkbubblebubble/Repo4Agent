# Task Template: Refactor

## Pre-flight Checklist
1. Read `.agent/INVARIANTS.md` - invariants must be preserved after refactor
2. Read `.agent/IMPACT_MAP.yaml` for all files you plan to change
3. Identify `breaks_if_changed` fields - these are hard constraints

## Steps

### 1. Scope the Refactor
- List all files to be changed
- For each file, check IMPACT_MAP `breaks_if_changed`
- These are your non-negotiable constraints

### 2. Identify Safe Changes
- IMPACT_MAP `safe_to_change` lists what you CAN modify freely
- Everything outside `safe_to_change` needs careful testing

### 3. Implement
- Keep exported interfaces unchanged (unless that's the goal)
- Keep response formats unchanged
- Keep test file names and describe block names unchanged (they're referenced in MANIFEST)

### 4. Verify Invariants
- INV-001: passwords never in responses, always hashed
- INV-002: check if session-user consistency is affected
- INV-003: auth middleware still applied to correct routes

### 5. Update Documentation
- If you changed `side_effects`, update MANIFEST.yaml
- If you changed what a file affects, update IMPACT_MAP.yaml
- If you changed exported interfaces, update contract files

### 6. Run Tests
```bash
npm test
```
All tests must pass. Zero regressions.

## Refactor Principles
- Prefer editing implementation over changing contracts
- If contracts must change, update ALL consumers listed in IMPACT_MAP
- Leave MANIFEST and IMPACT_MAP in sync with code
