# MCP Skill Demo

这个项目用于技术分享：通过 Playwright 的自动化能力，演示 **MCP（Model Context Protocol）** 和 **Skill** 的差异与协作方式。

## 项目结构

- `docs/tech-sharing.md`：分享讲稿（内容丰富，可直接用于宣讲）
- `demo/site/index.html`：本地演示网页（无需后端）
- `demo/skill-demo.js`：Skill 风格的固定流程自动化
- `demo/mcp-demo.js`：MCP 风格的工具调度自动化（本地模拟）

## 快速开始

环境要求：

- Node.js >= 18

```bash
npm install
npx playwright install chromium
```

## 运行演示

```bash
# 1) Skill 风格：固定流程（默认可视化，会打开浏览器）
npm run demo:skill

# 2) MCP 风格：通过工具名 + 参数调度（默认可视化）
npm run demo:mcp
```

### 可视化参数（可选）

```bash
# 放慢动作（便于讲解）
SLOW_MO_MS=1000 STEP_PAUSE_MS=1200 npm run demo:skill

# 无头模式（CI 或只看日志）
HEADLESS=1 npm run demo:mcp
```

## 分享建议

推荐演示顺序：

1. 先讲 `docs/tech-sharing.md` 中的概念与区别
2. 运行 `demo:skill`，说明“预定义能力”的优点与边界
3. 运行 `demo:mcp`，说明“通用工具协议”如何让 Agent 动态组合能力
4. 最后讲两者如何组合：**Skill 做方法论封装，MCP 做能力连接**