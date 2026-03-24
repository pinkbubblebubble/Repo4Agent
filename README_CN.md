<div align="right">

中文 | <a href="README.md">English</a>

</div>

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
  <img src="https://img.shields.io/badge/实验次数-80-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/任务数-10-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/通过率%20%2B30pp-55%25%20%E2%86%92%2085%25-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/模型-claude--haiku--4--5-lightgrey?style=flat-square" />
  <img src="https://img.shields.io/badge/许可证-MIT-yellow?style=flat-square" />
</p>

</div>

---

## 问题所在

AI Agent 在代码库中工作时，往往读错文件、遗漏跨模块的副作用，在没有充分理解约束的情况下就开始修改代码。这不是 Agent 的问题——代码库本来就是为人类设计的，不是为 Agent。

**Repo4Agent** 是一项受控实证研究：如果把代码仓库为将在其中工作的 Agent 重新设计，而不是为写代码的人，会发生什么？

我们使用 `claude-haiku-4-5-20251001`，对 10 个任务进行了 **80 次控制实验**，持续迭代设计直到结果收敛：

<div align="center">

| 指标 | 传统仓库 | Agent 原生仓库 |
|:--|:-----------:|:------------:|
| 平均工具调用次数 | 9.0 | 13.5 |
| 平均消耗 Token 数 | 189,518 | 293,141 |
| **测试通过率** | **55%** | **85%** |
| 每次正确实现的成本 | 344K tok | 345K tok |

</div>

在最难的任务上（隐藏的跨模块约束）：**0% → 100%**。

Agent 原生仓库消耗了更多 token——但每次*正确*实现的成本几乎相同，同时产出了 55% 更多的正确答案。

---

## 为什么有效

### 1. 过早提交是最主要的失败模式

传统 Agent 读取 4–7 个文件后判断"上下文足够了"就开始编辑——通常编辑的是错误的文件。Agent 原生仓库在 `AGENT.md` 中写入**强制预读指令**，要求 Agent 在修改任何内容之前读取更多文件。仅此一项就消除了最常见的失败模式。

### 2. 副作用是最大的"未知的未知"

`MANIFEST.yaml` 声明了每个操作的写入、读取和下游影响。没有它，Agent 修复一个删除接口时不会知道还需要同时使当前会话失效。有了它，Agent 就知道——因为 manifest 明确写了。

### 3. 知道测试期望什么，比知道代码做什么更重要

`TEST_CONTRACTS.yaml` 精确说明了每个能力的断言——HTTP 状态码、响应结构、副作用、失败场景。知道自己在为什么构建的 Agent，第一次就能写对，而不是等测试失败后才发现偏差。

### 4. 修复指令必须包含实现顺序

当一个 bug 修复需要先创建一个还不存在的方法时，"调用 `deleteByUserId()`"这样的元数据会让 Agent 调用不存在的方法。而"**第一步**：先在 db.ts 中添加 `deleteByUserId()` 方法——该方法目前不存在"则能彻底消除失败。

> **核心洞察：** Agent 原生仓库不是代码库——而是 API。它有 schema、契约和显式的副作用声明。Agent 不需要"理解"代码；它需要用尽可能少的工具调用定位正确的修改点，并在写下第一行代码之前就知道正确答案的精确形态。

---

## 什么是 Agent 原生仓库？

Agent 原生仓库在不改变任何源码逻辑的基础上，增加一层 **5 个文件的元数据层**。API 不变，结构变。

```
.agent/
  MANIFEST.yaml          ← 每个能力：handler 路径、副作用、已知问题
  INVARIANTS.md          ← 约束条件 + 已知 bug 的分步修复指引
  IMPACT_MAP.yaml        ← "改动 X 必须同时改动 Y"
  TEST_CONTRACTS.yaml    ← 精确的测试断言：状态码、响应结构、副作用
AGENT.md                 ← 入口：强制预读指令、能力索引、路由表
src/
  user/
    user.create.handler.ts    ← 每个操作一个文件
    user.contract.ts
    user.test.ts
  auth/
    auth.login.handler.ts
    ...
```

### 每个文件的作用

| 文件 | 用途 | 缺少它会怎样 |
|:-----|:-----|:-----------|
| `AGENT.md` | 带强制预读指令的入口 | Agent 读 4 个文件就开始编辑，而不是 13 个 |
| `MANIFEST.yaml` | 每个能力声明副作用 | Agent 修复删除接口，遗漏会话失效 |
| `INVARIANTS.md` | 已知 bug 的有序修复步骤 | Agent 调用还不存在的方法 |
| `TEST_CONTRACTS.yaml` | 写代码前的精确断言 | Agent 在简单任务上过度设计，在复杂任务上实现不足 |
| `IMPACT_MAP.yaml` | 跨文件影响范围 | Agent 修改共享接口，破坏不相关的测试 |

---

## 消融实验

最终设计经过三轮迭代得出，每轮作为独立的控制实验运行（每个条件 20 次）。

| 条件 | 文件数 | 通过率 | 平均 Token | 核心变化 |
|:---|:---:|:---:|:---:|:---|
| 传统仓库 | — | 55% | 189K | 基准 |
| AN-Baseline | 4 | 80% | 301K | MANIFEST + INVARIANTS + IMPACT_MAP + AGENT.md |
| AN-Extended | 11 | 80% | 343K | +7 个文件：文件索引、路由表、概念索引、模板、状态、变更日志 |
| **AN-Refined** | **5** | **85%** | **293K** | Baseline + TEST_CONTRACTS + 更强的修复指引 |

**消融实验的核心发现：** 增加 7 个文件（AN-Extended）并没有提升通过率，反而多消耗了 14% 的 token，还引入了新的失败——当元数据体量过大时，agent 开始跳读而非仔细阅读。最优设计是精简的，只保留 agent 无法从代码本身推断的元数据。

**消融实验识别出的关键因素：**
- `TEST_CONTRACTS.yaml` 是唯一真正有效的新增——它修复了 Baseline 中 2 个过度设计导致的失败
- `INVARIANTS.md` 中的分步修复指引（不只是"调用 X"，而是"第一步：创建 X，它目前不存在——第二步：调用 X"）将一个不稳定的任务恢复到 100%
- AN-Extended 中的其他文件只增加了噪音，没有提升正确率

---

## 逐任务结果

<div align="center">

| 任务 | 传统仓库 | Agent 原生 | Δ |
|:-----|:-----------:|:------------:|:-:|
| A: 新增 PATCH /email 接口 | 50% | 100% | +50pp |
| B: 修复删除用户后会话未失效 | 50% | 100% | +50pp |
| C: 输入验证中间件 | 0% | 0% | — |
| D: GET /users 列表接口 | 100% | 100% | — |
| E: PATCH /password 接口 | 100% | 100% | — |
| F: 修复会话过期逻辑 | 100% | 100% | — |
| G: GET /users?email 搜索 | 100% | 100% | — |
| **H: POST /auth/refresh** | **0%** | **100%** | **+100pp** |
| I: 全局请求日志 | 50% | 50% | — |
| **J: 软删除 + 会话失效** | **0%** | **100%** | **+100pp** |

</div>

**Task C（输入验证）在所有设计下均为 0%**——这是实现本身的难度问题，不是元数据能解决的。最难的任务（H 和 J）从完全失败变为完美通过。

---

## 快速上手：`/init-agent-repo` 技能

本研究产出了一个 Claude Code 技能，可以自动为任何现有代码库生成完整的 Agent 原生元数据层。

**通过 plugin 安装（推荐）**

```bash
/plugin marketplace add pinkbubblebubble/Repo4Agent
/plugin install repo4agent
```

然后在任意项目中运行 `/repo4agent:init-agent-repo`。

**手动安装**

```bash
mkdir -p ~/.claude/skills/init-agent-repo
cp skill/init-agent-repo/SKILL.md ~/.claude/skills/init-agent-repo/SKILL.md
```

重启 Claude Code，然后在任意项目中运行 `/init-agent-repo`。

**自动生成的文件**

| 文件 | 用途 |
|:-----|:-----|
| `AGENT.md` | 机器优化的入口，含能力表和强制预读指令 |
| `.agent/MANIFEST.yaml` | 每个操作的副作用和已知问题声明 |
| `.agent/INVARIANTS.md` | 活跃的约束违规，含分步修复指引 |
| `.agent/IMPACT_MAP.yaml` | 跨模块影响链 |
| `.agent/TEST_CONTRACTS.yaml` | 每个能力的精确测试断言 |

---

## 复现实验

<details>
<summary><strong>前置条件与环境搭建</strong></summary>

- [Claude Code](https://claude.ai/code) 已安装并完成鉴权
- Python 3.8+，Node.js 18+

```bash
cd ablation/traditional && npm install && cd ../..
cd agent-native-repo && npm install && cd ..
```

</details>

<details>
<summary><strong>运行实验</strong></summary>

```bash
cd experiment

# 在 run_experiment.py 中配置 REPOS，然后：
python3 run_experiment.py

# 汇总结果
python3 summarize.py
```

实验使用 `--disallowedTools Bash`，强制 Agent 只能通过 Read/Glob/Grep/Write/Edit 等离散工具操作，使工具调用次数可复现、有意义。

结果追加至 `experiment/results/raw_results.jsonl`。

</details>

---

## 仓库结构

```
Repo4Agent/
├── agent-native-repo/         AN-Refined — 最终推荐设计（5 个文件）
│   ├── .agent/                MANIFEST · INVARIANTS · IMPACT_MAP · TEST_CONTRACTS
│   ├── AGENT.md
│   └── src/user/ · src/auth/  按领域组织，每个操作一个文件
├── ablation/                  消融研究的支撑材料
│   ├── traditional/           对照组：标准 Express.js + TypeScript
│   ├── an-baseline/           AN-Baseline：4 文件设计（通过率 80%）
│   ├── an-extended/           AN-Extended：11 文件设计（通过率 80%）
│   └── README.md              说明各条件之间的差异
├── experiment/
│   ├── run_experiment.py      实验运行器（claude CLI 子进程）
│   ├── summarize.py           汇总 → summary.json
│   ├── results/               80 次原始运行 + 汇总数据
│   └── runs/                  实验期间使用的各任务仓库快照
├── reports/
│   ├── report_en.md · report_cn.md
│   └── analysis_en.md · analysis_cn.md
├── skill/
│   └── init-agent-repo/SKILL.md
└── docs/                      GitHub Pages 演示 + 研究规划文档
```

---

## 延伸阅读

| 文档 | 语言 | 内容 |
|:-----|:----:|:-----|
| [实验报告](reports/report_cn.md) | 中文 | 方法论、逐任务分解、假设验证 |
| [深度分析](reports/analysis_cn.md) | 中文 | 6 种机制分析 |
| [Experiment Report](reports/report_en.md) | EN | Methodology, per-task breakdown |
| [Deep Analysis](reports/analysis_en.md) | EN | 6 mechanisms in detail |

---

## 引用

```
Repo4Agent: Agent-Native Repository Design
80 次控制实验，claude-haiku-4-5-20251001，2026
https://github.com/pinkbubblebubble/Repo4Agent
```

---

<div align="center">

<img src="docs/icon.svg" width="40" height="40" alt="" />

**Repo4Agent** — *为将在其中工作的 Agent 设计你的代码库。*

<sub>80 次实验 · 10 个任务 · claude-haiku-4-5-20251001</sub>

</div>
