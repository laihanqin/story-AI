// ===== Mock AI 适配器 =====
import type { IAiAdapter } from './IAiAdapter';

export class MockAiAdapter implements IAiAdapter {
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateStory(params: {
    title: string;
    character: string;
    scene: string;
    description: string;
  }) {
    await this.delay(1000);

    return {
      pages: [
        {
          pageNumber: 1,
          text: `从前，在一个神奇的地方，住着一个勇敢的小英雄。\n\n${params.title} 的故事就这样开始了...\n\n这是一个关于 ${params.character || '勇敢'} 的冒险故事。`,
          illustrationUrl: '',
        },
        {
          pageNumber: 2,
          text: `${params.scene || '这个世界'} 里充满了奇妙的事物。天空中飘着七彩的云朵，地上开满了会唱歌的花朵。\n\n每一天都有新的惊喜等待着被发现。`,
          illustrationUrl: '',
        },
        {
          pageNumber: 3,
          text: `${params.description || '主角踏上了一段奇妙的旅程。一路上遇到了许多新朋友，也学会了许多新本领。'}`,
          illustrationUrl: '',
        },
        {
          pageNumber: 4,
          text: `经过了一番努力和冒险，主人公终于实现了自己的目标。\n\n更重要的是，在这一路上收获了真挚的友谊和宝贵的智慧。`,
          illustrationUrl: '',
        },
        {
          pageNumber: 5,
          text: `就这样，${params.title} 的故事圆满结束了。\n\n但新的冒险才刚刚开始...\n\n—— 完 ——`,
          illustrationUrl: '',
        },
      ],
    };
  }

  async suggestStoryIdea(params: { character: string; scene: string }) {
    await this.delay(500);
    return `有一天，${params.character} 在 ${params.scene} 发现了一个闪闪发光的秘密通道，它决定走进去看看...`;
  }
}
