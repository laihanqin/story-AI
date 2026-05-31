// ===== 故事分页 + 配图 Prompt 生成 =====

export interface PagePart {
  part: '开场' | '发展' | '高潮' | '反转' | '结尾';
  summary: string;
  narration: string;
  imagePrompt: string;
}

export interface SplitResult {
  characterProfile: string;
  pages: PagePart[];
}

export function buildSplitPrompt(storyText: string): { system: string; user: string } {
  const system = `你是获得过诺贝尔文学奖的儿童故事作家，擅长创作天马行空的想象力故事，也擅长将故事拆解为清晰的叙事弧线。

你的任务：
1. 仔细阅读故事，理解核心情节和情感脉络
2. 将故事拆分为5个叙事段落：开场 → 发展 → 高潮 → 反转 → 结尾
3. 从故事中提取主角的外观特征（年龄、体型、颜色、标志特征、服装），形成角色画像
4. 为每个段落写一句话总结
5. 为每个段落生成配图描述

配图描述要求：
- 每个 imagePrompt 以固定前缀开头：「吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图」
- 色调按段落情绪变化：开场明亮温暖 → 发展活泼轻快 → 高潮热烈浓烈 → 反转意外灵动 → 结尾温馨柔和
- 场景画面根据该段总结具体描写（角色在做什么、在哪里、什么氛围、谁在旁边）
- 所有5张配图的主角外观必须与角色画像一致
- 【极其重要】角色必须是纯粹的动物/非人形象，绝对禁止出现人头动物身体、半人半兽、或任何人类特征混合。如果角色是动物，就画完整的动物，不要画成人形

输出纯JSON，不要markdown包裹。`;

  const user = `拆解以下故事为5个叙事段落：

---
${storyText}
---

输出JSON：
{
  "characterProfile": "主角外观：年龄、体型、毛色/颜色、标志特征（如腮红、尾巴形状）、服装配饰",
  "pages": [
    {
      "part": "开场",
      "summary": "一句话概括",
      "narration": "该段朗读文本（120-150字）",
      "imagePrompt": "吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图。色调：[温暖明亮]。场景：[具体画面，含角色+动作+地点+氛围]"
    },
    {
      "part": "发展",
      "summary": "...",
      "narration": "...",
      "imagePrompt": "吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图。色调：[活泼轻快]。场景：..."
    },
    {
      "part": "高潮",
      "summary": "...",
      "narration": "...",
      "imagePrompt": "吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图。色调：[热烈浓烈]。场景：..."
    },
    {
      "part": "反转",
      "summary": "...",
      "narration": "...",
      "imagePrompt": "吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图。色调：[意外灵动]。场景：..."
    },
    {
      "part": "结尾",
      "summary": "...",
      "narration": "...",
      "imagePrompt": "吉卜力动画电影风格，柔光暖调，纯真治愈，手绘水彩质感，2:1宽幅构图。色调：[温馨柔和]。场景：..."
    }
  ]
}`;

  return { system, user };
}

const VALID_PARTS = ['开场', '发展', '高潮', '反转', '结尾'] as const;

export function validateSplitResult(data: any): data is SplitResult {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.characterProfile !== 'string' || !data.characterProfile.trim()) return false;
  if (!Array.isArray(data.pages) || data.pages.length !== 5) return false;
  return data.pages.every((p: any) => {
    if (!p || typeof p !== 'object') return false;
    if (!VALID_PARTS.includes(p.part)) return false;
    if (typeof p.summary !== 'string' || !p.summary.trim()) return false;
    if (typeof p.narration !== 'string' || !p.narration.trim()) return false;
    if (typeof p.imagePrompt !== 'string' || !p.imagePrompt.trim()) return false;
    return true;
  });
}
