// ===== 单故事评分 =====
import 'dotenv/config';

const STORY_ID = '1779533400729';

async function main() {
  const res = await fetch(`http://localhost:3000/api/stories/${STORY_ID}`);
  const data = await res.json();
  if (!data.success) { console.error('获取失败'); process.exit(1); }

  const story = data.data;
  const fullText = story.pages.map((p: any) => p.text).join('\n\n');
  console.log(`📖 "${story.title}" | ${fullText.length}字 | ${story.pages.length}页\n`);

  const rubric = `你是儿童故事评审专家。对以下故事评分，满分10分/项，总分70。

维度：
1. 童趣语言：语言简单温暖，3-8岁能听懂，拟声词和软萌动作运用
2. 反转质量：反转是否制造了令人"哇"的意外时刻
3. 幽默感：是否有2-3个连锁乌龙事件，笑点密集
4. 配角互动：配角是否有存在感和自己的小笑点
5. 结尾：是否乌龙幽默收尾，避免说教
6. 正向价值观：是否自然传递，不做作
7. 字数适配：是否在600-750字

只输出JSON，不要markdown，不要解释：
{"scores":{"童趣语言":0,"反转质量":0,"幽默感":0,"配角互动":0,"结尾":0,"正向价值观":0,"字数适配":0},"total":0,"comment":"简短评语"}`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是儿童故事评审专家。只输出JSON，不要markdown代码块包裹，不要任何解释文字。' },
        { role: 'user', content: `${rubric}\n\n故事正文：\n${fullText}` },
      ],
      max_tokens: 512, temperature: 0.1,
    }),
  });

  const j: any = await response.json();
  let raw: string = j.choices?.[0]?.message?.content || '';
  console.log('RAW:', raw.slice(0, 300));

  // 多层清理
  let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // Try to find JSON block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const result = JSON.parse(cleaned);
    console.log('\n📊 评分:');
    for (const [k, v] of Object.entries(result.scores)) console.log(`   ${k}: ${v}/10`);
    console.log(`   📊 总分: ${result.total}/70`);
    console.log(`   💬 ${result.comment}`);
  } catch {
    console.error('JSON解析失败，raw:', raw);
  }

  console.log('\n📦 产出:');
  console.log(`   文本: ${fullText.length}字 | 图片: ${story.pages.filter((p: any) => p.illustrationUrl).length}/5 | 音频: ${story.pages[0]?.audioUrl ? '✅' : '❌'}`);
  const audioUrls = [...new Set(story.pages.map((p: any) => p.audioUrl))];
  console.log(`   音频一致性: ${audioUrls.length === 1 ? '✅ 共用同一文件' : '❌'}`);
}

main().catch(console.error);
