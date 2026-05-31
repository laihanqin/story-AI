// ===== 故事控制器 =====
import type { Request, Response } from 'express';
import { Story } from '../models/Story';
import { getAiAdapter } from '../services/ai';

// GET /api/stories
export async function listStories(req: Request, res: Response) {
  try {
    const { type, page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (type) filter.type = type;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [data, total] = await Promise.all([
      Story.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Story.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
}

// GET /api/stories/:id
export async function getStory(req: Request, res: Response) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: '故事不存在', data: null });
    }
    res.json({ success: true, data: story });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
}

// POST /api/stories
export async function createStory(req: Request, res: Response) {
  try {
    const { title, type, character, scene, description } = req.body;
    const userId = (req as any).userId;

    const story = await Story.create({
      title,
      type: type || 'ai_create',
      character: character || '',
      scene: scene || '',
      description: description || '',
      status: 'draft',
      createdBy: userId,
    });

    res.status(201).json({ success: true, data: story });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, data: null });
  }
}

// POST /api/stories/:id/generate
export async function generateStory(req: Request, res: Response) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: '故事不存在', data: null });
    }

    // 更新状态为 generating
    story.status = 'generating';
    await story.save();

    // 异步触发 AI 生成（不阻塞响应）
    setImmediate(async () => {
      try {
        const ai = getAiAdapter();
        const result = await ai.generateStory({
          title: story.title,
          character: story.character,
          scene: story.scene,
          description: story.description,
        });

        story.pages = result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.text,
          illustrationUrl: p.illustrationUrl,
          audioUrl: '',
        }));
        story.status = 'ready';
        await story.save();
      } catch (err) {
        console.error('AI 生成失败:', err);
        story.status = 'draft';
        await story.save();
      }
    });

    res.json({ success: true, data: story });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
}

// POST /api/stories/:id/push
export async function pushStory(req: Request, res: Response) {
  try {
    const { childId } = req.body;
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: '故事不存在', data: null });
    }

    story.targetChildId = childId;
    await story.save();

    res.json({ success: true, data: story });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
}