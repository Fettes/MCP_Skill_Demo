import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoPage = `file://${path.resolve(__dirname, "site/index.html")}`;
const isHeadless = process.env.HEADLESS === "1";
const slowMo = Number(process.env.SLOW_MO_MS || 600);
const stepPauseMs = Number(process.env.STEP_PAUSE_MS || 700);
const closeDelayMs = Number(process.env.CLOSE_DELAY_MS || 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 这个 demo 用“本地模拟 MCP Server”的方式，展示三个关键点：
 * 1) 工具是标准化注册的（name/description/inputSchema/handler）
 * 2) 任务通过 plan 动态组合工具，不把流程写死在代码里
 * 3) 同一套工具可以服务多个目标
 */

function createToolRegistry(page) {
  return {
    open_page: {
      description: "打开指定页面",
      inputSchema: { type: "object", required: ["url"] },
      handler: async ({ url }) => {
        await page.goto(url);
        return { ok: true, message: `页面已打开: ${url}` };
      }
    },
    fill_input: {
      description: "给输入框填值",
      inputSchema: { type: "object", required: ["selector", "value"] },
      handler: async ({ selector, value }) => {
        await page.fill(selector, value);
        return { ok: true, message: `已输入 ${selector}` };
      }
    },
    click: {
      description: "点击元素",
      inputSchema: { type: "object", required: ["selector"] },
      handler: async ({ selector }) => {
        await page.click(selector);
        return { ok: true, message: `已点击 ${selector}` };
      }
    },
    assert_text_contains: {
      description: "断言元素文本包含给定字符串",
      inputSchema: { type: "object", required: ["selector", "text"] },
      handler: async ({ selector, text }) => {
        await page.waitForFunction(
          ({ sel, expected }) =>
            (document.querySelector(sel)?.textContent || "").includes(expected),
          { sel: selector, expected: text }
        );
        return { ok: true, message: `断言通过 ${selector} 包含 ${text}` };
      }
    },
    list_todos: {
      description: "读取当前待办列表",
      inputSchema: { type: "object", required: [] },
      handler: async () => {
        const todos = await page.$$eval("#todo-list li", (nodes) =>
          nodes.map((node) => node.textContent || "")
        );
        return { ok: true, todos };
      }
    }
  };
}

function validateArgs(toolName, toolDef, args) {
  const required = toolDef.inputSchema?.required || [];
  for (const key of required) {
    if (!(key in args)) {
      throw new Error(`工具 ${toolName} 缺少必填参数: ${key}`);
    }
  }
}

function buildPlanByGoal(goal, pageUrl) {
  if (goal === "login_only") {
    return [
      { tool: "open_page", args: { url: pageUrl } },
      { tool: "fill_input", args: { selector: "#username", value: "admin" } },
      { tool: "fill_input", args: { selector: "#password", value: "123456" } },
      { tool: "click", args: { selector: "#login-btn" } },
      {
        tool: "assert_text_contains",
        args: { selector: "#login-status", text: "登录成功" }
      }
    ];
  }

  if (goal === "login_and_add_todo") {
    return [
      { tool: "open_page", args: { url: pageUrl } },
      { tool: "fill_input", args: { selector: "#username", value: "admin" } },
      { tool: "fill_input", args: { selector: "#password", value: "123456" } },
      { tool: "click", args: { selector: "#login-btn" } },
      {
        tool: "assert_text_contains",
        args: { selector: "#login-status", text: "登录成功" }
      },
      {
        tool: "fill_input",
        args: { selector: "#todo-input", value: "解释 MCP 的价值" }
      },
      { tool: "click", args: { selector: "#add-todo-btn" } },
      {
        tool: "assert_text_contains",
        args: { selector: "#todo-count", text: "1" }
      },
      { tool: "list_todos", args: {} }
    ];
  }

  throw new Error(`未知目标: ${goal}`);
}

async function executePlan(registry, plan, runLabel) {
  console.log(`\n=== ${runLabel} ===`);
  for (const [index, step] of plan.entries()) {
    const toolDef = registry[step.tool];
    if (!toolDef) {
      throw new Error(`未知工具: ${step.tool}`);
    }

    validateArgs(step.tool, toolDef, step.args);
    console.log(`[MCP STEP ${index + 1}] call ${step.tool}`, step.args);
    const result = await toolDef.handler(step.args);
    console.log(`[MCP STEP ${index + 1}] result`, result);
    await sleep(stepPauseMs);
  }
}

async function runMcpStyleFlow() {
  const browser = await chromium.launch({ headless: isHeadless, slowMo });
  const page = await browser.newPage();

  try {
    const registry = createToolRegistry(page);
    const toolNames = Object.keys(registry);
    console.log("=== MCP-style Demo 开始 ===");
    console.log(
      `可视化参数: HEADLESS=${isHeadless ? "1" : "0"}, SLOW_MO_MS=${slowMo}, STEP_PAUSE_MS=${stepPauseMs}`
    );
    console.log("已注册工具:", toolNames.join(", "));

    // 同一套工具，执行目标 A：只登录
    const planA = buildPlanByGoal("login_only", demoPage);
    await executePlan(registry, planA, "Run A: login_only");

    // 同一套工具，执行目标 B：登录并新增待办
    const planB = buildPlanByGoal("login_and_add_todo", demoPage);
    await executePlan(registry, planB, "Run B: login_and_add_todo");

    console.log("\nMCP-style demo 执行成功");
    console.log("说明：工具不变，仅变更 plan 就可适配不同目标。");
    if (!isHeadless && closeDelayMs > 0) {
      console.log(`浏览器将在 ${closeDelayMs}ms 后自动关闭，便于现场观察结果。`);
      await sleep(closeDelayMs);
    }
  } finally {
    await browser.close();
  }
}

runMcpStyleFlow().catch((error) => {
  console.error("MCP-style demo 执行失败:", error);
  process.exit(1);
});
