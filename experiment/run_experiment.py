#!/usr/bin/env python3
"""
repo4agent Experiment Runner
Calls `claude` CLI as a subprocess for each experiment run.
Measures: Read/Glob/Grep calls (exploration) vs Write/Edit (modification)
"""
import json
import subprocess
import shutil
import tempfile
import os
import datetime
import sys
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent.parent
RUNS_DIR = BASE_DIR / "experiment" / "runs"
RESULTS_DIR = BASE_DIR / "experiment" / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_FILE = RESULTS_DIR / "raw_results.jsonl"
# Tasks already completed in previous runs (skip them)
SKIP_TASK_IDS = set()  # run all tasks for v2 comparison

SUFFIX = (
    " Work only within the current repository directory. "
    "When implementation is complete, output the exact text: TASK_COMPLETE"
)

TASKS = [
    {
        "id": "a",
        "name": "Add Feature: PATCH /users/:id/email",
        "prompt": (
            "Add a new PATCH /users/:id/email endpoint that updates only the email field. "
            "The endpoint should require authentication." + SUFFIX
        ),
    },
    {
        "id": "b",
        "name": "Fix Bug: Sessions not invalidated on delete",
        "prompt": (
            "There is a security bug: when a user is deleted, their active sessions are not invalidated. "
            "Fix this so that deleting a user also removes all their sessions." + SUFFIX
        ),
    },
    {
        "id": "c",
        "name": "Add Middleware: Input validation on POST /users",
        "prompt": (
            "Add input validation to the POST /users endpoint. "
            "Validate that email is a valid email format and password is at least 8 characters. "
            "Return 400 with descriptive error messages if validation fails." + SUFFIX
        ),
    },
    {
        "id": "d",
        "name": "Add Feature: GET /users list all users",
        "prompt": (
            "Add a GET /users endpoint that returns all users as a JSON array. "
            "Each user object must NOT include the password field. "
            "The route must require authentication." + SUFFIX
        ),
    },
    {
        "id": "e",
        "name": "Add Feature: PATCH /users/:id/password",
        "prompt": (
            "Add a PATCH /users/:id/password endpoint that allows a user to change their password. "
            "The request body must include currentPassword and newPassword. "
            "Verify currentPassword matches the stored hash before updating. "
            "Return 400 if currentPassword is wrong. "
            "The endpoint must require authentication." + SUFFIX
        ),
    },
    {
        "id": "f",
        "name": "Fix Bug: Sessions never expire",
        "prompt": (
            "Sessions in this system never expire, which is a security risk. "
            "Add a 1-hour expiration to all sessions. "
            "When a request arrives with a session token that was created more than 1 hour ago, "
            "treat it as invalid and return 401 Unauthorized." + SUFFIX
        ),
    },
    {
        "id": "g",
        "name": "Add Feature: GET /users with email search",
        "prompt": (
            "Add a GET /users endpoint that supports an optional ?email= query parameter. "
            "If the email param is provided, return the single matching user (or 404 if not found). "
            "If no email param is provided, return all users. "
            "Never include passwords in the response. "
            "Require authentication." + SUFFIX
        ),
    },
    {
        "id": "h",
        "name": "Add Feature: POST /auth/refresh session token",
        "prompt": (
            "Add a POST /auth/refresh endpoint. "
            "It takes a valid session token (from Authorization header) and returns a brand-new session token. "
            "The old token must be invalidated after refresh. "
            "Return 401 if the provided token is invalid or already expired." + SUFFIX
        ),
    },
    {
        "id": "i",
        "name": "Add Middleware: Request logging",
        "prompt": (
            "Add a request logging middleware that runs on every route. "
            "It must log: ISO timestamp, HTTP method, path, response status code, and duration in milliseconds. "
            "Log format: [timestamp] METHOD /path -> STATUS (Xms). "
            "Apply it globally before all routes." + SUFFIX
        ),
    },
    {
        "id": "j",
        "name": "Add Feature: DELETE /users/:id soft delete",
        "prompt": (
            "Change the DELETE /users/:id endpoint from hard delete to soft delete. "
            "Instead of removing the user, add a deletedAt timestamp field to the user record. "
            "Soft-deleted users should not be returned by GET /users/:id (return 404). "
            "Also invalidate all their active sessions on soft delete. "
            "Require authentication." + SUFFIX
        ),
    },
]

# For v2 experiment: only run the new v2 repo (traditional + v1 results already in raw_results.jsonl)
REPOS = ["agent-native-v2"]
RUNS_PER_TASK = 2


def parse_stream(stream_text: str) -> dict:
    """Parse claude stream-json output and extract metrics."""
    from collections import Counter
    counts = Counter()
    completed = False

    for line in stream_text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
            etype = ev.get("type")
            if etype == "assistant":
                for block in ev.get("message", {}).get("content", []):
                    if block.get("type") == "tool_use":
                        counts[block["name"]] += 1
                    if block.get("type") == "text" and "TASK_COMPLETE" in block.get("text", ""):
                        completed = True
            elif etype == "result":
                if "TASK_COMPLETE" in str(ev.get("result", "")):
                    completed = True
                usage = ev.get("usage", {})
                counts["_input"] = (
                    usage.get("input_tokens", 0)
                    + usage.get("cache_read_input_tokens", 0)
                    + usage.get("cache_creation_input_tokens", 0)
                )
                counts["_output"] = usage.get("output_tokens", 0)
                try:
                    counts["_cost"] = float(str(ev.get("total_cost_usd", 0)))
                except (ValueError, TypeError):
                    counts["_cost"] = 0.0
        except Exception:
            pass

    read = counts.get("Read", 0)
    glob_c = counts.get("Glob", 0)
    grep = counts.get("Grep", 0)
    write = counts.get("Write", 0)
    edit = counts.get("Edit", 0)
    exploration = read + glob_c + grep
    modification = write + edit
    total = exploration + modification

    return {
        "read": read,
        "glob": glob_c,
        "grep": grep,
        "write": write,
        "edit": edit,
        "exploration": exploration,
        "modification": modification,
        "total": total,
        "input_tokens": counts.get("_input", 0),
        "output_tokens": counts.get("_output", 0),
        "total_tokens": counts.get("_input", 0) + counts.get("_output", 0),
        "cost_usd": counts.get("_cost", 0.0),
        "completed": completed,
    }


def run_tests(work_dir: Path) -> tuple[bool, int]:
    """Run npm test and return (passed, failed_count)."""
    try:
        result = subprocess.run(
            ["npm", "test"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            return True, 0
        # Count failed tests
        output = result.stdout + result.stderr
        failed = output.count("● ") + output.count("FAIL")
        return False, max(failed, 1)
    except subprocess.TimeoutExpired:
        return False, -1
    except Exception as e:
        return False, -1


def run_one(repo_type: str, task_id: str, task_prompt: str, run_num: int) -> dict:
    src_dir = RUNS_DIR / f"{repo_type}-task-{task_id}"

    # Create fresh temp copy
    temp_dir = Path(tempfile.mkdtemp(prefix="agent-exp-"))
    try:
        # Copy repo files (exclude node_modules)
        subprocess.run(
            ["rsync", "-a", "--exclude=node_modules", "--exclude=dist",
             str(src_dir) + "/", str(temp_dir) + "/"],
            check=True, capture_output=True
        )
        # Symlink node_modules
        nm_src = src_dir / "node_modules"
        nm_dst = temp_dir / "node_modules"
        if nm_src.exists() and not nm_dst.exists():
            nm_dst.symlink_to(nm_src)

        start = datetime.datetime.now()

        # Run claude
        proc = subprocess.run(
            [
                "claude",
                "--dangerously-skip-permissions",
                "--model", "haiku",
                "--output-format", "stream-json",
                "--verbose",
                "--max-budget-usd", "1.00",
                "--disallowedTools", "Bash",
                "-p", task_prompt,
            ],
            cwd=temp_dir,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min per run
        )

        duration_ms = int((datetime.datetime.now() - start).total_seconds() * 1000)
        stream_text = proc.stdout + proc.stderr

        metrics = parse_stream(stream_text)
        tests_passed, failed_count = run_tests(temp_dir)

        result = {
            "repo_type": repo_type,
            "task_id": f"task-{task_id}",
            "run_number": run_num,
            **metrics,
            "tests_passed": tests_passed,
            "failed_test_count": failed_count,
            "duration_ms": duration_ms,
        }
        return result

    except subprocess.TimeoutExpired:
        return {
            "repo_type": repo_type, "task_id": f"task-{task_id}",
            "run_number": run_num, "error": "timeout",
            "total": 0, "exploration": 0, "modification": 0,
            "read": 0, "glob": 0, "grep": 0, "write": 0, "edit": 0,
            "total_tokens": 0, "input_tokens": 0, "output_tokens": 0,
            "cost_usd": 0.0, "completed": False,
            "tests_passed": False, "failed_test_count": -1, "duration_ms": 300000,
        }
    except Exception as e:
        return {
            "repo_type": repo_type, "task_id": f"task-{task_id}",
            "run_number": run_num, "error": str(e),
            "total": 0, "exploration": 0, "modification": 0,
            "read": 0, "glob": 0, "grep": 0, "write": 0, "edit": 0,
            "total_tokens": 0, "input_tokens": 0, "output_tokens": 0,
            "cost_usd": 0.0, "completed": False,
            "tests_passed": False, "failed_test_count": -1, "duration_ms": 0,
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    tasks_to_run = [t for t in TASKS if f"task-{t['id']}" not in SKIP_TASK_IDS]
    print("=== repo4agent: Agent-Native vs Traditional Repo Experiment ===")
    print("Model: claude-haiku-4-5-20251001 | Bash disallowed (forces Read/Glob/Grep)")
    print(f"Running tasks: {[t['id'] for t in tasks_to_run]} | Appending to existing results")
    print(f"Runs per task: {RUNS_PER_TASK} | New runs: {RUNS_PER_TASK * len(tasks_to_run) * len(REPOS)}")
    print()

    all_results = []

    with open(RESULTS_FILE, "a") as out_f:  # append mode
        for task in tasks_to_run:
            print(f"--- Task {task['id'].upper()}: {task['name']} ---")
            for run_num in range(1, RUNS_PER_TASK + 1):
                for repo in REPOS:
                    print(f"  [{repo}] run {run_num}/{RUNS_PER_TASK} ... ", end="", flush=True)
                    result = run_one(repo, task["id"], task["prompt"], run_num)
                    out_f.write(json.dumps(result) + "\n")
                    out_f.flush()
                    all_results.append(result)

                    if "error" in result:
                        print(f"ERROR: {result['error']}")
                    else:
                        tests = "PASS" if result["tests_passed"] else "FAIL"
                        done = "done" if result["completed"] else "incomplete"
                        dur = f"{result['duration_ms']/1000:.1f}s"
                        print(f"total={result['total']} (explore={result['exploration']}) | tests={tests} | {done} | {dur}")
            print()

    print(f"Raw results: {RESULTS_FILE} ({len(all_results)} runs)")
    print()

    # Summarize
    sys.path.insert(0, str(BASE_DIR / "experiment"))
    import summarize  # noqa: F401 - runs as side effect


if __name__ == "__main__":
    main()
