// ===== DeepSeek 适配器（向后兼容）=====
// 委托给 StoryTextService，保持旧代码兼容
import type { IAiAdapter } from './IAiAdapter';
import { StoryTextService } from './StoryTextService';

const textService = new StoryTextService();

export class DeepSeekAdapter implements IAiAdapter {
  getLastUsage() { return textService.getLastUsage(); }

  async generateStory(params: {
    title: string;
    character: string;
    scene: string;
    description: string;
    style?: string;
  }) {
    return textService.generateStory(params);
  }

  async suggestStoryIdea(params: { character: string; scene: string }) {
    return textService.suggestStoryIdea(params);
  }
}
