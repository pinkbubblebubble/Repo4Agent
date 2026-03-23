# repo4agent

> Repositories designed for AI agents, not humans.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Runs: 40](https://img.shields.io/badge/experiment_runs-40-orange)
![Pass Rate](https://img.shields.io/badge/pass_rate_improvement-%2B25pp-green)

---

## Overview

Code repositories were designed for human navigation: layered folders, prose READMEs, monolithic controllers. AI agents that work in these repos read the wrong files, miss cross-module side effects, and commit to edits before understanding the full constraint space.

**repo4agent** is an empirical investigation into what happens when you redesign a repository for the agent that will work in it — not the human who wrote it.

Across **40 controlled experiment runs** covering 10 coding tasks, the agent-native structure improved test pass rate from **55% → 80% (+25 percentage points)**. On complex tasks with hidden constraints, the improvement was **0% → 100%**.

---

## The Core Finding

The counter-intuitive result: agent-native repos use *more* tool calls, not fewer.

| | Traditional | Agent-Native | Δ |
|--|------------|--------------|---|
| Avg tool calls | 9.0 | 14.0 | +55.6% |
| Avg tokens | 189,518 | 300,779 | +58.7% |
| **Test pass rate** | **55%** | **80%** | **+25pp** |

More resources, better outcomes. The mechanism isn't efficiency — it's **information quality per read**. Traditional agents read source code and infer intent. Agent-native agents read structured metadata and *know* intent.

The token cost per **correct implementation**: 339K (traditional) vs 371K (agent-native) — only 9.3% more expensive, while producing 45% more correct answers.

---

## What Is an Agent-Native Repository?

An agent-native repo adds a **metadata layer** alongside the existing source code. The code doesn't change. The structure changes.

```
.agent/
  MANIFEST.yaml      ← Every capability: handler path, side effects, known issues, test coverage
  INVARIANTS.md      ← Non-obvious constraints + pre-annotated bugs with exact fix locations
  IMPACT_MAP.yaml    ← "Changing X requires also changing Y" — converts unknown unknowns to known
AGENT.md             ← Machine-optimized entry: "Read INVARIANTS.md before touching anything"
src/
  user/
    user.create.handler.ts    ← One file per operation
    user.contract.ts
    user.test.ts
  auth/
    auth.login.handler.ts
    ...
```

### Why It Works

**Premature commit is the primary failure mode.** Traditional agents read 4–7 files, decide "that's enough," and start editing — often the wrong files. Agent-native agents read 13–19 files first, then make correct targeted edits. `AGENT.md` enforces this by opening with a mandatory pre-read instruction.

**Side effects are the #1 unknown unknown.** `MANIFEST.yaml` declares what each operation writes, reads, and affects beyond its return value. Without this, an agent fixing a delete handler won't know it also needs to invalidate sessions.

**Structure is a silent instruction.** Domain-organized source (`src/user/`, `src/auth/`) with semantic file names cues the agent to create new isolated files rather than pile into an existing controller — 4× more new file creation in agent-native runs.

---

## Results by Task

| Task | Traditional | Agent-Native | Δ |
|------|------------|--------------|---|
| A: PATCH email endpoint | 50% | 100% | +50pp |
| B: Fix sessions on delete | 50% | 100% | +50pp |
| C: Input validation | 0% | 0% | — |
| D: GET /users list | 100% | 100% | — |
| E: PATCH password | 100% | 50% | −50pp |
| F: Session expiry fix | 100% | 100% | — |
| G: GET /users?email search | 100% | 50% | −50pp |
| **H: POST /auth/refresh** | **0%** | **100%** | **+100pp** |
| I: Request logging | 50% | 100% | +50pp |
| **J: Soft delete** | **0%** | **100%** | **+100pp** |

Tasks E and G are intentional counter-examples: agent-native *underperformed* on simple, well-scoped tasks. Over-reading metadata causes over-engineering. **Agent-native advantage scales with task hidden complexity** — this informed the design of `INVARIANTS.md`: keep it sparse, document only non-obvious constraints.

---

## The `/init-agent-repo` Skill

The research produced a Claude Code skill that generates the agent-native metadata layer for any existing codebase automatically.

**Install**: Copy `skill/init-agent-repo/SKILL.md` to `~/.claude/skills/init-agent-repo/SKILL.md`, then restart Claude Code.

**Usage**: Run `/init-agent-repo` in any project.

The skill explores your codebase and generates:
- `AGENT.md` with a capability table and known issues
- `.agent/MANIFEST.yaml` with side effects per operation
- `.agent/INVARIANTS.md` with active violations and non-obvious constraints
- `.agent/IMPACT_MAP.yaml` with cross-module impact chains

Priority order for maximum impact: **INVARIANTS.md** > **MANIFEST.yaml** (`side_effects`) > **IMPACT_MAP.yaml** > domain structure + semantic naming.

---

## Repository Structure

```
repo4agent/
├── traditional-repo/       # Standard Express.js + TypeScript API
│   └── src/controllers/    # userController.ts, authController.ts (mixed operations)
│
├── agent-native-repo/      # Same API, restructured for agents
│   ├── .agent/             # MANIFEST.yaml, INVARIANTS.md, IMPACT_MAP.yaml
│   ├── AGENT.md
│   └── src/user/, src/auth/  # Domain-organized, one file per operation
│
├── experiment/
│   ├── run_experiment.py   # Runs tasks via claude CLI (--disallowedTools Bash)
│   ├── parse_stream.py     # Parses stream-json output, counts tool calls
│   ├── summarize.py        # Aggregates raw_results.jsonl → summary.json
│   └── results/            # Raw data: 40 runs, all metrics
│
├── reports/
│   ├── report_en.md        # Full experiment report
│   ├── report_cn.md        # 中文报告
│   ├── analysis_en.md      # Deep analysis: 6 mechanisms
│   └── analysis_cn.md      # 深度分析
│
├── skill/
│   └── init-agent-repo/
│       └── SKILL.md        # Claude Code skill
│
└── demo/index.html         # Interactive demo
```

---

## Reproducing the Experiment

**Prerequisites**: Claude Code (`claude --version`), Python 3.8+, Node.js 18+

```bash
cd traditional-repo && npm install && cd ..
cd agent-native-repo && npm install && cd ..

cd experiment
python3 run_experiment.py   # Appends to results/raw_results.jsonl
python3 summarize.py        # Prints summary table + writes summary.json
```

The experiment uses `--disallowedTools Bash` to force the agent to use discrete Read/Glob/Grep/Write/Edit operations — making tool call counts meaningful and reproducible.

Each result line in `raw_results.jsonl` contains: `repo_type`, `task_id`, `run_number`, tool call counts, token usage, `tests_passed`, `failed_test_count`, `duration_ms`.

---

## Further Reading

- [Full Experiment Report](reports/report_en.md) — methodology, per-task breakdown, hypothesis evaluations
- [Deep Analysis](reports/analysis_en.md) — 6 mechanisms: premature commit, missing edit problem, write ratio, token timing, information density, counter-examples
- [中文报告](reports/report_cn.md) / [深度分析](reports/analysis_cn.md)

---

## Citation

```
repo4agent: Agent-Native Repository Design
40-run empirical comparison, claude-haiku-4-5-20251001, 2026
https://github.com/pinkbubblebubble/repo4agent
```

---

MIT License
