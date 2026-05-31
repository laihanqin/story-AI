// ===== AI 服务工厂 =====
import type { IAiAdapter } from './IAiAdapter';
import { MockAiAdapter } from './MockAiAdapter';
import { DeepSeekAdapter } from './DeepSeekAdapter';

let aiInstance: IAiAdapter | null = null;

export function getAiAdapter(): IAiAdapter {
  if (!aiInstance) {
    if (process.env.ARK_API_KEY) {
      console.log('🤖 使用豆包适配器');
      aiInstance = new DeepSeekAdapter();
    } else {
      console.log('📦 使用 Mock 适配器');
      aiInstance = new MockAiAdapter();
    }
  }
  return aiInstance;
}

export type { IAiAdapter };

// 独立服务导出
export { StoryTextService } from './StoryTextService';
export { ParentStoryTextService } from './ParentStoryTextService';
export { ImageService } from './ImageService';
export { TtsService } from './TtsService';
