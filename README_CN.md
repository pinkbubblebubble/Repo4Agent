<div align="center">

<img src="docs/icon.svg" width="96" height="96" alt="Repo4Agent 图标" />

# Repo4Agent

### *为在其中工作的 Agent 重新设计的代码仓库。*

<p align="center">
  <a href="https://pinkbubblebubble.github.io/Repo4Agent/">
    <img src="https://img.shields.io/badge/在线演示-访问-6366f1?style=for-the-badge&logoColor=white" alt="在线演示" />
  </a>
  <a href="reports/report_cn.md">
    <img src="https://img.shields.io/badge/实验报告-阅读-22d3ee?style=for-the-badge" alt="实验报告" />
  </a>
  <a href="skill/init-agent-repo/SKILL.md">
    <img src="https://img.shields.io/badge/Claude%20技能-安装-4ade80?style=for-the-badge" alt="技能" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/实验次数-40-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/任务数-10-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/通过率%20%2B25pp-55%25%20%E2%86%92%2080%25-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/模型-claude--haiku--4--5-lightgrey?style=flat-square" />
  <img src="https://img.shields.io/badge/许可证-MIT-yellow?style=flat-square" />
</p>

</div>

---

## 问题所在

AI Agent 在代码库中工作时，往往读错文件、遗漏跨模块的副作用，在没有充分理解约束的情况下就开始修改代码。这不是 Agent 的问题——代码库本来就是为人类设计的，不是为 Agent。

**Repo4Agent** 是一项受控实证研究：如果把代码仓库为将在其中工作的 Agent 重新设计，而不是为写代码的人，会发生什么？

我们使用 `claude-haiku-4-5-20251001`，在 10 个任务、2 种仓库类型上进行了 **40 次控制实验**，结果如下：

<div align="center">

| 指标 | 传统仓库 | Agent 原生仓库 | 变化 |
|:--|:-----------:|:------------:|:-----:|
| 平均工具调用次数 | 9.0 | 14.0 | +55.6% |
| 平均消耗 Token 数 | 189,518 | 300,779 | +58.7% |
| **测试通过率** | **55%** | **80%** | **+25pp** |
| 每次正确实现的成本 | 339K tok | 371K tok | +9.3% |

</div>

在最难的任务上（隐藏约束、跨模块副作用）：**0% → 100%**。

Agent 原生仓库消耗了*更多* Token 和工具调用——却产出了*更多*正确答案。多花的阅读成本，完全被实现准确率的提升所弥补。

---

## 为什么有效

### 1. 过早提交是最主要的失败模式

传统 Agent 读取 4–7 个文件后，判断"上下文足够了"就开始编辑——通常编辑的是错误的文件。Agent 原生仓库在 `AGENT.md` 中写入**强制预读指令**，要求 Agent 在修改任何内容之前读取 13–19 个文件，建立完整的上下文。这一项改变本身就是影响最大的结构调整。

### 2. 副作用是最大的"未知的未知"

`MANIFEST.yaml` 声明了每个操作的写入、读取和下游影响。没有它，Agent 修复一个删除接口时不会知道还需要同时使当前会话失效。有了它，Agent 就知道——因为 manifest 明确写了。

### 3. 结构本身就是一种隐式指令

按领域组织的源码结构（`src/user/`、`src/auth/`）加上语义化文件名（`user.delete.handler.ts`），会引导 Agent 创建新的独立文件，而不是堆进已有的 controller。Agent 原生仓库的实验数据显示**新文件创建率高出 4 倍**，意外副作用相应减少。

> **核心洞察：** Agent 原生仓库不是代码库——而是 API。它有 schema、契约和显式的副作用声明。Agent 不需要"理解"代码；它需要用尽可能少的工具调用定位正确的修改点，并知道每次改动的影响范围。这是两个根本不同的优化目标。

---

## 什么是 Agent 原生仓库？

Agent 原生仓库在不改变任何源码逻辑的基础上，增加一层**结构化元数据**。API 不变，结构变。

```
.agent/
  MANIFEST.yaml      ←  每个能力：处理器路径、副作用、已知问题、测试覆盖
  INVARIANTS.md      ←  非显而易见的约束、预标注的 Bug 及精确修复位置
  IMPACT_MAP.yaml    ←  "改动 X 必须同时改动 Y" — 把未知变成已知
AGENT.md             ←  机器优化的入口：强制预读、能力索引、技术栈说明
src/
  user/
    user.create.handler.ts    ←  每个操作一个文件
    user.contract.ts
    user.test.ts
  auth/
    auth.login.handler.ts
    ...
```

### 功能影响排名（来自实验数据）

| 功能 | 实测影响 |
|:-----|:-------:|
| `INVARIANTS.md` — 预标注 Bug，含位置 + 修复方式 | **最高** |
| `MANIFEST.yaml` — 每个操作声明 `side_effects` + `known_issues` | **高** |
| `IMPACT_MAP.yaml` — 跨模块影响链 | **高** |
| 按领域组织的源码结构 | **中** |
| 语义化文件命名（`user.delete.handler.ts`） | **中** |
| `TASK_TEMPLATES/` 按任务类型分类 | **低** |

---

## 逐任务结果

<div align="center">

| 任务 | 传统仓库 | Agent 原生 | Δ |
|:-----|:-----------:|:------------:|:-:|
| A: 新增 PATCH /email 接口 | 50% | 100% | +50pp |
| B: 修复删除用户后会话未失效的 Bug | 50% | 100% | +50pp |
| C: 输入验证中间件 | 0% | 0% | — |
| D: GET /users 列表接口 | 100% | 100% | — |
| E: PATCH /password 接口 | 100% | 50% | **−50pp** |
| F: 修复会话过期逻辑 | 100% | 100% | — |
| G: GET /users?email 搜索 | 100% | 50% | **−50pp** |
| **H: POST /auth/refresh** | **0%** | **100%** | **+100pp** |
| I: 全局请求日志 | 50% | 100% | +50pp |
| **J: 软删除 + 会话失效** | **0%** | **100%** | **+100pp** |

</div>

**任务 E 和 G 是刻意保留的反例。** 在简单、范围明确的任务上，Agent 原生仓库反而表现更差——Agent 过度阅读元数据，导致过度设计。关键设计原则：**保持 `INVARIANTS.md` 精简，只记录非显而易见的约束。**

**Agent 原生仓库的优势随任务隐藏复杂度的增加而放大。**

---

## 快速上手：`/init-agent-repo` 技能

本实验还产出了一个 Claude Code 技能，可以自动为任何现有代码库生成完整的 Agent 原生元数据层。

**安装**

```bash
mkdir -p ~/.claude/skills/init-agent-repo
cp skill/init-agent-repo/SKILL.md ~/.claude/skills/init-agent-repo/SKILL.md
```

重启 Claude Code，然后在任意项目中运行 `/init-agent-repo`。

**自动生成的文件**

| 文件 | 用途 |
|:-----|:-----|
| `AGENT.md` | 机器优化的入口，含能力表和强制预读指令 |
| `.agent/MANIFEST.yaml` | 每个操作的副作用、依赖和测试覆盖声明 |
| `.agent/INVARIANTS.md` | 活跃的约束违规，含精确文件位置和修复指引 |
| `.agent/IMPACT_MAP.yaml` | 跨模块影响链，关联每个源文件与其影响范围 |

---

## 复现实验

<details>
<summary><strong>前置条件与环境搭建</strong></summary>

- [Claude Code](https://claude.ai/code) 已安装并完成鉴权
- Python 3.8+，Node.js 18+

```bash
cd traditional-repo && npm install && cd ..
cd agent-native-repo && npm install && cd ..
```

</details>

<details>
<summary><strong>运行实验</strong></summary>

```bash
cd experiment

# 10 个任务 × 2 种仓库 × 2 次运行 = 共 40 次
python3 run_experiment.py

# 汇总结果
python3 summarize.py
```

实验使用 `--disallowedTools Bash`，强制 Agent 只能通过 Read/Glob/Grep/Write/Edit 等离散工具操作，使工具调用次数可复现、有意义。

结果追加至 `experiment/results/raw_results.jsonl`，每行包含：

```
repo_type, task_id, run_number,
read, glob, grep, write, edit,
input_tokens, output_tokens, total_tokens, cost_usd,
tests_passed, failed_test_count, duration_ms
```

</details>

---

## 仓库结构

```
Repo4Agent/
├── traditional-repo/          标准 Express.js + TypeScript（混合 controller）
├── agent-native-repo/         相同 API，为 Agent 重新组织结构
│   ├── .agent/                MANIFEST.yaml · INVARIANTS.md · IMPACT_MAP.yaml
│   ├── AGENT.md
│   └── src/user/ · src/auth/  按领域组织，每个操作一个文件
├── experiment/
│   ├── run_experiment.py      实验运行器（claude CLI 子进程）
│   ├── parse_stream.py        stream-json 解析器，统计工具调用
│   ├── summarize.py           汇总 → summary.json
│   └── results/               40 次原始运行 + 汇总数据
├── reports/
│   ├── report_en.md           完整实验报告（英文）
│   ├── analysis_en.md         深度分析：6 种机制（英文）
│   ├── report_cn.md           实验报告（中文）
│   └── analysis_cn.md         深度分析（中文）
├── skill/
│   └── init-agent-repo/SKILL.md
└── docs/index.html            交互演示页（GitHub Pages）
```

---

## 延伸阅读

| 文档 | 语言 | 内容 |
|:-----|:----:|:-----|
| [实验报告](reports/report_cn.md) | 中文 | 方法论、逐任务分解、假设验证 |
| [深度分析](reports/analysis_cn.md) | 中文 | 6 种机制：过早提交、遗漏编辑、写入比率、Token 时序、信息密度、反例分析 |
| [Experiment Report](reports/report_en.md) | EN | Methodology, per-task breakdown, hypothesis evaluation |
| [Deep Analysis](reports/analysis_en.md) | EN | 6 mechanisms in detail |

---

## 引用

```
Repo4Agent: Agent-Native Repository Design
40 次控制实验，claude-haiku-4-5-20251001，2026
https://github.com/pinkbubblebubble/Repo4Agent
```

---

<div align="center">

<img src="docs/icon.svg" width="40" height="40" alt="" />

**Repo4Agent** — *为将在其中工作的 Agent 设计你的代码库。*

<sub>40 次实验 · 10 个任务 · claude-haiku-4-5-20251001</sub>

</div>
