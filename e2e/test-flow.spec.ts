import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const REPORT: string[] = [];
let round = 0;

function log(msg: string) {
  const ts = new Date().toLocaleTimeString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  REPORT.push(line);
}

async function screenshot(page: Page, name: string) {
  const dir = path.join(SCREENSHOT_DIR, `round-${round}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
}

// ============ 第 1 轮：纯点击流程 ============
async function runClickFlow(browser: Browser) {
  log('===== 第 1 轮：点击选场景 =====');
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => { errors.push(e.message); log(`  ❌ 页面错误: ${e.message}`); });
  page.on('console', msg => {
    if (msg.type() === 'error') log(`  ⚠️ console.error: ${msg.text()}`);
  });

  try {
    // Step 1: 打开首页
    log('Step 1: 打开首页');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await screenshot(page, '01-home');

    // Step 2: 登录
    log('Step 2: 登录（小朋友）');
    const nameInput = page.locator('#login-name');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('小明');
      await page.waitForTimeout(300);
      await page.click('button:has-text("我是小朋友")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("开始冒险")');
      await page.waitForTimeout(1500);
      await screenshot(page, '02-after-login');
    } else {
      log('  已登录，跳过');
    }

    // Step 3: 进入功能界面
    log('Step 3: 功能界面（Features）');
    // 如果在首页，点击 Let's Go
    let btn = page.locator('button:has-text("Let\'s Go")');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '03-features');

    // Step 4: 点击左门进入角色选择
    log('Step 4: 点击左门 → 角色选择');
    // 左门是第一个圆形视频元素
    const leftDoor = page.locator('.absolute.left-\\[20\\%\\]').first();
    if (await leftDoor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await leftDoor.click();
      await page.waitForTimeout(2000); // 等待传送动画
    } else {
      // 直接导航
      await page.goto(`${BASE}/character-select`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '04-character-select');

    // Step 5: 选择角色
    log('Step 5: 选择角色');
    const charCards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('img') });
    const charCount = await charCards.count();
    log(`  找到 ${charCount} 个可选角色`);
    if (charCount > 0) {
      await charCards.first().click();
      await page.waitForTimeout(1500);
    }
    await screenshot(page, '05-after-character');

    // Step 6: 点击场景图片选择场景
    log('Step 6: 点击场景图片');
    await page.waitForTimeout(1000);
    // 场景图片点击区域
    const sceneCards = page.locator('.w-\\[286px\\].h-\\[320px\\]');
    const sceneCount = await sceneCards.count();
    log(`  找到 ${sceneCount} 个场景卡片`);
    if (sceneCount > 0) {
      await sceneCards.first().click();
      await page.waitForTimeout(2000); // 等待对话框流程
    }
    await screenshot(page, '06-after-scene-click');

    // Step 7: 等待 story guide 出现（剧情阶段）
    log('Step 7: 等待进入剧情阶段');
    await page.waitForTimeout(2000);
    await screenshot(page, '07-plot-phase');

    // Step 8: 尝试点击麦克风（会触发权限请求）
    log('Step 8: 点击麦克风按钮（语音输入）');
    const micBtn = page.locator('[aria-label*="麦克风"]').or(page.locator('button:has-text("🎤")'));
    if (await micBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await micBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '08-after-mic');
    } else {
      log('  未找到麦克风按钮');
    }

    // Step 9: 检查是否有错误
    log('Step 9: 检查结果');
    if (errors.length === 0) {
      log('  ✅ 无页面错误');
    } else {
      log(`  ❌ ${errors.length} 个错误: ${errors.join(', ')}`);
    }

    await screenshot(page, '09-final-state');
    return errors.length === 0;
  } catch (e: any) {
    log(`  ❌ 流程异常: ${e.message}`);
    await screenshot(page, 'error');
    return false;
  } finally {
    await page.close();
  }
}

// ============ 第 2 轮：API 端点测试 ============
async function runApiTest(browser: Browser) {
  log('===== 第 2 轮：API 端点 + 故事生成 =====');
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => { errors.push(e.message); });

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 获取 token
    const token = await page.evaluate(() => localStorage.getItem('story-ai-token'));
    log(`Token: ${token ? '已获取' : '无（需先登录）'}`);

    // API 测试
    const testApi = async (name: string, url: string, options?: RequestInit) => {
      try {
        const res = await page.evaluate(async ({ url, options }) => {
          const r = await fetch(url, options);
          return { ok: r.ok, status: r.status, body: await r.json() };
        }, { url, options });
        log(`  ${res.ok ? '✅' : '❌'} ${name}: HTTP ${res.status} ${res.body?.success ? 'success' : res.body?.message || ''}`);
        return res;
      } catch (e: any) {
        log(`  ❌ ${name}: ${e.message}`);
        return null;
      }
    };

    await testApi('故事列表', `${BASE}/api/stories`);

    // 创建故事
    const createRes = await testApi('创建故事', `${BASE}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '测试故事', type: 'ai_create', character: '小明', scene: '森林', description: '去森林冒险' }),
    });

    const storyId = (createRes as any)?.body?.data?._id;
    if (storyId) {
      log(`  故事 ID: ${storyId}`);

      // 生成文本
      await testApi('生成文本', `${BASE}/api/stories/${storyId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ character: '小明', scene: '森林', description: '去森林冒险的故事' }),
      });

      // 获取故事
      const getRes = await testApi('获取故事', `${BASE}/api/stories/${storyId}`);
      const pages = (getRes as any)?.body?.data?.pages;
      log(`  页数: ${pages?.length || 0}`);
    }

    await screenshot(page, '09-api-results');
    return errors.length === 0;
  } catch (e: any) {
    log(`  ❌ API 测试异常: ${e.message}`);
    return false;
  } finally {
    await page.close();
  }
}

// ============ 第 3 轮：StoryPlayer + 返回 + 重播 ============
async function runPlaybackTest(browser: Browser) {
  log('===== 第 3 轮：播放器 + 返回 + 重播 =====');
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => { errors.push(e.message); log(`  ❌ 页面错误: ${e.message}`); });

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const token = await page.evaluate(() => localStorage.getItem('story-ai-token'));

    // 获取已有故事列表
    const listRes = await page.evaluate(async (token) => {
      const r = await fetch('/api/stories', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return r.json();
    }, token);

    const stories = listRes?.data || [];
    log(`已有 ${stories.length} 个故事`);

    if (stories.length > 0 && stories[0].status === 'ready') {
      const storyId = stories[0]._id;
      log(`Step 1: 打开故事 ${storyId}`);
      await page.goto(`${BASE}/story/${storyId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await screenshot(page, '10-story-player');

      // 检查是否有播放按钮
      const playBtn = page.locator('svg path[d="M8 5v14l11-7z"]').first();
      if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        log('Step 2: 点击播放');
        await page.click('body'); // 点击任意位置播放
        await page.waitForTimeout(3000);
        await screenshot(page, '11-playing');
      }

      // 测试播放/暂停按钮
      log('Step 3: 测试暂停/播放按钮');
      const pauseBtn = page.locator('[aria-label="暂停"]');
      if (await pauseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pauseBtn.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '12-paused');
        // 恢复播放
        const playBtn2 = page.locator('[aria-label="播放"]');
        if (await playBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await playBtn2.click();
          await page.waitForTimeout(2000);
        }
      } else {
        log('  未找到播放/暂停按钮');
      }

      // 测试返回键
      log('Step 4: 测试返回键');
      const backBtn = page.locator('svg path[d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"]').first();
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 点击返回按钮的父元素
        await page.locator('.absolute.top-6.left-6').first().click();
        await page.waitForTimeout(1500);
        await screenshot(page, '13-after-back');
        log(`  当前 URL: ${page.url()}`);
      }

      // 回到故事页面测试重播
      log('Step 5: 重新打开故事测试重播');
      await page.goto(`${BASE}/story/${storyId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      // 点击播放然后等待结束或手动触发完成
      await page.click('body');
      await page.waitForTimeout(2000);
      await screenshot(page, '14-replay-test');

    } else {
      log('  无 ready 状态的故事可测试播放，跳过');
      // 检查 draft 状态的故事
      if (stories.length > 0) {
        log(`  第一个故事状态: ${stories[0].status}`);
      }
    }

    if (errors.length === 0) {
      log('✅ 播放器测试无错误');
    }
    return errors.length === 0;
  } catch (e: any) {
    log(`  ❌ 播放测试异常: ${e.message}`);
    return false;
  } finally {
    await page.close();
  }
}

// ============ 主流程 ============
async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  log('🚀 端到端测试开始');
  log(`截图目录: ${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream'], // 跳过麦克风权限弹窗
  });

  try {
    // 第 1 轮
    round = 1;
    const r1 = await runClickFlow(browser);
    log(r1 ? '✅ 第 1 轮通过' : '❌ 第 1 轮失败');

    // 第 2 轮
    round = 2;
    const r2 = await runApiTest(browser);
    log(r2 ? '✅ 第 2 轮通过' : '❌ 第 2 轮失败');

    // 第 3 轮
    round = 3;
    const r3 = await runPlaybackTest(browser);
    log(r3 ? '✅ 第 3 轮通过' : '❌ 第 3 轮失败');

    // 汇总
    log('');
    log('========== 测试汇总 ==========');
    log(`第 1 轮（点击选场景）: ${r1 ? '✅' : '❌'}`);
    log(`第 2 轮（API + 生成）: ${r2 ? '✅' : '❌'}`);
    log(`第 3 轮（播放 + 返回）: ${r3 ? '✅' : '❌'}`);
    log(`全部通过: ${r1 && r2 && r3 ? '✅ YES' : '❌ NO'}`);
  } finally {
    await browser.close();
  }

  // 输出报告
  const reportPath = path.join(SCREENSHOT_DIR, 'report.txt');
  fs.writeFileSync(reportPath, REPORT.join('\n'), 'utf-8');
  console.log(`\n报告: ${reportPath}`);
}

main().catch(console.error);
