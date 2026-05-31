// ===== AI 适配器接口 =====
export interface IAiAdapter {
  generateStory(params: {
    title: string;
    character: string;
    scene: string;
    description: string;
    style?: string;
  }): Promise<{ pages: Array<{ pageNumber: number; text: string; illustrationUrl: string }> }>;

  suggestStoryIdea(params: { character: string; scene: string }): Promise<string>;
}
