#!/usr/bin/env python3
"""Generate experiment summary from raw_results.jsonl"""
import json
import datetime
from pathlib import Path
from collections import defaultdict

RESULTS_DIR = Path(__file__).parent / "results"
raw_file = RESULTS_DIR / "raw_results.jsonl"

runs = []
with open(raw_file) as f:
    for line in f:
        line = line.strip()
        if line:
            runs.append(json.loads(line))

def avg(vals):
    return sum(vals) / len(vals) if vals else 0.0

groups = defaultdict(list)
for r in runs:
    groups[(r["task_id"], r["repo_type"])].append(r)

task_names = {
    "task-a": "Add Feature: PATCH /users/:id/email",
    "task-b": "Fix Bug: Sessions not invalidated on delete",
    "task-c": "Add Middleware: Input validation on POST /users",
    "task-d": "Add Feature: GET /users list all users",
    "task-e": "Add Feature: PATCH /users/:id/password",
    "task-f": "Fix Bug: Sessions never expire",
    "task-g": "Add Feature: GET /users with email search",
    "task-h": "Add Feature: POST /auth/refresh session token",
    "task-i": "Add Middleware: Request logging",
    "task-j": "Add Feature: DELETE /users/:id soft delete",
}

seen = set()
task_ids = []
for r in runs:
    tid = r["task_id"]
    if tid not in seen:
        seen.add(tid)
        task_ids.append(tid)

def metrics(rs):
    if not rs:
        return {}
    return {
        "n": len(rs),
        "avg_total_calls": round(avg([r["total"] for r in rs]), 1),
        "avg_explore_calls": round(avg([r["exploration"] for r in rs]), 1),
        "avg_read": round(avg([r["read"] for r in rs]), 1),
        "avg_glob": round(avg([r["glob"] for r in rs]), 1),
        "avg_grep": round(avg([r["grep"] for r in rs]), 1),
        "avg_write": round(avg([r["write"] for r in rs]), 1),
        "avg_edit": round(avg([r["edit"] for r in rs]), 1),
        "avg_tokens": round(avg([r["total_tokens"] for r in rs])),
        "avg_cost_usd": round(avg([r["cost_usd"] for r in rs]), 4),
        "test_pass_rate_pct": round(avg([1 if r["tests_passed"] else 0 for r in rs]) * 100, 1),
        "completion_rate_pct": round(avg([1 if r["completed"] else 0 for r in rs]) * 100, 1),
    }

def pct_change(old, new):
    if old == 0:
        return 0.0
    return round((old - new) / old * 100, 1)

all_trad   = [r for r in runs if r["repo_type"] == "traditional"]
all_native = [r for r in runs if r["repo_type"] == "agent-native"]
all_v2     = [r for r in runs if r["repo_type"] == "agent-native-v2"]

tm_all = metrics(all_trad)
nm_all = metrics(all_native)
v2_all = metrics(all_v2)

tool_red_v1   = pct_change(tm_all.get("avg_total_calls", 0), nm_all.get("avg_total_calls", 0))
tool_red_v2   = pct_change(tm_all.get("avg_total_calls", 0), v2_all.get("avg_total_calls", 0))
explore_red_v1 = pct_change(tm_all.get("avg_explore_calls", 0), nm_all.get("avg_explore_calls", 0))
explore_red_v2 = pct_change(tm_all.get("avg_explore_calls", 0), v2_all.get("avg_explore_calls", 0))
token_red_v1  = pct_change(tm_all.get("avg_tokens", 0), nm_all.get("avg_tokens", 0))
token_red_v2  = pct_change(tm_all.get("avg_tokens", 0), v2_all.get("avg_tokens", 0))
success_v1    = round(nm_all.get("test_pass_rate_pct", 0) - tm_all.get("test_pass_rate_pct", 0), 1)
success_v2    = round(v2_all.get("test_pass_rate_pct", 0) - tm_all.get("test_pass_rate_pct", 0), 1)
v1_vs_v2      = round(v2_all.get("test_pass_rate_pct", 0) - nm_all.get("test_pass_rate_pct", 0), 1)

comparisons = []
for tid in task_ids:
    trad   = groups.get((tid, "traditional"), [])
    native = groups.get((tid, "agent-native"), [])
    v2     = groups.get((tid, "agent-native-v2"), [])
    if not trad:
        continue
    tm = metrics(trad)
    nm = metrics(native) if native else {}
    v2m = metrics(v2) if v2 else {}
    comparisons.append({
        "task_id": tid,
        "task_name": task_names.get(tid, tid),
        "traditional": tm,
        "agent_native_v1": nm,
        "agent_native_v2": v2m,
        "v1_success_diff": round(nm.get("test_pass_rate_pct", 0) - tm.get("test_pass_rate_pct", 0), 1) if nm else None,
        "v2_success_diff": round(v2m.get("test_pass_rate_pct", 0) - tm.get("test_pass_rate_pct", 0), 1) if v2m else None,
        "v2_vs_v1_diff":   round(v2m.get("test_pass_rate_pct", 0) - nm.get("test_pass_rate_pct", 0), 1) if (nm and v2m) else None,
    })

summary = {
    "generated_at": datetime.datetime.now().isoformat(),
    "total_runs": len(runs),
    "experiment_config": {
        "model": "claude-haiku-4-5-20251001",
        "tools_disallowed": ["Bash"],
        "tools_measured": ["Read", "Glob", "Grep", "Write", "Edit"],
        "runs_per_task": 2,
        "tasks": list(task_names.values()),
    },
    "overall": {
        "traditional":      tm_all,
        "agent_native_v1":  nm_all,
        "agent_native_v2":  v2_all,
        "v1_vs_trad": {
            "tool_call_change_pct":   tool_red_v1,
            "explore_call_change_pct": explore_red_v1,
            "token_change_pct":        token_red_v1,
            "success_rate_diff_pp":    success_v1,
        },
        "v2_vs_trad": {
            "tool_call_change_pct":   tool_red_v2,
            "explore_call_change_pct": explore_red_v2,
            "token_change_pct":        token_red_v2,
            "success_rate_diff_pp":    success_v2,
        },
        "v2_vs_v1": {
            "success_rate_diff_pp": v1_vs_v2,
        },
    },
    "task_comparisons": comparisons,
}

(RESULTS_DIR / "summary.json").write_text(json.dumps(summary, indent=2))

# ── Print ──────────────────────────────────────────────────────────────────────
W = 80
print("=" * W)
print("EXPERIMENT RESULTS — Traditional vs Agent-Native v1 vs Agent-Native v2")
print("=" * W)
print(f"Total runs: {len(runs)}  "
      f"({len(all_trad)} trad / {len(all_native)} v1 / {len(all_v2)} v2)\n")

def row(label, tv, v1, v2, d1=None, d2=None):
    d1s = f"{d1:+.1f}%" if d1 is not None else "  n/a  "
    d2s = f"{d2:+.1f}%" if d2 is not None else "  n/a  "
    print(f"  {label:<26} {str(tv):>10} {str(v1):>12} {str(v2):>12} {d1s:>9} {d2s:>9}")

print(f"  {'Metric':<26} {'Trad':>10} {'V1 native':>12} {'V2 native':>12} {'v1 Δ':>9} {'v2 Δ':>9}")
print("  " + "-" * 78)
row("Total tool calls",
    tm_all.get("avg_total_calls","?"), nm_all.get("avg_total_calls","?"), v2_all.get("avg_total_calls","?"),
    -tool_red_v1 if tool_red_v1 else None, -tool_red_v2 if tool_red_v2 else None)
row("Exploration calls",
    tm_all.get("avg_explore_calls","?"), nm_all.get("avg_explore_calls","?"), v2_all.get("avg_explore_calls","?"),
    -explore_red_v1 if explore_red_v1 else None, -explore_red_v2 if explore_red_v2 else None)
row("  Read",
    tm_all.get("avg_read","?"), nm_all.get("avg_read","?"), v2_all.get("avg_read","?"))
row("  Glob",
    tm_all.get("avg_glob","?"), nm_all.get("avg_glob","?"), v2_all.get("avg_glob","?"))
row("  Grep",
    tm_all.get("avg_grep","?"), nm_all.get("avg_grep","?"), v2_all.get("avg_grep","?"))
row("Tokens consumed",
    tm_all.get("avg_tokens","?"), nm_all.get("avg_tokens","?"), v2_all.get("avg_tokens","?"),
    -token_red_v1 if token_red_v1 else None, -token_red_v2 if token_red_v2 else None)
row("Test pass rate",
    f"{tm_all.get('test_pass_rate_pct','?')}%",
    f"{nm_all.get('test_pass_rate_pct','?')}%",
    f"{v2_all.get('test_pass_rate_pct','?')}%",
    success_v1 if success_v1 else None,
    success_v2 if success_v2 else None)

print(f"\n  v2 vs v1 pass rate: {v1_vs_v2:+.1f}pp")

print("\nPER-TASK BREAKDOWN:")
for c in comparisons:
    t  = c["traditional"]
    v1 = c["agent_native_v1"]
    v2 = c["agent_native_v2"]
    v1_pp = f"{c['v1_success_diff']:+.0f}pp" if c["v1_success_diff"] is not None else "n/a"
    v2_pp = f"{c['v2_success_diff']:+.0f}pp" if c["v2_success_diff"] is not None else "n/a"
    vv_pp = f"{c['v2_vs_v1_diff']:+.0f}pp" if c["v2_vs_v1_diff"] is not None else "n/a"
    print(f"\n  {c['task_name']}")
    t_rate  = f"{t.get('test_pass_rate_pct','?')}%"
    v1_rate = f"{v1.get('test_pass_rate_pct','?')}%" if v1 else "n/a"
    v2_rate = f"{v2.get('test_pass_rate_pct','?')}%" if v2 else "n/a"
    print(f"    Tests:    Trad={t_rate:<6} V1={v1_rate:<6} V2={v2_rate:<6}  (v1Δ={v1_pp}, v2Δ={v2_pp}, v2vsV1={vv_pp})")
    if v1 and v2:
        print(f"    Explore:  Trad={t.get('avg_explore_calls','?')}  V1={v1.get('avg_explore_calls','?')}  V2={v2.get('avg_explore_calls','?')}")

print(f"\nSummary JSON: {RESULTS_DIR}/summary.json")
