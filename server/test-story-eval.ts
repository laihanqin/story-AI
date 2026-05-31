// ===== 故事生成 + LLM-as-Judge 评分 =====
import 'dotenv/config';
import { getAiAdapter } from './src/services/ai';

const TEST_CASES = [
  { character: '胖嘟嘟的小白兔', scene: '糖果城堡的彩虹大厅', description: '小白兔想偷吃城堡里最大的彩虹棒棒糖，结果棒棒糖活了追着它满城堡跑' },
  { character: '会打喷嚏的小云朵', scene: '长满棉花糖树的山谷', description: '小云朵每次打喷嚏就会下雨，把山谷里的动物们淋得湿漉漉的，它想学会控制喷嚏' },
  { character: '圆滚滚的小松鼠豆豆', scene: '月亮上的坚果商店', description: '豆豆把坚果商店的所有坚果都藏进了自己的腮帮子，结果嘴巴鼓得像气球飞了起来' },
  { character: '爱跳舞的小熊猫胖达', scene: '竹林里的星光舞台', description: '胖达想在星光舞台上表演，但一跳起舞来就踩到自己的尾巴，引发了一连串搞笑事故' },
  { character: '总念错咒语的小女巫咪咪', scene: '泡泡糖森林里的魔法学校', description: '咪咪想把铅笔变成巧克力，结果把整个教室变成了巧克力池，老师和同学们都在巧克力里游泳' },
];

interface StoryResult { id: number; title: string; content: string; elapsed: number; tokens: { prompt: number; completion: number; total: number } }

async function generateAll(): Promise<StoryResult[]> {
  const adapter = getAiAdapter();
  const results: StoryResult[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const t = TEST_CASES[i];
    console.log(`⏳ 生成 #${i + 1}...`);
    const start = Date.now();
    const result = await adapter.generateStory({ title: `test-${i + 1}`, ...t });
    const elapsed = Date.now() - start;
    const usage = (adapter as any).getLastUsage?.() || { prompt: 0, completion: 0, total: 0 };
    results.push({ id: i + 1, title: (result as any).title, content: (result as any).content || (result as any).pages?.[0]?.text, elapsed, tokens: usage });
  }
  return results;
}

async function evaluate(results: StoryResult[]) {
  const storiesBlock = results.map(r =>
    `### 故事${r.id}\n角色：${TEST_CASES[r.id - 1].character}\n场景：${TEST_CASES[r.id - 1].scene}\n\n正文：\n${r.content}`
  ).join('\n\n---\n\n');

  const rubric = `你是儿童故事评审专家。对以下5个故事评分，满分10分/项，总分70。

维度：
1. 童趣语言：语言简单温暖，3-8岁能听懂，拟声词和软萌动作运用
2. 反转质量：反转是否制造了令人"哇"的意外时刻，是否成为故事高潮转折点
3. 幽默感：是否至少有2-3个连锁乌龙事件，笑点是否密集
4. 配角互动：配角是否有存在感和自己的小笑点
5. 结尾：是否乌龙幽默收尾，避免说教
6. 正向价值观：是否自然传递，不做作
7. 字数适配：是否在600-750字

输出JSON（只输出JSON，不要markdown包裹）：
{"stories":[{"id":1,"scores":{"童趣语言":0,"反转质量":0,"幽默感":0,"配角互动":0,"结尾":0,"正向价值观":0,"字数适配":0},"total":0,"comment":""}],"overall":{"avg":0,"best":0,"worst":0,"summary":""}}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是儿童故事评审专家。只输出JSON，不要markdown包裹，不要解释。确保JSON格式完全正确。' },
          { role: 'user', content: `${rubric}\n\n${storiesBlock}` },
        ],
        max_tokens: 2048, temperature: 0.1, top_p: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || '';

    // 多层清理
    raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // 尝试修复常见 JSON 错误
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // retry: 尝试提取 JSON 子串
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('无法解析JSON');
    }

    return result;
  } catch (error) {
    clearTimeout(timeout);
    console.error('评分失败:', error);
    return null;
  }
}

async function main() {
  // Phase 1: 生成
  console.log('🖊️  生成5个故事...\n');
  const stories = await generateAll();

  console.log('\n📊 Token 统计:');
  let totalPrompt = 0, totalCompletion = 0, totalTotal = 0;
  for (const s of stories) {
    totalPrompt += s.tokens.prompt;
    totalCompletion += s.tokens.completion;
    totalTotal += s.tokens.total;
    console.log(`  #${s.id}: ${s.elapsed}ms | tokens: ${s.tokens.total} (p:${s.tokens.prompt} c:${s.tokens.completion}) | ${s.title}`);
  }
  console.log(`  平均: ${Math.round(totalTotal / 5)} tokens/故事 | prompt: ${Math.round(totalPrompt / 5)} | completion: ${Math.round(totalCompletion / 5)}`);

  // Phase 2: 评分
  console.log('\n🤖 LLM-as-Judge 评分中...\n');
  const evalResult = await evaluate(stories);

  if (!evalResult) return;

  console.log('| # | 童趣语言 | 反转 | 幽默 | 配角 | 结尾 | 价值观 | 字数 | 总分 |');
  console.log('|---|---------|------|------|------|------|--------|------|------|');
  for (const s of evalResult.stories) {
    const sc = s.scores;
    console.log(`| ${s.id} | ${sc['童趣语言']} | ${sc['反转质量']} | ${sc['幽默感']} | ${sc['配角互动']} | ${sc['结尾']} | ${sc['正向价值观']} | ${sc['字数适配']} | **${s.total}** |`);
  }

  console.log(`\n📈 平均 ${evalResult.overall.avg} 分 | 最佳 #${evalResult.overall.best} | 最差 #${evalResult.overall.worst}`);
  console.log(`💬 ${evalResult.overall.summary}\n`);
  for (const s of evalResult.stories) console.log(`  #${s.id}: ${s.comment}`);

  // 对比第一轮
  console.log('\n📈 对比第一轮（prompt调整前）:');
  console.log('  第一轮平均: 60.2 / 70');
  console.log(`  第二轮平均: ${evalResult.overall.avg} / 70`);
}

main();
