# repo4agent

> Repositories designed for AI agents, not humans.

**Live demo**: [demo/index.html](demo/index.html)
**Full report**: [reports/report_en.md](reports/report_en.md) · [中文报告](reports/report_cn.md)
**Deep analysis**: [reports/analysis_en.md](reports/analysis_en.md) · [中文分析](reports/analysis_cn.md)

---

## The Finding

We ran 40 controlled experiments comparing two structurally identical APIs — one in a traditional repository, one in an agent-native repository — and had Claude Haiku complete 10 coding tasks on each.

| | Traditional | Agent-Native | Δ |
|--|------------|--------------|---|
| Avg tool calls | 9.0 | 14.0 | +55.6% |
| Avg tokens | 189,518 | 300,779 | +58.7% |
| **Test pass rate** | **55%** | **80%** | **+25pp** |

More resources, dramatically better outcomes. The agent reads more — but reads *better-structured information* — and makes correct first-attempt implementations instead of repeatedly editing the wrong files.

On complex tasks with hidden constraints (auth refresh, soft delete), agent-native achieved **100% vs 0%** — a complete reversal.

---

## What Is an Agent-Native Repository?

A traditional repo is organized for human navigation: layered architecture, prose README, controllers that mix all operations.

An agent-native repo adds a **metadata layer** tuned for how AI agents actually work:

```
.agent/
  MANIFEST.yaml     ← Capability index: handler, side_effects, known_issues per operation
  INVARIANTS.md     ← Non-obvious constraints + pre-annotated bugs with exact fix locations
  IMPACT_MAP.yaml   ← "Changing X requires also changing Y" declarations
AGENT.md            ← Machine-optimized entry point: capability table + known issues
src/
  user/
    user.create.handler.ts   ← One file per operation (not one controller for all)
    user.contract.ts
    user.test.ts
  auth/
    auth.login.handler.ts
    ...
```

### Why It Works

Three mechanisms account for the +25pp improvement:

1. **Front-loaded knowledge** — `AGENT.md` forces the agent to read constraints before touching any code. Traditional agents "prematurely commit" after reading only 4–7 files; agent-native agents read 13–19 files first, then make correct targeted edits.

2. **Unknown unknowns → known unknowns** — `MANIFEST.yaml`'s `side_effects` field and `IMPACT_MAP.yaml` tell the agent which other files must change when it edits any given file. Traditional agents fix the delete handler; they miss the session invalidation. Agent-native agents don't.

3. **Structure as instruction** — Domain-organized `src/user/`, `src/auth/` with semantic file names (`user.delete.handler.ts`) cues the agent to create new isolated files rather than pile into an existing controller.

---

## Repository Structure

```
repo4agent/
├── traditional-repo/        # Standard Express.js + TypeScript API
│   ├── src/
│   │   ├── controllers/     # userController.ts, authController.ts
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   └── tests/
│
├── agent-native-repo/       # Same API, restructured for agents
│   ├── .agent/
│   │   ├── MANIFEST.yaml
│   │   ├── INVARIANTS.md
│   │   ├── IMPACT_MAP.yaml
│   │   └── TASK_TEMPLATES/
│   ├── AGENT.md
│   ├── src/
│   │   ├── user/            # user.create.handler.ts, user.contract.ts, user.test.ts
│   │   ├── auth/
│   │   └── _shared/
│   └── tests/
│
├── experiment/
│   ├── run_experiment.py    # Main experiment runner (uses claude CLI)
│   ├── parse_stream.py      # Parses claude stream-json output, counts tool calls
│   ├── summarize.py         # Aggregates results → summary.json
│   └── results/
│       ├── raw_results.jsonl  # 40 raw runs (one JSON per line)
│       └── summary.json       # Aggregated metrics + hypothesis evaluations
│
├── reports/
│   ├── report_en.md         # Full experiment report
│   ├── report_cn.md         # 中文实验报告
│   ├── analysis_en.md       # Deep analysis: 6 mechanisms
│   └── analysis_cn.md       # 深度分析
│
└── demo/
    └── index.html           # Interactive demo page
```

---

## Reproducing the Experiment

### Prerequisites

- [Claude Code](https://claude.ai/code) installed and authenticated (`claude --version`)
- Python 3.8+
- Node.js 18+

### Setup

```bash
# Install dependencies for both repos
cd traditional-repo && npm install && cd ..
cd agent-native-repo && npm install && cd ..
```

### Run

```bash
cd experiment

# Run all 10 tasks × 2 repos × 2 runs = 40 total
python3 run_experiment.py

# Summarize results
python3 summarize.py
```

Results append to `experiment/results/raw_results.jsonl`. Each line contains:
- `repo_type`, `task_id`, `run_number`
- Tool call counts: `read`, `glob`, `grep`, `write`, `edit`, `total`
- `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`
- `tests_passed`, `failed_test_count`, `duration_ms`

### Tasks

| ID | Task | Type |
|----|------|------|
| A | Add `PATCH /users/:id/email` | Add feature |
| B | Fix: user delete doesn't invalidate sessions | Fix bug |
| C | Add input validation to `POST /users` | Add middleware |
| D | Add `GET /users` list endpoint | Add feature |
| E | Add `PATCH /users/:id/password` | Add feature |
| F | Fix: sessions never expire | Fix bug |
| G | Add `GET /users?email=` search | Add feature |
| H | Add `POST /auth/refresh` | Add feature |
| I | Add global request logging | Add middleware |
| J | Change DELETE to soft delete + invalidate sessions | Add feature |

---

## The `/init-agent-repo` Skill

The research produced a Claude Code skill that transforms any existing repository into an agent-native structure automatically.

Install:
```bash
# The skill is at ~/.claude/skills/init-agent-repo/SKILL.md
# Restart Claude Code, then invoke with:
/init-agent-repo
```

The skill:
1. Explores your codebase (entry points, handlers, models, tests)
2. Identifies capabilities, side effects, cross-module dependencies, and non-obvious constraints
3. Generates `AGENT.md`, `.agent/MANIFEST.yaml`, `.agent/INVARIANTS.md`, `.agent/IMPACT_MAP.yaml`

Priority order for maximum impact: `INVARIANTS.md` > `MANIFEST.yaml` (side_effects) > `IMPACT_MAP.yaml` > domain structure.

---

## Key Takeaways

- **Fewer tool calls ≠ better** — agent-native uses 55% more tool calls but achieves 45% more correct implementations
- **Tokens per correct answer**: 339K (traditional) vs 371K (agent-native) — only 9.3% more expensive per *correct* outcome
- **The read-per-edit ratio** is a quality signal: failing runs cluster at 1.2–2.0 r/e; passing runs at 1.9–3.8+
- **INVARIANTS.md** must stay sparse — information overload causes over-engineering on simple tasks (Tasks E, G: −50pp)
- **Structure is the silent instruction** — file naming conventions and domain organization guide agent behavior without explicit rules

---

## Citation

If you use this research or the experimental setup:

```
repo4agent: Agent-Native Repository Design
Empirical comparison across 40 experiment runs, 10 tasks, claude-haiku-4-5-20251001
https://github.com/pinkbubblebubble/repo4agent
2026
```

---

## License

MIT
