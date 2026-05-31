// ===== 故事文本服务 —— DeepSeek API =====
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
      throw new Error(`DeepSeek API 错误 ${response.status}: ${err}`);
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

export class StoryTextService {
  private lastUsage = { prompt: 0, completion: 0, total: 0 };

  getLastUsage() { return this.lastUsage; }

  async generateStory(params: {
    title: string;
    character: string;
    scene: string;
    description: string;
    style?: string;
  }) {
    const { system, user } = buildStoryPrompt({
      character: params.character,
      scene: params.scene,
      description: params.description || '自由发挥',
    });

    const { content: text, usage } = await chat([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    this.lastUsage = usage;

    const { title, content } = parseStoryOutput(text);

    // 内容安全过滤
    const filter = filterContent(content);
    if (!filter.clean) {
      console.warn(`⚠️ 故事内容触发敏感词: ${filter.hits.join(', ')}`);
    }

    return {
      title,
      content: filter.text,
      pages: [{ pageNumber: 1, text: filter.text, illustrationUrl: '' }],
    };
  }

  async suggestStoryIdea(params: { character: string; scene: string }) {
    const prompt = `请为儿童故事创作一个简短有趣的创意点子（一句话）。角色是"${params.character}"，场景是"${params.scene}"。`;
    const { content } = await chat([{ role: 'user', content: prompt }]);
    return content;
  }

  async splitIntoPages(storyText: string): Promise<SplitResult | null> {
    const { system, user } = buildSplitPrompt(storyText);
    const splitCfg = MODEL_CONFIG.storySplit;
    let lastError: string = '';

    for (let attempt = 0; attempt <= 2; attempt++) {
      const { content } = await chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { max_tokens: splitCfg.max_tokens, temperature: splitCfg.temperature });

      const result = this.extractJson(content);
      if (result && validateSplitResult(result)) {
        if (attempt > 0) console.log(`   ✅ 分页校验通过 (第${attempt + 1}次尝试)`);
        // 对每页内容做安全过滤
        return this.sanitizeSplitResult(result);
      }

      if (result) {
        const issues = this.diagnoseSplitResult(result);
        lastError = issues;
        console.log(`   ⚠️ 分页结果校验不通过 (第${attempt + 1}次): ${issues}`);
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
      const narrationFilter = filterContent(p.narration);
      const imgPromptFilter = filterContent(p.imagePrompt);
      const summaryFilter = filterContent(p.summary);
      totalHits = [...totalHits, ...narrationFilter.hits, ...imgPromptFilter.hits, ...summaryFilter.hits];
      return {
        ...p,
        narration: narrationFilter.text,
        imagePrompt: imgPromptFilter.text,
        summary: summaryFilter.text,
      };
    });
    if (totalHits.length > 0) {
      console.warn(`⚠️ 分页内容触发敏感词: ${[...new Set(totalHits)].join(', ')}`);
    }
    return { ...result, pages: sanitizedPages };
  }
}
