import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runExperiment } from './runner';
import { TASKS } from './tasks';
import { RunResult, TaskAverages, computeAverages } from './metrics';

const RUNS_PER_TASK = 3;
const RESULTS_DIR = path.join(__dirname, 'results');

const REPO_BASE = path.join(__dirname, '..');
const TRADITIONAL_REPO = path.join(REPO_BASE, 'traditional-repo');
const AGENT_NATIVE_REPO = path.join(REPO_BASE, 'agent-native-repo');

interface Summary {
  generatedAt: string;
  hypotheses: {
    H1: { description: string; threshold: string; result: string };
    H2: { description: string; threshold: string; result: string };
    H3: { description: string; threshold: string; result: string };
  };
  taskComparisons: TaskComparison[];
  overallComparison: {
    traditionalAvgToolCalls: number;
    agentNativeAvgToolCalls: number;
    toolCallReduction: string;
    traditionalSuccessRate: string;
    agentNativeSuccessRate: string;
    successRateImprovement: string;
    traditionalAvgTokens: number;
    agentNativeAvgTokens: number;
    tokenReduction: string;
  };
}

interface TaskComparison {
  taskId: string;
  taskName: string;
  traditional: TaskAverages;
  agentNative: TaskAverages;
  toolCallReduction: string;
  tokenReduction: string;
  successRateDiff: string;
}

async function main() {
  console.log('=== Agent-Native vs Traditional Repo Experiment ===\n');

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not set. Skipping live experiment, writing placeholder results.\n');
    writePlaceholderResults();
    return;
  }

  // Ensure results directory exists
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const client = new Anthropic({ apiKey });
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-exp-'));

  console.log(`Temp directory: ${tempBase}`);
  console.log(`Traditional repo: ${TRADITIONAL_REPO}`);
  console.log(`Agent-native repo: ${AGENT_NATIVE_REPO}\n`);

  const allRuns: RunResult[] = [];
  const taskAveragesMap: Map<string, { traditional: TaskAverages; agentNative: TaskAverages }> = new Map();

  for (const task of TASKS) {
    console.log(`\n--- Task: ${task.name} ---`);

    const traditionalRuns: RunResult[] = [];
    const agentNativeRuns: RunResult[] = [];

    for (let run = 1; run <= RUNS_PER_TASK; run++) {
      console.log(`  Traditional run ${run}/${RUNS_PER_TASK}...`);
      try {
        const result = await runExperiment(
          client,
          task,
          TRADITIONAL_REPO,
          'traditional',
          run,
          tempBase
        );
        traditionalRuns.push(result);
        allRuns.push(result);
        console.log(`    Tool calls: ${result.toolCalls.total}, Tests: ${result.testsPassed ? 'PASS' : 'FAIL'}, Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
      } catch (err) {
        console.error(`    ERROR: ${err}`);
      }
    }

    for (let run = 1; run <= RUNS_PER_TASK; run++) {
      console.log(`  Agent-native run ${run}/${RUNS_PER_TASK}...`);
      try {
        const result = await runExperiment(
          client,
          task,
          AGENT_NATIVE_REPO,
          'agent-native',
          run,
          tempBase
        );
        agentNativeRuns.push(result);
        allRuns.push(result);
        console.log(`    Tool calls: ${result.toolCalls.total}, Tests: ${result.testsPassed ? 'PASS' : 'FAIL'}, Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
      } catch (err) {
        console.error(`    ERROR: ${err}`);
      }
    }

    if (traditionalRuns.length > 0 && agentNativeRuns.length > 0) {
      const traditionalAvg = computeAverages(traditionalRuns);
      const agentNativeAvg = computeAverages(agentNativeRuns);
      taskAveragesMap.set(task.id, { traditional: traditionalAvg, agentNative: agentNativeAvg });

      console.log(`\n  Results for ${task.name}:`);
      console.log(`    Traditional: ${traditionalAvg.avgToolCalls.total} tool calls avg, ${(traditionalAvg.successRate * 100).toFixed(0)}% success`);
      console.log(`    Agent-native: ${agentNativeAvg.avgToolCalls.total} tool calls avg, ${(agentNativeAvg.successRate * 100).toFixed(0)}% success`);
    }
  }

  // Save raw results
  const rawResultsPath = path.join(RESULTS_DIR, 'raw_results.json');
  fs.writeFileSync(rawResultsPath, JSON.stringify(allRuns, null, 2));
  console.log(`\nRaw results saved to: ${rawResultsPath}`);

  // Generate summary
  const taskComparisons: TaskComparison[] = [];
  for (const task of TASKS) {
    const entry = taskAveragesMap.get(task.id);
    if (!entry) continue;

    const { traditional, agentNative } = entry;
    const toolCallReductionPct = traditional.avgToolCalls.total > 0
      ? (((traditional.avgToolCalls.total - agentNative.avgToolCalls.total) / traditional.avgToolCalls.total) * 100).toFixed(1)
      : '0';
    const tokenReductionPct = traditional.avgTokens.totalTokens > 0
      ? (((traditional.avgTokens.totalTokens - agentNative.avgTokens.totalTokens) / traditional.avgTokens.totalTokens) * 100).toFixed(1)
      : '0';

    taskComparisons.push({
      taskId: task.id,
      taskName: task.name,
      traditional,
      agentNative,
      toolCallReduction: `${toolCallReductionPct}%`,
      tokenReduction: `${tokenReductionPct}%`,
      successRateDiff: `${((agentNative.successRate - traditional.successRate) * 100).toFixed(1)}%`,
    });
  }

  // Overall averages
  const traditionalAllRuns = allRuns.filter(r => r.repoType === 'traditional');
  const agentNativeAllRuns = allRuns.filter(r => r.repoType === 'agent-native');

  const traditionalAvgToolCalls = traditionalAllRuns.length > 0
    ? traditionalAllRuns.reduce((s, r) => s + r.toolCalls.total, 0) / traditionalAllRuns.length
    : 0;
  const agentNativeAvgToolCalls = agentNativeAllRuns.length > 0
    ? agentNativeAllRuns.reduce((s, r) => s + r.toolCalls.total, 0) / agentNativeAllRuns.length
    : 0;
  const traditionalSuccessRate = traditionalAllRuns.length > 0
    ? traditionalAllRuns.filter(r => r.testsPassed).length / traditionalAllRuns.length
    : 0;
  const agentNativeSuccessRate = agentNativeAllRuns.length > 0
    ? agentNativeAllRuns.filter(r => r.testsPassed).length / agentNativeAllRuns.length
    : 0;
  const traditionalAvgTokens = traditionalAllRuns.length > 0
    ? traditionalAllRuns.reduce((s, r) => s + r.tokens.totalTokens, 0) / traditionalAllRuns.length
    : 0;
  const agentNativeAvgTokens = agentNativeAllRuns.length > 0
    ? agentNativeAllRuns.reduce((s, r) => s + r.tokens.totalTokens, 0) / agentNativeAllRuns.length
    : 0;

  const toolCallReductionPct = traditionalAvgToolCalls > 0
    ? (((traditionalAvgToolCalls - agentNativeAvgToolCalls) / traditionalAvgToolCalls) * 100).toFixed(1)
    : '0';
  const tokenReductionPct = traditionalAvgTokens > 0
    ? (((traditionalAvgTokens - agentNativeAvgTokens) / traditionalAvgTokens) * 100).toFixed(1)
    : '0';

  // Hypothesis checks
  const h1Met = parseFloat(toolCallReductionPct) >= 30;
  const h3Met = (agentNativeSuccessRate - traditionalSuccessRate) * 100 >= 20;

  const summary: Summary = {
    generatedAt: new Date().toISOString(),
    hypotheses: {
      H1: {
        description: 'Agent-native repo reduces tool calls by >= 30%',
        threshold: '30%',
        result: `${toolCallReductionPct}% reduction - ${h1Met ? 'SUPPORTED' : 'NOT SUPPORTED'}`,
      },
      H2: {
        description: 'Side-effect break rate decreases by >= 50%',
        threshold: '50%',
        result: 'Manual assessment required (tracked via test pass rates)',
      },
      H3: {
        description: 'First-attempt success rate improves by >= 20%',
        threshold: '20%',
        result: `${((agentNativeSuccessRate - traditionalSuccessRate) * 100).toFixed(1)}% improvement - ${h3Met ? 'SUPPORTED' : 'NOT SUPPORTED'}`,
      },
    },
    taskComparisons,
    overallComparison: {
      traditionalAvgToolCalls: Math.round(traditionalAvgToolCalls),
      agentNativeAvgToolCalls: Math.round(agentNativeAvgToolCalls),
      toolCallReduction: `${toolCallReductionPct}%`,
      traditionalSuccessRate: `${(traditionalSuccessRate * 100).toFixed(1)}%`,
      agentNativeSuccessRate: `${(agentNativeSuccessRate * 100).toFixed(1)}%`,
      successRateImprovement: `${((agentNativeSuccessRate - traditionalSuccessRate) * 100).toFixed(1)}%`,
      traditionalAvgTokens: Math.round(traditionalAvgTokens),
      agentNativeAvgTokens: Math.round(agentNativeAvgTokens),
      tokenReduction: `${tokenReductionPct}%`,
    },
  };

  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary saved to: ${summaryPath}`);

  // Print summary
  console.log('\n=== EXPERIMENT SUMMARY ===');
  console.log(`Overall tool call reduction: ${toolCallReductionPct}%`);
  console.log(`Traditional success rate: ${(traditionalSuccessRate * 100).toFixed(1)}%`);
  console.log(`Agent-native success rate: ${(agentNativeSuccessRate * 100).toFixed(1)}%`);
  console.log(`H1 (>= 30% tool call reduction): ${h1Met ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
  console.log(`H3 (>= 20% success rate improvement): ${h3Met ? 'SUPPORTED' : 'NOT SUPPORTED'}`);

  // Cleanup temp
  try {
    fs.rmSync(tempBase, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function writePlaceholderResults() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const placeholderRaw: RunResult[] = [];
  const placeholderSummary = {
    generatedAt: new Date().toISOString(),
    note: 'PLACEHOLDER DATA - ANTHROPIC_API_KEY not set. Re-run with API key to get real results.',
    hypotheses: {
      H1: {
        description: 'Agent-native repo reduces tool calls by >= 30%',
        threshold: '30%',
        result: 'N/A - experiment not run',
      },
      H2: {
        description: 'Side-effect break rate decreases by >= 50%',
        threshold: '50%',
        result: 'N/A - experiment not run',
      },
      H3: {
        description: 'First-attempt success rate improves by >= 20%',
        threshold: '20%',
        result: 'N/A - experiment not run',
      },
    },
    taskComparisons: TASKS.map(task => ({
      taskId: task.id,
      taskName: task.name,
      note: 'No data - experiment not run',
    })),
    overallComparison: {
      note: 'No data - set ANTHROPIC_API_KEY and re-run experiment',
      traditionalAvgToolCalls: null,
      agentNativeAvgToolCalls: null,
      toolCallReduction: null,
      traditionalSuccessRate: null,
      agentNativeSuccessRate: null,
    },
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, 'raw_results.json'),
    JSON.stringify(placeholderRaw, null, 2)
  );
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'summary.json'),
    JSON.stringify(placeholderSummary, null, 2)
  );

  console.log('Placeholder results written to experiment/results/');
  console.log('Set ANTHROPIC_API_KEY to run the live experiment.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
