import { chromium } from 'playwright';

async function runRound(round) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  const results = { passed: true, issues: [] };

  page.on('pageerror', e => {
    if (!e.message.includes('play() failed')) errors.push(e.message);
  });

  try {
    // 1. Clear auth + login
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.removeItem('story-ai-user');
      localStorage.removeItem('story-ai-token');
    });

    // Go to login page
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const loginInput = page.locator('#login-name');
    if (await loginInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginInput.fill('测试员');
      await page.locator('button:has-text("我是小朋友")').click();
      await page.locator('button:has-text("开始冒险")').click();
      await page.waitForTimeout(2000);
      const url = page.url();
      if (url.includes('login')) {
        results.passed = false;
        results.issues.push('登录后未跳转');
      }
      console.log(`  R${round}: 登录 - ${url.includes('features') ? '✅' : '❌ ' + url}`);
    } else {
      results.passed = false;
      results.issues.push('登录表单未出现');
      console.log(`  R${round}: 登录 - ❌ 表单未出现`);
    }

    // Check token
    const token = await page.evaluate(() => localStorage.getItem('story-ai-token'));
    if (!token) {
      results.passed = false;
      results.issues.push('Token 未存储');
    }
    console.log(`  R${round}: Token - ${token ? '✅' : '❌'}`);

    // 2. Navigate to CharacterSelect
    await page.goto('http://localhost:5173/character-select', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const url2 = page.url();
    if (url2.includes('login')) {
      results.passed = false;
      results.issues.push('AuthGuard 拦截了已登录用户');
      console.log(`  R${round}: AuthGuard - ❌ 被拦截`);
    } else {
      console.log(`  R${round}: AuthGuard - ✅ 放行`);
    }

    const body = await page.locator('body').innerText();
    const hasChars = body.includes('孙悟空') && body.includes('灰姑娘');
    const hasScenes = body.includes('天空之城') && body.includes('海洋王国');
    console.log(`  R${round}: 页面 - 角色:${hasChars} 场景:${hasScenes}`);

    if (!hasChars || !hasScenes) {
      results.passed = false;
      results.issues.push('页面未完整加载');
    }

    // 3. Click flow
    if (hasChars) {
      await page.locator('text=孙悟空').first().click();
      await page.waitForTimeout(800);
      console.log(`  R${round}: 角色选择 - ✅`);
    }

    if (hasScenes) {
      await page.locator('text=天空之城').first().click();
      await page.waitForTimeout(3000);
      const after = await page.locator('body').innerText();
      const hasPlot = after.includes('发生了什么事情');
      console.log(`  R${round}: 场景→剧情 - ${hasPlot ? '✅' : '❌'}`);
      if (!hasPlot) {
        results.passed = false;
        results.issues.push('剧情阶段未触发');
      }
    }

    // 4. StoryPlayer
    const stories = await page.evaluate(async () => {
      const token = localStorage.getItem('story-ai-token');
      const r = await fetch('/api/stories', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const d = await r.json();
      return d.data || [];
    });

    let readyStory = null;
    for (const s of stories) { if (s.status === 'ready') { readyStory = s; break; } }

    if (readyStory) {
      await page.goto(`http://localhost:5173/story/${readyStory._id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const pt = await page.locator('body').innerText();
      const ok = !pt.includes('加载故事中');
      console.log(`  R${round}: StoryPlayer - ${ok ? '✅' : '❌'}`);
      if (!ok) { results.passed = false; results.issues.push('播放器加载失败'); }

      await page.locator('.absolute.top-6.left-6').first().click();
      await page.waitForTimeout(800);
      console.log(`  R${round}: 返回键 - ${page.url().includes('features') ? '✅' : '❌'}`);
    }

    console.log(`  R${round}: ${results.passed ? '✅ PASS' : '❌ FAIL (' + results.issues.join('; ') + ')'}`);
  } catch (e) {
    results.passed = false;
    results.issues.push(`异常: ${e.message}`);
    console.log(`  R${round}: ❌ ${e.message}`);
  } finally {
    await browser.close();
  }
  return results;
}

console.log('🔄 3 轮登录流程测试\n');
let allPassed = true;
for (let r = 1; r <= 3; r++) {
  const res = await runRound(r);
  if (!res.passed) allPassed = false;
  console.log('');
}
console.log(`==========\n结果: ${allPassed ? '✅ 3轮全部通过' : '❌ 有失败'}`);
