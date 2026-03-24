# repo4agent: Agent-Native 代码仓库设计方案

> 核心假设：vibe coding 时代，代码库的主要读者是 AI agent，不是人类。传统代码库的设计哲学需要被颠覆。

---

## 一、问题诊断：传统代码库对 Agent 的摩擦点

| 问题 | 传统做法 | Agent 的痛点 |
|------|---------|------------|
| 入口模糊 | README.md 写给人看，叙述性文字 | Agent 需要多轮 glob/grep 才能定位起点 |
| 意图不透明 | 注释写 "how"，很少写 "why" | Agent 不知道改动的副作用 |
| 隐式依赖 | 依赖关系藏在代码里 | Agent 改 A 不知道会破坏 B |
| 状态隐式 | 全局状态散落各处 | Agent 难以推断系统当前状态 |
| 测试非结构化 | 测试文件命名随意，覆盖什么不清楚 | Agent 无法快速知道"改了这里要跑哪些测试" |
| 错误处理模糊 | 错误类型不统一 | Agent 无法系统性处理异常 |
| 上下文窗口浪费 | 大量冗余注释、历史遗留代码 | 消耗宝贵 context，降低准确性 |

---

## 二、Agent-Native 仓库的核心设计原则

### 原则 1：机器可寻址（Machine-Addressable）
每个能力、每个模块、每个约束都有唯一的、可程序化查找的地址。Agent 一次 grep 就能找到。

### 原则 2：意图显式化（Intent-Explicit）
不只记录"代码做什么"，而是记录"为什么这样做"和"改动这里会影响什么"——用结构化格式，不是散文。

### 原则 3：影响范围可推断（Impact-Traceable）
修改任何组件时，agent 能从仓库本身（不需要运行代码）推断出影响范围。

### 原则 4：上下文密度最优（Context-Dense）
去掉冗余，保留语义。每一行对 agent 的信息量最大化。

### 原则 5：任务模板化（Task-Templated）
常见的 agent 任务（添加功能、修 bug、重构）有标准操作流程，存在仓库里。

---

## 三、Agent-Native 仓库结构

```
repo/
├── .agent/                        # Agent 专属目录（核心创新）
│   ├── MANIFEST.yaml              # 仓库能力清单（机器可读）
│   ├── IMPACT_MAP.yaml            # 模块间影响关系图
│   ├── INVARIANTS.md              # 系统不变量（任何情况下必须为真）
│   ├── TASK_TEMPLATES/            # 标准任务模板
│   │   ├── add_feature.md
│   │   ├── fix_bug.md
│   │   └── refactor.md
│   └── DECISIONS/                 # 结构化决策日志 (ADR for agents)
│       └── 001_auth_strategy.yaml
│
├── src/
│   ├── [domain]/                  # 按领域组织，不按技术层
│   │   ├── [domain].contract.ts   # 显式输入/输出契约
│   │   ├── [domain].impl.ts       # 实现
│   │   ├── [domain].invariants.ts # 该模块的不变量（可执行）
│   │   └── [domain].test.ts       # 测试（与实现同目录）
│   └── _shared/                   # 跨领域共享（最小化）
│
├── tests/
│   └── COVERAGE_MAP.yaml          # 测试 → 功能的显式映射
│
└── AGENT.md                       # 替代 README，agent 优化的入口
```

---

## 四、关键文件设计

### 4.1 `AGENT.md`（入口文件）

不是给人看的叙述，而是给 agent 的结构化导航：

```markdown
# AGENT ENTRY POINT

## Quick Orient
- Stack: [list]
- Entry: src/main.ts:12
- Test cmd: `npm test`
- Lint cmd: `npm run lint`

## Capability Index
| Capability | Location | Contract |
|-----------|---------|---------|
| user.auth | src/auth/ | .agent/MANIFEST.yaml#auth |
| data.fetch | src/data/ | .agent/MANIFEST.yaml#data |

## Before You Change Anything
1. Read .agent/INVARIANTS.md
2. Check .agent/IMPACT_MAP.yaml for your target module
3. Run relevant tests from tests/COVERAGE_MAP.yaml
```

### 4.2 `.agent/MANIFEST.yaml`（能力清单）

```yaml
capabilities:
  auth:
    description: "用户认证与授权"
    entry: "src/auth/auth.contract.ts"
    inputs: [email, password]
    outputs: [jwt_token, user_id]
    side_effects: [writes_session_db, logs_audit]
    dependencies: [user_domain, crypto_service]
    test_suite: "tests/auth/**"
```

### 4.3 `.agent/IMPACT_MAP.yaml`（影响图）

```yaml
impact_map:
  "src/auth/auth.impl.ts":
    affects: [session_management, user_profile, audit_log]
    breaks_if_changed: ["jwt signature format", "session expiry logic"]
    safe_to_change: ["error messages", "logging verbosity"]
    notify_tests: ["tests/auth/", "tests/integration/login.test.ts"]
```

### 4.4 `.agent/INVARIANTS.md`（不变量）

```markdown
## System Invariants

### INV-001: Auth Token Integrity
- WHAT: All JWT tokens must be signed with RS256
- WHY: Compliance requirement (SOC2-AUTH-3)
- TEST: tests/invariants/token_integrity.test.ts
- NEVER: Change algorithm without updating key rotation policy

### INV-002: Data Immutability
- WHAT: User records are append-only, never updated in place
- WHY: Audit trail requirement
- TEST: tests/invariants/immutability.test.ts
```

### 4.5 文件命名约定（语义化）

```
传统:  userController.ts, utils.ts, helpers.ts
Agent-native: user.create.handler.ts, user.query.handler.ts, user.contract.ts
```

Agent 可以通过文件名直接推断内容，无需打开文件。

---

## 五、实验设计

### 实验目标
量化 agent-native repo 相比传统 repo 的效率提升。

### 实验设置

**基准任务集**（相同任务，两种仓库）：
1. Task A：添加一个新的 API 端点（用户邮箱修改）
2. Task B：修复一个跨模块 bug（删除用户后会话未失效）
3. Task C：添加输入验证中间件，不破坏现有功能

**对照组**：
- 控制组：传统 Express.js + TypeScript 项目（标准结构）
- 实验组：相同功能，agent-native 结构

**测量指标**：

| 指标 | 测量方法 |
|-----|---------|
| Tool calls 数量 | 统计 agent 完成任务的总工具调用次数 |
| Context 消耗 | 统计读取的 token 总量 |
| 首次正确率 | agent 第一次尝试是否通过测试 |
| 副作用破坏率 | 完成任务后，其他测试的失败数 |
| 任务完成时间 | 从开始到所有测试通过的时间 |

**实验流程**：
```
1. 构建两个功能完全相同的仓库（传统 vs agent-native）
2. 对同一个 Claude agent 实例，给相同的任务 prompt
3. 记录所有工具调用，统计上述指标
4. 重复 3 次，取平均值
5. 统计显著性检验（样本量：每任务 10 次运行）
```

**假设（待验证）**：
- H1: agent-native repo 的 tool calls 减少 ≥ 30%
- H2: 副作用破坏率降低 ≥ 50%
- H3: 首次正确率提升 ≥ 20%

---

## 六、实现路线图

### Phase 1：原型验证
- [ ] 构建最小化 agent-native demo 项目（Node.js + TypeScript）
- [ ] 构建对照组（同功能传统项目）
- [ ] 设计实验 harness（自动化运行 agent 并收集指标）

### Phase 2：实验执行
- [ ] 运行 Task A / B / C 对比实验
- [ ] 收集数据，分析结果
- [ ] 识别哪些 agent-native 特性收益最高

### Phase 3：提炼成 Skill（如果实验验证可行）
- [ ] 将 `.agent/` 目录结构模板化
- [ ] 编写 `/init-agent-repo` skill
- [ ] skill 能自动生成：AGENT.md、MANIFEST.yaml、IMPACT_MAP.yaml 骨架
- [ ] skill 能分析现有项目并生成初始 agent 层

---

## 七、Skill 设计草案

如果实验证明有效，`/init-agent-repo` skill 的行为：

```
用户开始新项目时运行 /init-agent-repo

Skill 做什么：
1. 询问项目类型（API / CLI / Library / Monorepo）
2. 生成 .agent/ 目录结构
3. 生成 AGENT.md 骨架
4. 生成 MANIFEST.yaml 骨架
5. 生成 IMPACT_MAP.yaml（初始为空，标注哪里需要填充）
6. 生成 INVARIANTS.md 骨架（附带常见不变量示例）
7. 配置文件命名约定到 .editorconfig 或 lint rules
8. 写入 CLAUDE.md，让 agent 知道这是 agent-native repo
```

---

## 八、风险与反驳

| 风险 | 反驳 |
|-----|-----|
| 维护成本高：`.agent/` 文件需要同步更新 | 可以写 lint rule 检查 MANIFEST 与实际代码是否一致 |
| 对人类开发者不友好 | vibe coding 时代人类主要写 prompt，不读代码 |
| 文件命名约定难以强制执行 | ESLint custom rule + CI 检查 |
| Impact map 可能不准确 | 自动化工具从 import 图生成初始版本 |

---

## 九、核心洞察

> **传统 repo 是图书馆：按人类的分类系统组织，需要人类的直觉导航。**
>
> **Agent-native repo 是 API：有 schema、有契约、有显式的副作用声明。**

Agent 不需要"读懂"代码，它需要的是：能在最少的工具调用内定位到正确的修改点，并知道修改的影响边界。这是两种完全不同的优化目标。
