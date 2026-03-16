# 用 Playwright 把 MCP 和 Skill 讲“透”

> 这份文档的目标不是抽象解释，而是直接回答 3 个问题：  
> **我具体用了什么工具？做了什么？MCP 和 Skill 到底差在哪？**

---

## 1. 先看你手上的这套 Demo

项目里一共 3 类代码：

1. `demo/site/index.html`  
   本地页面（登录 + Todo），确保分享时不依赖外网和后端。
2. `demo/skill-demo.js`  
   Skill 风格：把流程固化成一个固定剧本。
3. `demo/mcp-demo.js`  
   MCP 风格：先注册通用工具，再按目标动态生成 plan 执行。

---

## 2. 我在 Demo 里“具体用了什么工具”

这里说的工具是 `demo/mcp-demo.js` 里注册的工具（可类比 MCP Server 暴露的 Tools）：

1. `open_page({ url })`：打开页面  
2. `fill_input({ selector, value })`：输入文本  
3. `click({ selector })`：点击元素  
4. `assert_text_contains({ selector, text })`：断言文本  
5. `list_todos({})`：读取 Todo 列表

这些工具都带了 3 层信息：

- `name`（工具名）
- `description`（用途说明）
- `inputSchema`（参数约束）
- `handler`（真正执行逻辑）

这正是 MCP 思想里最重要的一点：  
**能力先“标准化暴露”，然后再被 Agent 组合调用。**

---

## 3. Skill 版本到底做了什么（按代码讲）

文件：`demo/skill-demo.js`

### 3.1 固定剧本（skillRecipe）

脚本里把流程写成固定步骤：

1. 打开页面  
2. 固定账号登录  
3. 添加预设待办（固定内容）  
4. 断言数量  
5. 断言关键文案

并且用固定数据：

- 账号：`admin / 123456`
- 待办：`["准备分享开场", "演示 Playwright 自动化", "总结 MCP 与 Skill 差异"]`

### 3.2 关键特征

- 流程固定：步骤顺序提前写死
- 参数固定：输入内容提前写死
- 目标固定：就是“完成这条标准流程”

### 3.3 这说明了什么

这就是 Skill：  
**把“验证过的方法”封装成 SOP，追求稳定复用，而不是动态变通。**

---

## 4. MCP 版本到底做了什么（按代码讲）

文件：`demo/mcp-demo.js`

### 4.1 先注册工具，不先写流程

`createToolRegistry(page)` 做了工具注册，返回一个工具表（registry）。

每个工具都带参数约束校验（`validateArgs`），即：

- 工具是否存在
- 必填参数是否完整

这一步对应 MCP 的“协议化能力层”。

### 4.2 目标驱动 plan

`buildPlanByGoal(goal, pageUrl)` 根据目标返回不同计划：

- `login_only`：只完成登录链路
- `login_and_add_todo`：登录 + 新增待办 + 读取列表

注意：  
**两种目标都复用同一套工具，变化的是 plan，不是工具本身。**

### 4.3 通用执行器

`executePlan(registry, plan, runLabel)` 逐步执行：

1. 取工具
2. 校验参数
3. 调 handler
4. 打印结构化日志

这相当于 Agent 的“工具调用循环”。

---

## 5. 一眼看懂区别：同一需求下的代码变化点

需求变化示例：  
“现在不要新增待办了，只要验证登录成功。”

### 在 Skill 中

- 往往要改脚本流程本身（删步骤、改步骤、改断言）
- 如果类似变更很多，可能要维护多个 Skill 版本

### 在 MCP 中

- 工具层不动
- 改 `goal` 或 `plan` 即可（例如从 `login_and_add_todo` 切到 `login_only`）

核心区别不是“谁更强”，而是“变化发生在哪一层”：

- Skill：变化常在流程代码层
- MCP：变化多在计划编排层

---

## 6. 你可以现场这样讲（可直接念）

### 6.1 先跑 Skill

```bash
npm run demo:skill
```

讲解词：

> 现在看到的是固定剧本。  
> 不管你问什么，它都按同一套步骤执行。  
> 这非常适合高频且稳定的任务。

### 6.2 再跑 MCP

```bash
npm run demo:mcp
```

讲解词：

> 这里先注册工具，再按目标生成计划。  
> 同一套工具跑了两个目标：只登录、登录并新增待办。  
> 工具代码没改，改的是计划。这就是 MCP 的灵活性来源。

---

## 7. 最终定义（建议放到结尾页）

- **Skill**：把经验流程产品化（方法封装）
- **MCP**：把外部能力接口化（能力协议）

一句话：

> Skill 决定“怎么做更稳”，MCP 决定“能调哪些能力”。

---

## 8. 什么时候用谁（落地建议）

- 任务稳定、高频、流程可标准化：优先 Skill
- 系统多、能力杂、目标变化快：优先 MCP
- 最佳实践：**Skill + MCP 组合**
  - MCP 提供能力底座
  - Skill 提供执行方法

---

## 9. 运行准备

前置条件：Node.js >= 18

```bash
npm install
npx playwright install chromium
npm run demo:skill
npm run demo:mcp
```

可视化演示建议（现场更直观）：

```bash
SLOW_MO_MS=1000 STEP_PAUSE_MS=1200 npm run demo:skill
SLOW_MO_MS=1000 STEP_PAUSE_MS=1200 npm run demo:mcp
```

如果你只想看日志，不打开浏览器：

```bash
HEADLESS=1 npm run demo:skill
HEADLESS=1 npm run demo:mcp
```
