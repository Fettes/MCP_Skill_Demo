import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoPage = `file://${path.resolve(__dirname, "site/index.html")}`;
const isHeadless = process.env.HEADLESS === "1";
const slowMo = Number(process.env.SLOW_MO_MS || 600);
const stepPauseMs = Number(process.env.STEP_PAUSE_MS || 800);
const closeDelayMs = Number(process.env.CLOSE_DELAY_MS || 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Skill 的核心特征：把“最佳实践流程”固定成可复用剧本。
 * 这个脚本故意写成强约束步骤，便于和 MCP 的动态编排对比。
 */
const skillRecipe = [
  { id: "open-page", title: "打开演示页面" },
  { id: "login-admin", title: "按标准账号密码登录" },
  { id: "add-fixed-todos", title: "添加预设待办事项" },
  { id: "assert-count", title: "断言待办数量" },
  { id: "assert-content", title: "断言关键待办存在" }
];

const fixedTodos = ["准备分享开场", "演示 Playwright 自动化", "总结 MCP 与 Skill 差异"];

async function runStep(stepTitle, fn) {
  console.log(`\n[SKILL STEP] ${stepTitle}`);
  const start = Date.now();
  await fn();
  console.log(`[SKILL STEP] 完成，耗时 ${Date.now() - start}ms`);
  await sleep(stepPauseMs);
}

async function loginWithFixedCredential(page) {
  // Skill 强调“可预测性”，所以账号密码在流程中固定。
  await page.fill("#username", "admin");
  await page.fill("#password", "123456");
  await page.click("#login-btn");
  await page.waitForSelector('#login-status:has-text("登录成功")');
}

async function addTodos(page, todos) {
  for (const todo of todos) {
    await page.fill("#todo-input", todo);
    await page.click("#add-todo-btn");
  }
}

async function assertTodoCount(page, expectedCount) {
  await page.waitForFunction(
    (count) => {
      const text = document.querySelector("#todo-count")?.textContent || "";
      return text.includes(String(count));
    },
    expectedCount
  );
}

async function assertTodoContains(page, keyword) {
  await page.waitForFunction(
    (text) => {
      const listText = document.querySelector("#todo-list")?.textContent || "";
      return listText.includes(text);
    },
    keyword
  );
}

async function runSkillFlow() {
  const browser = await chromium.launch({ headless: isHeadless, slowMo });
  const page = await browser.newPage();

  try {
    console.log("=== Skill Demo 开始 ===");
    console.log(
      `可视化参数: HEADLESS=${isHeadless ? "1" : "0"}, SLOW_MO_MS=${slowMo}, STEP_PAUSE_MS=${stepPauseMs}`
    );
    console.log("Skill Recipe:", skillRecipe.map((s) => s.id).join(" -> "));

    await runStep("打开演示页面", async () => {
      await page.goto(demoPage);
    });

    await runStep("按标准账号密码登录", async () => {
      await loginWithFixedCredential(page);
    });

    await runStep("添加预设待办事项", async () => {
      await addTodos(page, fixedTodos);
    });

    await runStep("断言待办数量", async () => {
      await assertTodoCount(page, fixedTodos.length);
    });

    await runStep("断言关键待办存在", async () => {
      await assertTodoContains(page, "总结 MCP 与 Skill 差异");
    });

    console.log("\nSkill demo 执行成功");
    console.log("说明：流程固定、参数固定、步骤固定，适合高频稳定任务。");
    if (!isHeadless && closeDelayMs > 0) {
      console.log(`浏览器将在 ${closeDelayMs}ms 后自动关闭，便于现场观察结果。`);
      await sleep(closeDelayMs);
    }
  } finally {
    await browser.close();
  }
}

runSkillFlow().catch((error) => {
  console.error("Skill demo 执行失败:", error);
  process.exit(1);
});
