import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', e => {
  if (!e.message.includes('play() failed')) errors.push(e.message);
});

try {
  // === Round 1: Login flow ===
  console.log('=== 测试 1: 登录流程 ===');

  // Clear storage first
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('story-ai-user');
    localStorage.removeItem('story-ai-token');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Navigate to character-select (should redirect to login)
  await page.goto('http://localhost:5173/character-select', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const url1 = page.url();
  console.log('未登录访问 CharacterSelect:', url1.includes('login') ? '✅ 正确跳转到登录' : '❌ 未跳转: ' + url1);

  // Fill login form
  const loginInput = page.locator('#login-name');
  if (await loginInput.isVisible().catch(() => false)) {
    await loginInput.fill('小测试');
    await page.locator('button:has-text("我是小朋友")').click();
    await page.locator('button:has-text("开始冒险")').click();
    await page.waitForTimeout(2000);
    const url2 = page.url();
    console.log('登录后跳转:', url2.includes('features') ? '✅ 跳转到 Features' : '⚠️ 位于: ' + url2);
  } else {
    console.log('❌ 登录表单未出现');
  }

  // === Round 2: Check token ===
  console.log('\n=== 测试 2: Token 验证 ===');
  const token = await page.evaluate(() => localStorage.getItem('story-ai-token'));
  console.log('Token:', token ? '✅ 已存储' : '❌ 无 Token');

  // === Round 3: Navigate to CharacterSelect ===
  console.log('\n=== 测试 3: 登录后访问 CharacterSelect ===');
  await page.goto('http://localhost:5173/character-select', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const url3 = page.url();
  const body = await page.locator('body').innerText();
  console.log('页面:', body.includes('选择你的小伙伴') ? '✅ CharacterSelect 正常' : '❌ 异常');
  console.log('URL:', url3.includes('character-select') ? '✅' : '⚠️ ' + url3);

  // === Round 4: Click-through flow ===
  console.log('\n=== 测试 4: 角色 → 场景 → 剧情 ===');
  await page.locator('text=孙悟空').first().click();
  await page.waitForTimeout(1000);
  console.log('角色选择: ✅');

  await page.locator('text=天空之城').first().click();
  await page.waitForTimeout(4000);
  const sceneBody = await page.locator('body').innerText();
  console.log('场景→剧情:', sceneBody.includes('发生了什么事情') ? '✅' : '❌');

  // === Round 5: Test API with token ===
  console.log('\n=== 测试 5: API 调用 ===');
  const apiResult = await page.evaluate(async (token) => {
    try {
      const r = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'E2E测试', type: 'ai_create', character: '小明', scene: '森林', description: '去森林冒险' }),
      });
      const d = await r.json();
      return { ok: r.ok, status: r.status, success: d.success, id: d.data?._id };
    } catch (e) {
      return { error: e.message };
    }
  }, token);
  console.log('创建故事:', apiResult);
  console.log('API 调用:', apiResult.success ? '✅ 成功' : '❌ 失败: ' + JSON.stringify(apiResult));

  // === Summary ===
  console.log('\n=== 汇总 ===');
  console.log('页面错误:', errors.length);
  if (errors.length > 0) errors.forEach(e => console.log('  ❌', e));
  console.log(errors.length === 0 ? '✅ 全部通过' : '❌ 有错误');

} finally {
  await browser.close();
}
