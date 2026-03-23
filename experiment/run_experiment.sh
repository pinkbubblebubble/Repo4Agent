#!/usr/bin/env bash
# repo4agent Experiment Runner
# Measures: Read/Glob/Grep calls (exploration) vs Write/Edit calls (modification)
# Bash tool disallowed to force discrete, measurable file operations

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNS_DIR="$BASE_DIR/experiment/runs"
RESULTS_DIR="$BASE_DIR/experiment/results"
PARSE_SCRIPT="$SCRIPT_DIR/parse_stream.py"
mkdir -p "$RESULTS_DIR"

RESULTS_FILE="$RESULTS_DIR/raw_results.jsonl"
> "$RESULTS_FILE"

TASK_A="Add a new PATCH /users/:id/email endpoint that updates only the email field. The endpoint should require authentication. Work only within the current repository directory. When implementation is complete, output the exact text: TASK_COMPLETE"
TASK_B="There is a security bug: when a user is deleted, their active sessions are not invalidated. Fix this so that deleting a user also removes all their sessions. Work only within the current repository directory. When implementation is complete, output the exact text: TASK_COMPLETE"
TASK_C="Add input validation to the POST /users endpoint. Validate that email is a valid email format and password is at least 8 characters. Return 400 with descriptive error messages if validation fails. Work only within the current repository directory. When implementation is complete, output the exact text: TASK_COMPLETE"

run_one() {
  local repo_type="$1"
  local task_id="$2"
  local task_prompt="$3"
  local run_num="$4"

  local src_dir="$RUNS_DIR/${repo_type}-task-${task_id}"
  local temp_dir
  temp_dir=$(mktemp -d /tmp/agent-exp-XXXXXX)
  rsync -a --exclude=node_modules --exclude=dist "$src_dir/" "$temp_dir/"
  ln -sf "$src_dir/node_modules" "$temp_dir/node_modules" 2>/dev/null || true

  local start_ts end_ts duration_ms
  start_ts=$(date +%s%3N)

  # Run claude, pipe stream-json to parse_stream.py
  local metrics_json
  metrics_json=$(cd "$temp_dir" && claude \
    --dangerously-skip-permissions \
    --model haiku \
    --output-format stream-json \
    --verbose \
    --max-budget-usd 1.00 \
    --disallowedTools "Bash" \
    -p "$task_prompt" \
    2>/dev/null | python3 "$PARSE_SCRIPT")

  end_ts=$(date +%s%3N)
  duration_ms=$(( end_ts - start_ts ))

  # Run tests on the modified copy
  local tests_passed="false"
  local failed_count=0
  if (cd "$temp_dir" && npm test > /tmp/test_out_$$.txt 2>&1); then
    tests_passed="true"
  else
    failed_count=$(grep -c "FAIL\|●" /tmp/test_out_$$.txt 2>/dev/null || true)
  fi
  rm -f /tmp/test_out_$$.txt
  rm -rf "$temp_dir"

  # Merge metrics with test results
  echo "$metrics_json" | python3 -c "
import json, sys
m = json.load(sys.stdin)
m['repo_type'] = '$repo_type'
m['task_id'] = 'task-$task_id'
m['run_number'] = $run_num
m['tests_passed'] = $tests_passed
m['failed_test_count'] = $failed_count
m['duration_ms'] = $duration_ms
print(json.dumps(m))
"
}

echo "=== repo4agent: Agent-Native vs Traditional Repo Experiment ==="
echo "Model: claude-haiku-4-5-20251001 | Bash disallowed (measures Read/Glob/Grep)"
echo "Runs per task: 2 | Tasks: 3 | Total: 12 runs"
echo ""

RUNS_PER_TASK=2

for task_id in a b c; do
  case "$task_id" in
    a) task_name="Add Feature: PATCH /users/:id/email" ; task_prompt="$TASK_A" ;;
    b) task_name="Fix Bug: Sessions not invalidated on delete" ; task_prompt="$TASK_B" ;;
    c) task_name="Add Middleware: Input validation" ; task_prompt="$TASK_C" ;;
  esac

  echo "--- Task $(echo "$task_id" | tr 'a-z' 'A-Z'): $task_name ---"

  for run in $(seq 1 $RUNS_PER_TASK); do
    for repo in "traditional" "agent-native"; do
      echo -n "  [$repo] run $run/$RUNS_PER_TASK ... "

      result=$(run_one "$repo" "$task_id" "$task_prompt" "$run" 2>/dev/null) || result=""

      if [ -z "$result" ]; then
        echo "ERROR: empty result"
        continue
      fi

      echo "$result" >> "$RESULTS_FILE"

      total=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total',0))")
      explore=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('exploration',0))")
      tests=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('tests_passed') else 'FAIL')")
      done_flag=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print('done' if d.get('completed') else 'incomplete')")
      dur=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d.get('duration_ms',0)/1000:.1f}s\")")
      echo "total=$total (explore=$explore) | tests=$tests | $done_flag | $dur"
    done
  done
  echo ""
done

run_count=$(wc -l < "$RESULTS_FILE" | tr -d ' ')
echo "Raw results: $RESULTS_FILE ($run_count runs)"
echo ""

if [ "$run_count" -eq 0 ]; then
  echo "ERROR: no results recorded"
  exit 1
fi

# Generate summary
python3 "$SCRIPT_DIR/summarize.py"
