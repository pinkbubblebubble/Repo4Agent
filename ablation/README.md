# Ablation Study — Supporting Material

This directory contains the three repository designs tested in the ablation study, plus the traditional baseline.

| Condition | Directory | Files | Pass Rate |
|:----------|:----------|:-----:|:---------:|
| Traditional (baseline) | `traditional/` | — | 55% |
| AN-Baseline | `an-baseline/` | 4 | 80% |
| AN-Extended | `an-extended/` | 11 | 80% |
| **AN-Refined** | `agent-native-repo/` (root) | **5** | **85%** |

**AN-Refined is the recommended design.** It lives at the repo root as `agent-native-repo/` and is what the `/init-agent-repo` skill generates.

## What changed between conditions

**AN-Baseline → AN-Extended**: Added 7 more metadata files (file index, route map, concept index, patterns, status, changelog, commit protocol). Pass rate did not improve; agents started skimming instead of reading carefully.

**AN-Extended → AN-Refined**: Stripped back to 5 files. Added `TEST_CONTRACTS.yaml` (the one genuinely useful addition from Extended). Rewrote INVARIANTS.md fix instructions to include explicit step-by-step implementation order. Pass rate improved to 85%.

## Experiment runs

Each condition was run 20 times (2 runs × 10 tasks). Raw results are in `../experiment/results/raw_results.jsonl`.
