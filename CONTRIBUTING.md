# Contributing to Repo4Agent

## Ways to contribute

- **Reproduce the experiment** with a different model or task set and share results
- **Improve the skill** — open a PR against `skill/init-agent-repo/SKILL.md`
- **Report issues** — broken skill behavior, outdated metadata in the reference repos
- **Translate** reports or README into other languages

## Reproducing the experiment

**Requirements**: Claude Code installed and authenticated, Python 3.8+, Node.js 18+

```bash
# Install dependencies for both repos
cd ablation/traditional && npm install && cd ../..
cd agent-native-repo && npm install && cd ..

# Set up experiment run directories (copy from source repos)
# See experiment/runs/README.md for directory naming conventions

# Run experiment
cd experiment
python3 run_experiment.py

# Aggregate results
python3 summarize.py
```

The runner uses `--disallowedTools Bash` to force the agent through discrete Read/Glob/Grep/Write/Edit calls, making tool-call counts reproducible and meaningful.

Results append to `experiment/results/raw_results.jsonl`.

## Improving the skill

The skill lives at `skill/init-agent-repo/SKILL.md`. It is a Claude Code skill — a markdown file that gets loaded as a system prompt when the user runs `/init-agent-repo`.

When editing the skill:
- Keep instructions actionable, not descriptive
- Do not add metadata beyond the 5-file set — ablation showed this causes regressions
- Test by running `/init-agent-repo` on a real project and verifying the generated files are useful

## Project structure

```
agent-native-repo/     Final recommended design (AN-Refined, 5 files)
ablation/              Supporting material: all three ablation conditions
experiment/            Runner, results, and per-task repo snapshots
reports/               Full experiment reports (EN + CN)
skill/                 Claude Code skill
docs/                  GitHub Pages demo + research planning docs
```
