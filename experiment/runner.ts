import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  RunResult,
  ToolCallCounts,
  TokenCounts,
  createEmptyToolCounts,
  createEmptyTokenCounts,
} from './metrics';
import { ExperimentTask } from './tasks';

const SYSTEM_PROMPT =
  'You are a software engineer. Complete the given task by reading the repository files and making the necessary changes. Use the available tools to read files and understand the codebase before making changes.';

const MAX_TURNS = 30;

// Tool definitions
function getTools(): Anthropic.Tool[] {
  return [
    {
      name: 'list_files',
      description: 'Lists files in a directory. Returns a list of file paths.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list files in',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'read_file',
      description: 'Reads a file and returns its content.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'File path to read',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Writes content to a file. Creates the file if it does not exist.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'File path to write to',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  ];
}

// Tool execution against a working copy directory
function executeTool(
  toolName: string,
  toolInput: Record<string, string>,
  workDir: string
): string {
  try {
    if (toolName === 'list_files') {
      const targetPath = path.resolve(workDir, toolInput.path);
      if (!fs.existsSync(targetPath)) {
        return `Error: Path does not exist: ${toolInput.path}`;
      }
      const stat = fs.statSync(targetPath);
      if (stat.isFile()) {
        return targetPath;
      }
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      const result = entries.map(e => {
        const fullPath = path.join(toolInput.path, e.name);
        return e.isDirectory() ? `${fullPath}/` : fullPath;
      });
      return result.join('\n') || '(empty directory)';
    }

    if (toolName === 'read_file') {
      const targetPath = path.resolve(workDir, toolInput.path);
      if (!fs.existsSync(targetPath)) {
        return `Error: File does not exist: ${toolInput.path}`;
      }
      return fs.readFileSync(targetPath, 'utf-8');
    }

    if (toolName === 'write_file') {
      const targetPath = path.resolve(workDir, toolInput.path);
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, toolInput.content, 'utf-8');
      return `Successfully wrote to ${toolInput.path}`;
    }

    return `Unknown tool: ${toolName}`;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return `Error executing ${toolName}: ${message}`;
  }
}

// Copy repo to a temp working directory
function copyRepoToTemp(repoPath: string, tempBase: string): string {
  const tempDir = path.join(tempBase, `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // Use rsync to copy (excluding node_modules)
  execSync(`rsync -a --exclude=node_modules --exclude=dist --exclude='.git' "${repoPath}/" "${tempDir}/"`, {
    stdio: 'pipe',
  });

  // Create symlink for node_modules to avoid re-installing
  const srcNodeModules = path.join(repoPath, 'node_modules');
  const dstNodeModules = path.join(tempDir, 'node_modules');
  if (fs.existsSync(srcNodeModules) && !fs.existsSync(dstNodeModules)) {
    fs.symlinkSync(srcNodeModules, dstNodeModules);
  }

  return tempDir;
}

// Run tests in a directory
function runTests(dir: string): { passed: boolean; output: string; failedTests: string[] } {
  try {
    const output = execSync('npm test 2>&1', {
      cwd: dir,
      timeout: 120000,
      encoding: 'utf-8',
    });
    return { passed: true, output, failedTests: [] };
  } catch (err: unknown) {
    const output = err instanceof Error && 'stdout' in err
      ? String((err as NodeJS.ErrnoException & { stdout: string }).stdout)
      : String(err);

    // Parse failed test names from jest output
    const failedTests: string[] = [];
    const failPattern = /● (.+)/g;
    let match;
    while ((match = failPattern.exec(output)) !== null) {
      failedTests.push(match[1]);
    }

    return { passed: false, output, failedTests };
  }
}

export async function runExperiment(
  client: Anthropic,
  task: ExperimentTask,
  repoPath: string,
  repoType: 'traditional' | 'agent-native',
  runNumber: number,
  tempBase: string
): Promise<RunResult> {
  const startTime = Date.now();
  const toolCalls: ToolCallCounts = createEmptyToolCounts();
  const tokens: TokenCounts = createEmptyTokenCounts();

  // Copy repo to temp dir for this run
  const workDir = copyRepoToTemp(repoPath, tempBase);

  // Get entry file to seed context
  const entryFile = repoType === 'agent-native' ? 'AGENT.md' : 'README.md';
  let entryContent = '';
  try {
    entryContent = fs.readFileSync(path.join(workDir, entryFile), 'utf-8');
  } catch {
    entryContent = '(entry file not found)';
  }

  const initialUserMessage = `You are working on a repository located at the current working directory.

Entry file (${entryFile}):
\`\`\`
${entryContent}
\`\`\`

Task: ${task.prompt}

Use the available tools to explore the codebase, understand the structure, and implement the required changes. When you are done, say "TASK COMPLETE".`;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: initialUserMessage },
  ];

  let agentTurns = 0;
  let completed = false;
  let error: string | undefined;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      agentTurns++;

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: getTools(),
        messages,
      });

      // Accumulate tokens
      tokens.inputTokens += response.usage.input_tokens;
      tokens.outputTokens += response.usage.output_tokens;
      tokens.totalTokens += response.usage.input_tokens + response.usage.output_tokens;

      // Check if task is complete
      if (response.stop_reason === 'end_turn') {
        const textContent = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as Anthropic.TextBlock).text)
          .join('');

        if (textContent.includes('TASK COMPLETE')) {
          completed = true;
          break;
        }

        // No tool calls and no TASK COMPLETE - agent might be stuck
        const hasToolUse = response.content.some(b => b.type === 'tool_use');
        if (!hasToolUse) {
          completed = true; // Agent finished without explicit marker
          break;
        }
      }

      if (response.stop_reason === 'tool_use') {
        // Process tool calls
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        // Add assistant message
        messages.push({ role: 'assistant', content: response.content });

        // Process each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const toolInput = toolUse.input as Record<string, string>;

          // Count tool calls
          if (toolUse.name === 'list_files') toolCalls.list_files++;
          else if (toolUse.name === 'read_file') toolCalls.read_file++;
          else if (toolUse.name === 'write_file') toolCalls.write_file++;
          toolCalls.total++;

          const result = executeTool(toolUse.name, toolInput, workDir);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        messages.push({ role: 'user', content: toolResults });
      } else if (response.stop_reason === 'end_turn') {
        // Add assistant message and stop
        messages.push({ role: 'assistant', content: response.content });
        completed = true;
        break;
      }
    }
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Run tests on the modified copy
  const testResult = runTests(workDir);

  // Cleanup temp dir
  try {
    execSync(`rm -rf "${workDir}"`, { stdio: 'pipe' });
  } catch {
    // ignore cleanup errors
  }

  return {
    repoType,
    taskId: task.id,
    runNumber,
    toolCalls,
    tokens,
    testsPassed: testResult.passed,
    testOutput: testResult.output.slice(0, 2000), // truncate
    failedTests: testResult.failedTests,
    durationMs: Date.now() - startTime,
    agentTurns,
    completed,
    error,
  };
}
