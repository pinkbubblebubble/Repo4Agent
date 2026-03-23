export interface ToolCallCounts {
  list_files: number;
  read_file: number;
  write_file: number;
  total: number;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface RunResult {
  repoType: 'traditional' | 'agent-native';
  taskId: string;
  runNumber: number;
  toolCalls: ToolCallCounts;
  tokens: TokenCounts;
  testsPassed: boolean;
  testOutput: string;
  failedTests: string[];
  durationMs: number;
  agentTurns: number;
  completed: boolean;
  error?: string;
}

export interface TaskAverages {
  taskId: string;
  repoType: 'traditional' | 'agent-native';
  avgToolCalls: ToolCallCounts;
  avgTokens: TokenCounts;
  successRate: number;
  avgDurationMs: number;
  avgAgentTurns: number;
  runs: RunResult[];
}

export function createEmptyToolCounts(): ToolCallCounts {
  return { list_files: 0, read_file: 0, write_file: 0, total: 0 };
}

export function createEmptyTokenCounts(): TokenCounts {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function averageToolCounts(counts: ToolCallCounts[]): ToolCallCounts {
  if (counts.length === 0) return createEmptyToolCounts();
  const n = counts.length;
  return {
    list_files: Math.round(counts.reduce((s, c) => s + c.list_files, 0) / n),
    read_file: Math.round(counts.reduce((s, c) => s + c.read_file, 0) / n),
    write_file: Math.round(counts.reduce((s, c) => s + c.write_file, 0) / n),
    total: Math.round(counts.reduce((s, c) => s + c.total, 0) / n),
  };
}

export function averageTokenCounts(counts: TokenCounts[]): TokenCounts {
  if (counts.length === 0) return createEmptyTokenCounts();
  const n = counts.length;
  return {
    inputTokens: Math.round(counts.reduce((s, c) => s + c.inputTokens, 0) / n),
    outputTokens: Math.round(counts.reduce((s, c) => s + c.outputTokens, 0) / n),
    totalTokens: Math.round(counts.reduce((s, c) => s + c.totalTokens, 0) / n),
  };
}

export function computeAverages(runs: RunResult[]): TaskAverages {
  if (runs.length === 0) {
    throw new Error('No runs to average');
  }

  const { taskId, repoType } = runs[0];
  return {
    taskId,
    repoType,
    avgToolCalls: averageToolCounts(runs.map(r => r.toolCalls)),
    avgTokens: averageTokenCounts(runs.map(r => r.tokens)),
    successRate: runs.filter(r => r.testsPassed).length / runs.length,
    avgDurationMs: runs.reduce((s, r) => s + r.durationMs, 0) / runs.length,
    avgAgentTurns: runs.reduce((s, r) => s + r.agentTurns, 0) / runs.length,
    runs,
  };
}
