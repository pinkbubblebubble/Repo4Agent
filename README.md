<div align="right">

<a href="README_CN.md">中文</a> | English

</div>

<div align="center">

<img src="docs/icon.svg" width="96" height="96" alt="Repo4Agent Icon" />

# Repo4Agent

### *The repository, redesigned for the agent that works in it.*

<p align="center">
  <a href="https://pinkbubblebubble.github.io/Repo4Agent/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit-6366f1?style=for-the-badge&logoColor=white" alt="Live Demo" />
  </a>
  <a href="reports/report_en.md">
    <img src="https://img.shields.io/badge/Experiment%20Report-Read-22d3ee?style=for-the-badge" alt="Report" />
  </a>
  <a href="skill/init-agent-repo/SKILL.md">
    <img src="https://img.shields.io/badge/Claude%20Skill-Install-4ade80?style=for-the-badge" alt="Skill" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Experiment%20Runs-80-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/Tasks-10-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Pass%20Rate%20%2B30pp-55%25%20%E2%86%92%2085%25-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/Model-claude--haiku--4--5-lightgrey?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

</div>

---

## The Problem

AI agents working in a codebase read the wrong files, miss cross-module side effects, and commit changes before they understand the full constraint space. They weren't designed for it — the codebase was designed for humans.

**Repo4Agent** is a controlled empirical study: what happens when you redesign a repository for the agent that will work in it, not the human who wrote it?

We ran **80 controlled experiment runs** across 10 tasks using `claude-haiku-4-5-20251001`, iterating on the design until the results stabilized:

<div align="center">

| Metric | Traditional | Agent-Native |
|:--|:-----------:|:------------:|
| Avg tool calls | 9.0 | 13.5 |
| Avg tokens consumed | 189,518 | 293,141 |
| **Test pass rate** | **55%** | **85%** |
| Cost per correct impl. | 344K tok | 345K tok |

</div>

On the hardest tasks (hidden cross-module constraints): **0% → 100%**.

Agent-native uses more tokens overall — yet the cost per *correct* implementation is virtually identical, while producing 55% more correct answers.

---

## Why It Works

### 1. Premature commit is the primary failure mode

Traditional agents read 4–7 files, conclude "that's enough context," and begin editing — typically the wrong files. Agent-native repos open with a **mandatory pre-read instruction** in `AGENT.md`, forcing agents to read more files before modifying anything. This alone eliminates the most common failure pattern.

### 2. Side effects are the #1 unknown unknown

`MANIFEST.yaml` declares every operation's writes, reads, and downstream effects. Without it, an agent fixing a delete handler won't know it also needs to invalidate sessions. With it, the agent knows — because the manifest says so explicitly.

### 3. Knowing what the test expects beats knowing what the code does

`TEST_CONTRACTS.yaml` states the exact assertions for every capability — HTTP status, response shape, side effects, failure cases. Agents that know *precisely* what they're building for get it right on the first attempt, rather than discovering mismatches after tests fail.

### 4. Fix instructions must include implementation order

When a bug fix requires creating a method that doesn't yet exist, metadata that says "call `deleteByUserId()`" causes agents to call a non-existent method. Metadata that says "**Step 1**: add `deleteByUserId()` to db.ts — this method does not exist yet" eliminates the failure entirely.

> **The core insight:** Agent-native repos aren't codebases — they're APIs. They have schemas, contracts, and explicit side-effect declarations. Agents don't need to *understand* code; they need to locate the correct modification point in the fewest tool calls, and know the exact shape of a correct solution before writing a single line.

---

## What Is an Agent-Native Repository?

An agent-native repo adds a **5-file metadata layer** without changing any source logic. The API stays the same. The structure changes.

```
.agent/
  MANIFEST.yaml          ← Every capability: handler, side_effects, known_issues
  INVARIANTS.md          ← Constraints + known bugs with step-by-step fix instructions
  IMPACT_MAP.yaml        ← "Changing X requires also changing Y"
  TEST_CONTRACTS.yaml    ← Exact test assertions: status, body shape, side effects
AGENT.md                 ← Entry point: mandatory pre-read, capability index, route map
src/
  user/
    user.create.handler.ts    ← One file per operation
    user.contract.ts
    user.test.ts
  auth/
    auth.login.handler.ts
    ...
```

### What each file contributes

| File | Purpose | Without it |
|:-----|:--------|:----------|
| `AGENT.md` | Entry point with mandatory pre-read instruction | Agent starts editing after 4 files instead of 13 |
| `MANIFEST.yaml` | Side effects declared per capability | Agent fixes delete handler, misses session invalidation |
| `INVARIANTS.md` | Known bugs with ordered fix steps | Agent calls methods that don't exist yet |
| `TEST_CONTRACTS.yaml` | Exact assertions before writing code | Agent over-engineers simple tasks, under-specifies complex ones |
| `IMPACT_MAP.yaml` | Cross-file blast radius | Agent changes a shared interface, breaks unrelated tests |

---

## Ablation Study

The final design was arrived at through three iterations. Each was run as a separate controlled experiment (20 runs per condition).

| Condition | Files | Pass Rate | Avg Tokens | Key change |
|:---|:---:|:---:|:---:|:---|
| Traditional | — | 55% | 189K | baseline |
| AN-Baseline | 4 | 80% | 301K | MANIFEST + INVARIANTS + IMPACT_MAP + AGENT.md |
| AN-Extended | 11 | 80% | 343K | +7 files: file index, route map, concept index, patterns, status, changelog |
| **AN-Refined** | **5** | **85%** | **293K** | baseline + TEST_CONTRACTS + stronger fix instructions |

**Key finding from ablation:** Adding 7 more files (AN-Extended) produced the same pass rate as the baseline while costing 14% more tokens. It also introduced new failures: agents skimmed instead of read carefully when the metadata volume was too high. The optimal design is lean — only metadata an agent cannot infer from code alone.

**What the ablation identified:**
- `TEST_CONTRACTS.yaml` was the only addition that genuinely helped — it fixed 2 over-engineering failures from the baseline
- Step-by-step fix ordering in `INVARIANTS.md` (not just "call X" but "Step 1: create X, it doesn't exist yet — Step 2: call X") recovered a previously flaky task to 100%
- Everything else in AN-Extended added noise without contributing to correctness

---

## Results by Task

<div align="center">

| Task | Traditional | Agent-Native | Δ |
|:-----|:-----------:|:------------:|:-:|
| A: Add PATCH /email endpoint | 50% | 100% | +50pp |
| B: Fix sessions not invalidated on delete | 50% | 100% | +50pp |
| C: Input validation middleware | 0% | 0% | — |
| D: GET /users list endpoint | 100% | 100% | — |
| E: PATCH /password endpoint | 100% | 100% | — |
| F: Session expiry fix | 100% | 100% | — |
| G: GET /users?email search | 100% | 100% | — |
| **H: POST /auth/refresh** | **0%** | **100%** | **+100pp** |
| I: Global request logging | 50% | 50% | — |
| **J: Soft delete + session invalidation** | **0%** | **100%** | **+100pp** |

</div>

**Task C (input validation) fails across all designs** — this is a fundamental implementation difficulty, not a metadata problem. The hardest tasks (H and J) go from complete failure to perfect success.

---

## Quick Start: `/init-agent-repo` Skill

The research produced a Claude Code skill that generates the full agent-native metadata layer for any existing codebase automatically.

**Install**

```bash
mkdir -p ~/.claude/skills/init-agent-repo
cp skill/init-agent-repo/SKILL.md ~/.claude/skills/init-agent-repo/SKILL.md
```

Restart Claude Code, then run `/init-agent-repo` in any project.

**What it generates**

| File | Purpose |
|:-----|:--------|
| `AGENT.md` | Machine-optimized entry point with capability table and mandatory pre-read |
| `.agent/MANIFEST.yaml` | Side effects and known issues declared per operation |
| `.agent/INVARIANTS.md` | Active constraint violations with step-by-step fix instructions |
| `.agent/IMPACT_MAP.yaml` | Cross-module impact chains |
| `.agent/TEST_CONTRACTS.yaml` | Exact test assertions per capability |

---

## Reproducing the Experiment

<details>
<summary><strong>Prerequisites & Setup</strong></summary>

- [Claude Code](https://claude.ai/code) installed and authenticated
- Python 3.8+, Node.js 18+

```bash
cd ablation/traditional && npm install && cd ../..
cd agent-native-repo && npm install && cd ..
```

</details>

<details>
<summary><strong>Run the experiment</strong></summary>

```bash
cd experiment

# Configure REPOS in run_experiment.py, then:
python3 run_experiment.py

# Aggregate results
python3 summarize.py
```

The runner uses `--disallowedTools Bash` to force the agent through discrete Read/Glob/Grep/Write/Edit calls — making tool-call counts reproducible and meaningful.

Results append to `experiment/results/raw_results.jsonl`.

</details>

---

## Repository Structure

```
Repo4Agent/
├── agent-native-repo/         AN-Refined — the final recommended design (5 files)
│   ├── .agent/                MANIFEST · INVARIANTS · IMPACT_MAP · TEST_CONTRACTS
│   ├── AGENT.md
│   └── src/user/ · src/auth/  Domain-organized, one file per operation
├── ablation/                  Supporting material for the ablation study
│   ├── traditional/           Control group: standard Express.js + TypeScript
│   ├── an-baseline/           AN-Baseline: 4-file design (80% pass rate)
│   ├── an-extended/           AN-Extended: 11-file design (80% pass rate)
│   └── README.md              Explains what changed between conditions
├── experiment/
│   ├── run_experiment.py      Experiment runner (claude CLI subprocess)
│   ├── summarize.py           Aggregates → summary.json
│   ├── results/               80 raw runs + aggregated data
│   └── runs/                  Per-task repo snapshots used during runs
├── reports/
│   ├── report_en.md · report_cn.md
│   └── analysis_en.md · analysis_cn.md
├── skill/
│   └── init-agent-repo/SKILL.md
└── docs/                      GitHub Pages demo + research planning docs
```

---

## Further Reading

| Document | Language | Content |
|:---------|:--------:|:--------|
| [Experiment Report](reports/report_en.md) | EN | Methodology, per-task breakdown, hypothesis evaluation |
| [Deep Analysis](reports/analysis_en.md) | EN | 6 mechanisms: premature commit, side effects, test contracts, fix ordering |
| [实验报告](reports/report_cn.md) | 中文 | 方法论、任务分解、假设验证 |
| [深度分析](reports/analysis_cn.md) | 中文 | 6种机制分析 |

---

## Citation

```
Repo4Agent: Agent-Native Repository Design
80-run empirical study, claude-haiku-4-5-20251001, 2026
https://github.com/pinkbubblebubble/Repo4Agent
```

---

<div align="center">

<img src="docs/icon.svg" width="40" height="40" alt="" />

**Repo4Agent** — *Design your codebase for the agent that will work in it.*

<sub>80 experiment runs · 10 tasks · claude-haiku-4-5-20251001</sub>

</div>
