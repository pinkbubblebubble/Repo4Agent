# repo4agent: Agent-Native Repository Design Plan

> Core Hypothesis: In the vibe-coding era, the primary reader of a codebase is an AI agent, not a human. The design philosophy of traditional repositories needs to be fundamentally rethought.

---

## I. Problem Diagnosis: Where Traditional Repos Create Friction for Agents

| Problem | Traditional Approach | Agent's Pain Point |
|---------|---------------------|-------------------|
| Ambiguous entry point | README.md written for humans with narrative text | Agent needs multiple rounds of glob/grep to locate the starting point |
| Opaque intent | Comments describe "how," rarely "why" | Agent doesn't know the side effects of a change |
| Implicit dependencies | Dependency relationships buried inside code | Agent changes A without knowing it will break B |
| Implicit state | Global state scattered throughout codebase | Agent struggles to infer the system's current state |
| Unstructured tests | Test files named arbitrarily, coverage unclear | Agent can't quickly determine "if I change this, which tests should I run?" |
| Vague error handling | Error types inconsistent | Agent cannot systematically handle exceptions |
| Context window waste | Excessive redundant comments and legacy code | Consumes precious context, reduces accuracy |

---

## II. Core Design Principles for Agent-Native Repositories

### Principle 1: Machine-Addressable
Every capability, every module, every constraint has a unique, programmatically discoverable address. An agent can find it in a single grep.

### Principle 2: Intent-Explicit
Don't just record "what the code does" — record "why it's done this way" and "what will be affected if this changes" — in structured format, not prose.

### Principle 3: Impact-Traceable
When modifying any component, the agent can infer the impact scope from the repository itself (without running the code).

### Principle 4: Context-Dense
Remove redundancy, preserve semantics. Every line maximizes information value for the agent.

### Principle 5: Task-Templated
Common agent tasks (add feature, fix bug, refactor) have standard operating procedures stored in the repository.

---

## III. Agent-Native Repository Structure

```
repo/
├── .agent/                        # Agent-specific directory (core innovation)
│   ├── MANIFEST.yaml              # Repository capability manifest (machine-readable)
│   ├── IMPACT_MAP.yaml            # Module interdependency impact map
│   ├── INVARIANTS.md              # System invariants (must always be true)
│   ├── TASK_TEMPLATES/            # Standard task templates
│   │   ├── add_feature.md
│   │   ├── fix_bug.md
│   │   └── refactor.md
│   └── DECISIONS/                 # Structured decision log (ADR for agents)
│       └── 001_auth_strategy.yaml
│
├── src/
│   ├── [domain]/                  # Organized by domain, not by tech layer
│   │   ├── [domain].contract.ts   # Explicit input/output contracts
│   │   ├── [domain].impl.ts       # Implementation
│   │   ├── [domain].invariants.ts # Module-level invariants (executable)
│   │   └── [domain].test.ts       # Tests (co-located with implementation)
│   └── _shared/                   # Cross-domain shared code (minimized)
│
├── tests/
│   └── COVERAGE_MAP.yaml          # Explicit mapping of tests to capabilities
│
└── AGENT.md                       # Replaces README; agent-optimized entry point
```

---

## IV. Key File Designs

### 4.1 `AGENT.md` (Entry Point)

Not a human-readable narrative - a structured navigation guide for agents:

```markdown
# AGENT ENTRY POINT

## Quick Orient
- Stack: [list]
- Entry: src/main.ts:12
- Test cmd: `npm test`
- Lint cmd: `npm run lint`

## Capability Index
| Capability | Location | Contract |
|-----------|---------|---------|
| user.auth | src/auth/ | .agent/MANIFEST.yaml#auth |
| data.fetch | src/data/ | .agent/MANIFEST.yaml#data |

## Before You Change Anything
1. Read .agent/INVARIANTS.md
2. Check .agent/IMPACT_MAP.yaml for your target module
3. Run relevant tests from tests/COVERAGE_MAP.yaml
```

### 4.2 `.agent/MANIFEST.yaml` (Capability Manifest)

```yaml
capabilities:
  auth:
    description: "User authentication and authorization"
    entry: "src/auth/auth.contract.ts"
    inputs: [email, password]
    outputs: [jwt_token, user_id]
    side_effects: [writes_session_db, logs_audit]
    dependencies: [user_domain, crypto_service]
    test_suite: "tests/auth/**"
```

### 4.3 `.agent/IMPACT_MAP.yaml` (Impact Graph)

```yaml
impact_map:
  "src/auth/auth.impl.ts":
    affects: [session_management, user_profile, audit_log]
    breaks_if_changed: ["jwt signature format", "session expiry logic"]
    safe_to_change: ["error messages", "logging verbosity"]
    notify_tests: ["tests/auth/", "tests/integration/login.test.ts"]
```

### 4.4 `.agent/INVARIANTS.md` (Invariants)

```markdown
## System Invariants

### INV-001: Auth Token Integrity
- WHAT: All JWT tokens must be signed with RS256
- WHY: Compliance requirement (SOC2-AUTH-3)
- TEST: tests/invariants/token_integrity.test.ts
- NEVER: Change algorithm without updating key rotation policy

### INV-002: Data Immutability
- WHAT: User records are append-only, never updated in place
- WHY: Audit trail requirement
- TEST: tests/invariants/immutability.test.ts
```

### 4.5 File Naming Convention (Semantic)

```
Traditional:   userController.ts, utils.ts, helpers.ts
Agent-native:  user.create.handler.ts, user.query.handler.ts, user.contract.ts
```

Agents can infer file contents from the filename alone, without opening the file.

---

## V. Experiment Design

### Experiment Objective
Quantify the efficiency gains of agent-native repos compared to traditional repos.

### Experimental Setup

**Benchmark Task Set** (same tasks, two repository types):
1. Task A: Add a new API endpoint (user email update)
2. Task B: Fix a cross-module bug (authentication session not invalidated on delete)
3. Task C: Add input validation middleware without breaking existing functionality

**Groups**:
- Control: Traditional Express.js + TypeScript project (standard structure)
- Experimental: Same functionality, agent-native structure

**Metrics**:

| Metric | Measurement Method |
|--------|-------------------|
| Tool call count | Count total tool invocations to complete the task |
| Context consumption | Count total tokens read |
| First-attempt success rate | Does the agent pass tests on the first attempt? |
| Side-effect break rate | After completing the task, how many other tests fail? |
| Task completion time | Time from start to all tests passing |

**Experiment Flow**:
```
1. Build two functionally identical repos (traditional vs agent-native)
2. Give the same task prompt to the same Claude agent instance
3. Record all tool calls, collect the above metrics
4. Repeat 3 times, compute averages
5. Statistical significance testing (sample size: 10 runs per task)
```

**Hypotheses (to be validated)**:
- H1: Agent-native repo reduces tool calls by >= 30%
- H2: Side-effect break rate decreases by >= 50%
- H3: First-attempt success rate improves by >= 20%

---

## VI. Implementation Roadmap

### Phase 1: Prototype Validation
- [ ] Build minimal agent-native demo project (Node.js + TypeScript)
- [ ] Build control group (same functionality, traditional project)
- [ ] Design experiment harness (automate agent runs and collect metrics)

### Phase 2: Experiment Execution
- [ ] Run Task A / B / C comparison experiments
- [ ] Collect data, analyze results
- [ ] Identify which agent-native features provide the highest benefit

### Phase 3: Package as a Skill (if experiment validates feasibility)
- [ ] Templatize the `.agent/` directory structure
- [ ] Write `/init-agent-repo` skill
- [ ] Skill auto-generates: AGENT.md, MANIFEST.yaml, IMPACT_MAP.yaml scaffolds
- [ ] Skill analyzes existing projects and generates initial agent layer

---

## VII. Skill Design Draft

If the experiment proves effective, the `/init-agent-repo` skill behavior:

```
User runs /init-agent-repo at the start of a new project

Skill actions:
1. Ask for project type (API / CLI / Library / Monorepo)
2. Generate .agent/ directory structure
3. Generate AGENT.md scaffold
4. Generate MANIFEST.yaml scaffold
5. Generate IMPACT_MAP.yaml (initially empty, annotated with what needs filling)
6. Generate INVARIANTS.md scaffold (with common invariant examples)
7. Configure file naming conventions to .editorconfig or lint rules
8. Write CLAUDE.md so the agent knows this is an agent-native repo
```

---

## VIII. Risks and Counterarguments

| Risk | Counterargument |
|------|----------------|
| High maintenance cost: `.agent/` files need to stay in sync | Can write lint rules to check MANIFEST consistency with actual code |
| Unfriendly to human developers | In the vibe-coding era, humans primarily write prompts, not read code |
| File naming conventions hard to enforce | ESLint custom rule + CI checks |
| Impact map may be inaccurate | Automated tooling can generate initial version from import graph |

---

## IX. Core Insight

> **Traditional repos are libraries: organized by human classification systems, requiring human intuition to navigate.**
>
> **Agent-native repos are APIs: they have schemas, contracts, and explicit side-effect declarations.**

Agents don't need to "understand" code - they need to locate the correct modification point in the fewest possible tool calls, and know the impact boundaries of any change. These are two fundamentally different optimization targets.
