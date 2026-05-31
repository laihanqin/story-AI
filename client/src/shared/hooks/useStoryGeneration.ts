import { useRef, useCallback } from 'react';
import { getAccessHeaders } from '@shared/services/access';

interface StoryGenInput {
  character: string;
  scene: string;
  plot: string;
  characterImg?: string;
}

interface StoryGenCallbacks {
  onProgress: (progress: number, message: string) => void;
  onDone: (storyId: string) => void;
  onFail: () => void;
}

export function useStoryGeneration() {
  const cancelledRef = useRef(false);
  const storyIdRef = useRef('');

  const getHeaders = () => {
    const token = localStorage.getItem('story-ai-token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAccessHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const generate = useCallback(async (input: StoryGenInput, callbacks: StoryGenCallbacks) => {
    cancelledRef.current = false;
    storyIdRef.current = '';

    const { character, scene, plot, characterImg } = input;
    const title = `${character}的${scene}冒险`;
    const headers = getHeaders();

    try {
      // Step 1: 创建故事
      if (cancelledRef.current) return;
      callbacks.onProgress(5, '正在构思故事...');
      const createRes = await fetch('/api/stories', {
        method: 'POST', headers,
        body: JSON.stringify({ title, type: 'ai_create', character, scene, description: plot }),
      });
      if (cancelledRef.current) return;
      const createData = await createRes.json();
      if (!createData.success) { callbacks.onFail(); return; }
      const storyId = createData.data._id;
      storyIdRef.current = storyId;
      callbacks.onProgress(12, '故事框架已创建...');

      // Step 2: 生成故事文本
      if (cancelledRef.current) return;
      const genRes = await fetch(`/api/stories/${storyId}/generate`, {
        method: 'POST', headers,
        body: JSON.stringify({ character, scene, description: plot }),
      });
      if (!genRes.ok) { callbacks.onFail(); return; }
      if (cancelledRef.current) return;
      callbacks.onProgress(25, '故事文本已生成...');

      // Step 3: 触发媒体生成（后台异步）
      if (cancelledRef.current) return;
      fetch(`/api/stories/${storyId}/generate-media`, {
        method: 'POST', headers,
        body: JSON.stringify({ characterImage: characterImg || '' }),
      });

      // Step 4: 轮询进度
      const poll = async () => {
        if (cancelledRef.current) return;
        try {
          const res = await fetch(`/api/stories/${storyId}`);
          const data = await res.json();
          if (!data.success) { setTimeout(poll, 2000); return; }

          const story = data.data;
          callbacks.onProgress(story.progress || 0, story.progressMessage || '');

          if (story.status === 'ready') {
            callbacks.onProgress(100, '生成完成');
            setTimeout(() => {
              if (!cancelledRef.current) callbacks.onDone(storyId);
            }, 800);
            return;
          }
          if (story.status === 'draft' && (story.progress || 0) === 0) {
            callbacks.onFail();
            return;
          }
          setTimeout(poll, 2000);
        } catch {
          setTimeout(poll, 3000);
        }
      };
      poll();
    } catch (err) {
      console.error('故事生成失败:', err);
      callbacks.onFail();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { generate, cancel };
}
