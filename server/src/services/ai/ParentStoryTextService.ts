// ===== 家长故事文本智能体 =====
// 接收 outline 四要素 + 道理，生成自然融入道理的故事文本
// 复用 StoryTextService 的 API 调用和分页能力

import { buildStoryPrompt } from '../../config/prompts/story-text';
import { buildSplitPrompt, type SplitResult, validateSplitResult } from '../../config/prompts/story-pages';
import { MODEL_CONFIG } from '../../config/model';
import { filterContent } from '../../config/constraints/story-text';

const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(
  messages: ChatMessage[],
  overrides?: { max_tokens?: number; temperature?: number },
): Promise<{ content: string; usage: { prompt: number; completion: number; total: number } }> {
  const cfg = MODEL_CONFIG.storyText;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeout);
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        max_tokens: overrides?.max_tokens ?? cfg.max_tokens,
        temperature: overrides?.temperature ?? cfg.temperature,
        top_p: cfg.top_p,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 错误 ${response.status}: ${err}`);
    }
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const u = data.usage || {};
    return {
      content,
      usage: { prompt: u.prompt_tokens || 0, completion: u.completion_tokens || 0, total: u.total_tokens || 0 },
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function parseStoryOutput(raw: string): { title: string; content: string } {
  const cleaned = raw.trim();
  const titleMatch = cleaned.match(/【(.+?)】/);
  const title = titleMatch ? titleMatch[1] : '未命名故事';
  const content = cleaned.replace(/【.+?】/, '').trim();
  return { title, content };
}

const SYSTEM_PROMPT = `你是专注服务3-8岁孩子的童趣故事创作师，擅长生成充满乌龙幽默与软萌反转的儿童绘本故事。

核心要求：
1. 故事必须有一个明确的「道理主题」（如分享、诚实、勇敢），但严禁说教——道理要像藏在蛋糕里的水果夹心，孩子读到结尾自然体会到
2. 语言简单温暖，3-8岁孩子能听懂，句子朗朗上口
3. 故事短小精悍，讲好一个小反转就自然收尾，不要拖长
4. 角色行为要符合3-8岁儿童的认知水平，不能太复杂
5. 禁止任何恐吓式内容（疼痛、噩梦、被骂、被嘲笑、生病、细菌等）
6. 禁止负面标签角色名（如"胆小的xxx"），角色名必须中性或正面
7. 生活习惯类（刷牙/吃饭/整理）必须用游戏化/魔法化/趣味发现驱动

输出格式：
第一行写【你的故事标题】，然后另起一行开始写故事正文。标题要体现故事的核心情节或角色特征，不要写"故事标题"三个字。

示例：
【小刺猬的糖果派对】
（正文开始...）`;

export class ParentStoryTextService {
  private lastUsage = { prompt: 0, completion: 0, total: 0 };

  getLastUsage() { return this.lastUsage; }

  async generateStory(params: {
    lesson: string;
    character: string;
    scene: string;
    plot: string;
  }): Promise<{ title: string; content: string }> {
    const { lesson, character, scene, plot } = params;

    const userPrompt = `请创作一个儿童绘本故事。

故事要让孩子体会的道理：${lesson}
主角：${character}
场景：${scene}
剧情方向：${plot}

直接按格式输出故事。`;

    const { content: text, usage } = await chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    this.lastUsage = usage;

    const { title, content } = parseStoryOutput(text);
    const filter = filterContent(content);
    if (!filter.clean) {
      console.warn(`⚠️ 故事内容触发敏感词: ${filter.hits.join(', ')}`);
    }

    return { title, content: filter.text };
  }

  async splitIntoPages(storyText: string): Promise<SplitResult | null> {
    const { system, user } = buildSplitPrompt(storyText);
    const splitCfg = MODEL_CONFIG.storySplit;
    let lastError = '';

    for (let attempt = 0; attempt <= 2; attempt++) {
      const { content } = await chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { max_tokens: splitCfg.max_tokens, temperature: splitCfg.temperature });

      const result = this.extractJson(content);
      if (result && validateSplitResult(result)) {
        if (attempt > 0) console.log(`   ✅ 分页校验通过 (第${attempt + 1}次尝试)`);
        return this.sanitizeSplitResult(result);
      }

      if (result) {
        lastError = this.diagnoseSplitResult(result);
        console.log(`   ⚠️ 分页校验不通过 (第${attempt + 1}次): ${lastError}`);
      } else {
        lastError = `JSON解析失败: ${content.slice(0, 100)}`;
        console.log(`   ⚠️ 分页JSON解析失败 (第${attempt + 1}次)`);
      }

      if (attempt < 2) console.log('   🔄 分页重试...');
    }

    console.error(`   ❌ 分页最终失败: ${lastError}`);
    return null;
  }

  private extractJson(content: string): any | null {
    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
      }
      return null;
    }
  }

  private diagnoseSplitResult(data: any): string {
    const issues: string[] = [];
    if (!data.characterProfile || typeof data.characterProfile !== 'string') issues.push('缺少characterProfile');
    if (!Array.isArray(data.pages)) { issues.push('pages不是数组'); }
    else {
      if (data.pages.length !== 5) issues.push(`pages数量=${data.pages.length}(期望5)`);
      data.pages.forEach((p: any, i: number) => {
        const missing = ['part', 'summary', 'narration', 'imagePrompt'].filter(f => !p?.[f]);
        if (missing.length) issues.push(`第${i + 1}页缺少: ${missing.join(',')}`);
      });
    }
    return issues.join('; ') || '未知原因';
  }

  private sanitizeSplitResult(result: SplitResult): SplitResult {
    let totalHits: string[] = [];
    const sanitizedPages = result.pages.map(p => {
      const nf = filterContent(p.narration);
      const ipf = filterContent(p.imagePrompt);
      const sf = filterContent(p.summary);
      totalHits = [...totalHits, ...nf.hits, ...ipf.hits, ...sf.hits];
      return { ...p, narration: nf.text, imagePrompt: ipf.text, summary: sf.text };
    });
    if (totalHits.length > 0) {
      console.warn(`⚠️ 分页内容触发敏感词: ${[...new Set(totalHits)].join(', ')}`);
    }
    return { ...result, pages: sanitizedPages };
  }
}
