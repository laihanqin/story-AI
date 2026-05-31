// ===== 故事文本生成 —— Prompt 模板 =====
// 调用 recallRules() 按标签召回规则，注入 prompt

import { recallRules } from '../constraints/story-text';

interface StoryPromptParams {
  character: string;
  scene: string;
  description: string;
  childAge?: string;
  childPersonality?: string;
  lesson?: string;
}

export function buildStoryPrompt(params: StoryPromptParams): { system: string; user: string } {
  const { character, scene, description, childAge, childPersonality, lesson } = params;

  // 召回知识库规则（年龄默认 5-6 岁，性格不传则不召回性格规则）
  const recalled = recallRules({
    childAge: childAge || '5',
    childPersonality,
  });

  const systemRules = recalled.system.join('\n\n');
  const userRules = recalled.user.map(r => `- ${r}`).join('\n');

  const system = `你是专注服务3-8岁孩子的童趣故事创作师，擅长生成充满乌龙幽默与软萌反转的儿童绘本故事。

## 安全红线（必须遵守）
${systemRules.split('\n\n').find(b => b.startsWith('故事安全红线')) || ''}

## 儿童故事创作指南
${systemRules.split('\n\n').filter(b => !b.startsWith('故事安全红线')).join('\n\n')}
- 语言简单温暖，3-8岁孩子能听懂
- 禁止说教，通过故事自然传递价值观
- 故事短小精悍，讲好一个小反转就自然收尾，不要拖长`;

  let user = `请根据以下信息创作一个${childAge || '5-6'}岁儿童的绘本故事。直接生成故事，不要解释，不要注意事项。

这是一个短篇绘本故事，写一个小反转就自然收尾，不要拖太长。

角色：${character}
场景：${scene}
剧情：${description}`;

  if (childAge) {
    user += `\n孩子年龄：${childAge}岁`;
  }
  if (childPersonality) {
    user += `\n孩子性格：${childPersonality}`;
  }
  if (lesson) {
    user += `\n想让孩子了解的道理：${lesson}`;
  }

  user += `\n
## 创作要求
${userRules}

输出格式：
【故事标题】
（故事正文）`;

  return { system, user };
}
