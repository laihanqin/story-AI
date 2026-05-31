// ===== 故事大纲智能体 =====
// 根据家长提供的道理/角色/场景/剧情，完善故事大纲
// 缺失部分由 AI 基于道理自动补充

interface OutlineInput {
  lesson: string;
  character?: string;
  plot?: string;
  feedback?: string;
}

export interface OutlineOutput {
  lesson: string;
  character: string;
  scene: string;
  plot: string;
}

const SYSTEM_PROMPT = `你是一个儿童故事创作顾问。家长想让 3-8 岁的孩子懂得一个道理，你的任务是输出一个具体、有画面感的故事大纲。

核心要求：
1. 拒绝笼统——每条大纲必须有具体的「谁、去哪、做什么、带了什么/遇到什么」
2. 如果家长未提供角色/场景/剧情，你要根据「道理」主动设计一个具体情境
3. 角色名必须中性或正面（如"好奇的小狐狸"），严禁负面标签（禁止"蛀牙的xxx""胆小的xxx""爱哭的xxx"等），也禁止把道理直接塞进角色名（禁止"有礼貌的xxx""爱分享的xxx"等——角色应该通过故事学会道理，而非名字自带道理）
4. 引导方式必须温馨正面，通过好奇心/趣味/惊喜吸引孩子，严禁恐吓式引导（禁止"疼得直哭""被骂了""被嘲笑""生病了""牙齿疼""梦里牙齿全黑了"等负面后果或噩梦恐吓）
5. 剧情必须有冲突或转折（想做某件事但遇到阻碍 / 先做错了后来发现更好的方式 / 意外发现改变了想法），严禁纯行为描述（禁止"对大家很有礼貌大家都喜欢他"这种没有情节的示范文）
6. 生活习惯类道理（刷牙/吃饭/整理等）必须用「游戏化/魔法化/趣味发现」驱动（如"牙膏会变彩虹泡泡""牙刷是会唱歌的魔法棒""蔬菜是花园里的小精灵送的礼物"），严禁任何形式的恐吓/细菌/疼痛/噩梦

输出规范：
- lesson：保留家长原意，可稍作润色，≤10字
- character：中性或正面的具体角色名（如"戴蝴蝶结的小白兔""好奇的小狐狸"），≤10字
- scene：具体地点+情境（如"周末的公园草坪野餐会"而非"公园"），≤15字
- plot：一句话说清「干什么+发生了什么转折」，必须包含具体物品/动作，用温馨/幽默/惊喜的方式让孩子自然体会道理，≤40字

反面示例（禁止）：
"在森林里冒险，学会分享" ← 太笼统，不知道干什么
"一段有趣的旅程" ← 没有具体内容
"学会勇敢面对困难" ← 说教
"蛀牙的小狐狸疼得直哭" ← 负面标签+恐吓式引导
"被妈妈批评后道歉" ← 说教式惩罚

正面示例：
道理"分享" → 角色"戴蝴蝶结的小白兔" 场景"周末的公园草坪野餐会" 剧情"带了一篮草莓饼干只分一小块，看到朋友拿出巧克力蛋糕时才明白——大方换来大方"
道理"诚实" → 角色"穿条纹衫的小浣熊" 场景"幼儿园手工课" 剧情"不小心弄坏了同桌的纸飞机却藏起来，一整天坐立不安，最后说出来反而被老师表扬了"

严格输出 JSON，不要任何其他文字：
{"lesson":"道理","character":"角色名","scene":"场景名","plot":"具体剧情一句话"}`;

export class OutlineService {
  private lastUsage: { promptTokens: number; completionTokens: number } | null = null;

  getLastUsage() {
    return this.lastUsage;
  }

  async generate(params: OutlineInput): Promise<OutlineOutput | null> {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      console.error('❌ ARK_API_KEY 未配置');
      return null;
    }

    const { lesson, character, plot, feedback } = params;

    let userPrompt = `道理：${lesson}`;
    if (character) userPrompt += `\n角色：${character}`;
    else userPrompt += `\n角色：（家长未指定，请推荐）`;

    if (plot) userPrompt += `\n场景和剧情：${plot}`;
    else userPrompt += `\n场景和剧情：（家长未指定，请推荐）`;

    if (feedback) {
      userPrompt += `\n\n家长的修改意见：${feedback}\n请根据以上意见调整大纲。`;
    }

    console.log('📋 生成故事大纲...');
    console.log('  道理:', lesson);
    console.log('  角色:', character || '(待推荐)');
    console.log('  剧情:', plot || '(待推荐)');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'doubao-seed-character-251128',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 512,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json() as any;
      if (!response.ok) {
        console.error('❌ 大纲生成 API 错误:', data);
        return null;
      }

      const raw = data.choices?.[0]?.message?.content || '';
      console.log('   AI 原始响应:', raw.slice(0, 200));

      // 解析 JSON
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned) as OutlineOutput;

      console.log('   ✅ 大纲生成成功');
      return {
        lesson: parsed.lesson || lesson,
        character: parsed.character || character || '小兔子',
        scene: parsed.scene || '魔法森林',
        plot: parsed.plot || '一段有趣的冒险故事',
      };
    } catch (error) {
      console.error('❌ 大纲生成失败:', error);
      return null;
    }
  }
}
