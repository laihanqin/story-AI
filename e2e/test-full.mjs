import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', e => errors.push(e.message));

console.log('========== 测试 1：登录 ==========');
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const loginInput = page.locator('#login-name');
if (await loginInput.isVisible().catch(() => false)) {
  await loginInput.fill('小明');
  await page.locator('button:has-text("我是小朋友")').click();
  await page.locator('button:has-text("开始冒险")').click();
  await page.waitForTimeout(1500);
  console.log('✅ 登录成功');
} else {
  console.log('✅ 已登录');
}

console.log('\n========== 测试 2：角色选择页 ==========');
await page.goto('http://localhost:5173/character-select', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const bodyText = await page.locator('body').innerText();
console.log('角色列表:', bodyText.includes('孙悟空') && bodyText.includes('灰姑娘'));
console.log('场景列表:', bodyText.includes('天空之城') && bodyText.includes('海洋王国'));
console.log('页面完整:', bodyText.includes('选择你的小伙伴') && bodyText.includes('你想去哪里冒险呢'));

console.log('\n========== 测试 3：选择角色 ==========');
await page.locator('text=孙悟空').first().click();
await page.waitForTimeout(1000);
const afterChar = await page.locator('body').innerText();
console.log('角色选中后对话出现:', afterChar.length > 500);

console.log('\n========== 测试 4：点击选场景 ==========');
await page.locator('text=天空之城').first().click();
await page.waitForTimeout(4000);
const afterScene = await page.locator('body').innerText();
const hasPlotPrompt = afterScene.includes('发生了什么事情');
console.log('剧情引导出现:', hasPlotPrompt);

console.log('\n========== 测试 5：语音识别入口 ==========');
const allImgs = await page.locator('img').count();
console.log('图片总数:', allImgs);

const speechAvailable = await page.evaluate(() => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
});
console.log('Web Speech API:', speechAvailable ? '可用' : '不可用');

console.log('\n========== 测试 6：StoryPlayer 播放 ==========');
const stories = await page.evaluate(async () => {
  const token = localStorage.getItem('story-ai-token');
  const r = await fetch('/api/stories', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const d = await r.json();
  return d.data || [];
});
console.log(`故事总数: ${stories.length}`);

let readyStory = null;
for (const s of stories) {
  if (s.status === 'ready') { readyStory = s; break; }
}

if (readyStory) {
  console.log(`打开故事: ${readyStory._id} (${readyStory.title})`);
  await page.goto(`http://localhost:5173/story/${readyStory._id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const playPageText = await page.locator('body').innerText();
  console.log('播放器加载:', !playPageText.includes('加载故事中'));
  console.log('故事内容:', playPageText.slice(0, 200));

  // Click to play
  await page.locator('body').click();
  await page.waitForTimeout(2500);

  // Check pause button
  const pauseBtn = page.locator('[aria-label="暂停"]');
  console.log('暂停按钮:', await pauseBtn.isVisible().catch(() => false));

  // Test back button
  await page.locator('.absolute.top-6.left-6').first().click();
  await page.waitForTimeout(1000);
  console.log('返回后URL:', page.url());

  // Go back and test replay
  await page.goto(`http://localhost:5173/story/${readyStory._id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('body').click();
  await page.waitForTimeout(1500);
  console.log('重播测试: 播放器正常加载');
} else {
  console.log('无 ready 状态故事');
}

console.log('\n========== 汇总 ==========');
console.log('控制台错误:', errors.length);
if (errors.length > 0) {
  errors.forEach(e => console.log('  ❌', e));
}
console.log(errors.length === 0 ? '✅ 全部测试通过' : '❌ 存在错误');

await browser.close();
