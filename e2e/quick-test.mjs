import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

// Login first
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const loginInput = page.locator('#login-name');
if (await loginInput.isVisible().catch(() => false)) {
  await loginInput.fill('小明');
  await page.locator('button:has-text("我是小朋友")').click();
  await page.locator('button:has-text("开始冒险")').click();
  await page.waitForTimeout(1500);
  console.log('已登录');
}

// Navigate to character select
await page.goto('http://localhost:5173/character-select', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Click character: 孙悟空
const charEl = page.locator('text=孙悟空').first();
if (await charEl.isVisible().catch(() => false)) {
  await charEl.click();
  console.log('已选择角色: 孙悟空');
  await page.waitForTimeout(1500);
}

// Check scene cards
const sceneEl = page.locator('text=天空之城').first();
if (await sceneEl.isVisible().catch(() => false)) {
  await sceneEl.click();
  console.log('已选择场景: 天空之城（点击）');
  await page.waitForTimeout(3000);

  // Check dialog state
  const text = await page.locator('body').innerText();
  console.log('剧情引导出现:', text.includes('发生了什么事情'));
  console.log('对话区内容:', text.slice(400, 900));
}

// Check mic button
const micCount = await page.locator('text=🎤').count();
console.log('麦克风元素:', micCount);

// Check for errors
console.log('控制台错误:', errors.length, errors.slice(0, 3).join(' | '));

await page.screenshot({ path: 'e2e/screenshots/quick-test.png', fullPage: true });
console.log('截图已保存');

await browser.close();
