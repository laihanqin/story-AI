// ===== 独立服务器入口（SQLite 持久化）=====
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getAiAdapter, TtsService, StoryTextService, ImageService, ParentStoryTextService } from './services/ai';
import { OutlineService } from './services/ai/OutlineService';
import { requireAuth, optionalAuth } from './middleware/auth';
import { accessGate, verifyAccess } from './middleware/access';
import { rateLimit } from './middleware/rateLimit';
import { filterContent } from './config/constraints/story-text';
import {
  initDb,
  findUserByName,
  findUserByNameOnly,
  createUser,
  createUserWithPassword,
  listStories,
  findStoryById,
  createStory,
  updateStoryStatus,
  updateStoryProgress,
  updateStoryPipelineStep,
  updateStoryCover,
  updateStoryMeta,
  setStoryLesson,
  setStoryPages,
  pushStoryToChild,
  updatePageAudio,
  updatePageIllustration,
  deleteStory,
  recoverStuckStories,
  trySetGenerating,
} from './db';

const app = express();
const PORT = process.env.PORT || 3000;

// 启动时校验必需的 API 密钥
function validateEnv() {
  const required = [
    { key: 'ARK_API_KEY', label: '豆包 ARK API（文本+图片生成）' },
    { key: 'TTS_API_KEY', label: '豆包 TTS 语音合成' },
  ];
  const missing = required.filter(r => !process.env[r.key]);
  if (missing.length > 0) {
    console.error('❌ 缺少必需的 API 密钥：');
    missing.forEach(r => console.error(`   - ${r.key} (${r.label})`));
    console.error('💡 请复制 server/.env.example 为 server/.env 并填入真实密钥');
    process.exit(1);
  }
  console.log('✅ API 密钥校验通过');
}
validateEnv();

// 中间件
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(accessGate);

// 故事文件夹工具
function getStoryFolder(storyId: string, title: string): { dir: string; urlPrefix: string } {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
  const folderName = `${storyId}_${safeTitle}`;
  const dir = path.join(__dirname, '..', 'public', 'stories', folderName);
  return { dir, urlPrefix: `/stories/${folderName}` };
}

// 响应格式转换（db 用 snake_case → API 输出 camelCase）
function toApiStory(s: any) {
  if (!s) return null;
  return {
    _id: s.id,
    title: s.title,
    type: s.type,
    character: s.character,
    scene: s.scene,
    description: s.description,
    status: s.status,
    targetChildId: s.target_child_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    progress: s.progress ?? 0,
    progressMessage: s.progress_message ?? '',
    lesson: s.lesson ?? '',
    coverUrl: s.cover_url ?? '',
    tag: s.tag ?? null,
    pipelineStep: s.pipeline_step ?? '',
    pages: (s.pages || []).map((p: any) => ({
      pageNumber: p.page_number,
      text: p.text,
      illustrationUrl: p.illustration_url,
      audioUrl: p.audio_url,
    })),
  };
}

// 入口密码验证
app.post('/api/auth/verify-access', verifyAccess);

// 注册接口
app.post('/api/auth/register', (req, res) => {
  const { name, password, role } = req.body;

  if (!name?.trim() || !password?.trim()) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }
  if (password.trim().length < 4) {
    return res.status(400).json({ success: false, message: '密码至少4位' });
  }

  try {
    const userRole = role || 'child';
    const token = `${userRole}-token-${Date.now()}`;
    const avatar = userRole === 'child' ? '👦' : '👩';
    const user = createUserWithPassword(name.trim(), userRole, avatar, token, password.trim());

    res.json({
      success: true,
      message: '注册成功',
      data: {
        user: { _id: user.id, name: user.name, role: user.role, avatar: user.avatar },
        token: user.token,
      },
    });
  } catch (err: any) {
    res.status(409).json({ success: false, message: err.message || '注册失败' });
  }
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  const { name, role, password } = req.body;

  // 密码登录模式
  if (password) {
    const user = findUserByNameOnly(name?.trim() || '');
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名不存在' });
    }
    if (user.password !== password.trim()) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    return res.json({
      success: true,
      message: '登录成功',
      data: {
        user: { _id: user.id, name: user.name, role: user.role, avatar: user.avatar },
        token: user.token,
      },
    });
  }

  // 无密码模式（兼容旧流程：自动创建用户）
  let user = findUserByName(name, role);
  if (!user) {
    const token = `${role}-token-${Date.now()}`;
    const avatar = role === 'child' ? '👦' : '👩';
    user = createUser(name, role, avatar, token);
  }

  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: {
        _id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      token: user.token,
    },
  });
});

// 获取故事列表
app.get('/api/stories', optionalAuth, (req, res) => {
  const { type, childId, tag } = req.query;
  const filter: { type?: string; childId?: string; userId?: string; tag?: string | null } = {};
  if (typeof type === 'string') filter.type = type;
  if (typeof childId === 'string') filter.childId = childId;
  if (typeof tag === 'string') filter.tag = tag;
  if (req.userId) filter.userId = req.userId;

  const stories = listStories(filter).map(s => toApiStory(s));
  res.json({
    success: true,
    message: '获取成功',
    data: stories,
  });
});

// 获取故事详情
app.get('/api/stories/:id', (req, res) => {
  const story = toApiStory(findStoryById(req.params.id));
  if (story) {
    res.json({
      success: true,
      message: '获取成功',
      data: story,
    });
  } else {
    res.status(404).json({
      success: false,
      message: '故事不存在',
    });
  }
});

// 创建故事
app.post('/api/stories', optionalAuth, (req, res) => {
  const { title, type, character, scene, description, tag } = req.body;
  const story = createStory({
    title: title || '新故事',
    type: type || 'ai_create',
    character: character || '',
    scene: scene || '',
    description: description || '',
    tag: tag || null,
    userId: req.userId,
  });

  res.json({
    success: true,
    message: '创建成功',
    data: toApiStory(story),
  });
});

// AI 生成故事
app.post('/api/stories/:id/generate', optionalAuth, async (req, res) => {
  const story = findStoryById(req.params.id);
  if (!story) {
    return res.status(404).json({ success: false, message: '故事不存在' });
  }
  if (req.userId && story.user_id && story.user_id !== req.userId) {
    return res.status(403).json({ success: false, message: '无权操作此故事' });
  }

  const { character, scene, description } = req.body;

  if (!trySetGenerating(req.params.id)) {
    return res.json({ success: true, message: '正在生成中', data: toApiStory(story) });
  }

  try {
    const adapter = getAiAdapter();
    const result = await adapter.generateStory({
      title: story.title,
      character: character || story.character,
      scene: scene || story.scene,
      description: description || story.description,
    });

    const pages = result.pages.map((p: any, i: number) => ({
      page_number: i + 1,
      text: p.text || '',
      illustration_url: p.illustrationUrl || '',
      audio_url: p.audioUrl || '',
    }));

    setStoryPages(req.params.id, pages);
    updateStoryStatus(req.params.id, 'ready');

    // 保存 story.txt 到故事文件夹
    const { dir: storyDir } = getStoryFolder(req.params.id, story.title);
    if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });
    fs.writeFileSync(path.join(storyDir, 'story.txt'), result.pages[0]?.text || '', 'utf-8');

    res.json({ success: true, message: '生成完成', data: toApiStory(findStoryById(req.params.id)) });
  } catch (error) {
    updateStoryStatus(req.params.id, 'draft');
    console.error('AI 生成失败:', error);
    res.status(500).json({ success: false, message: 'AI 生成失败' });
  }
});

// 家长推送故事给孩子
app.post('/api/stories/:id/push', requireAuth, (req, res) => {
  const { targetChildId } = req.body;
  const story = findStoryById(req.params.id);

  if (story) {
    pushStoryToChild(req.params.id, targetChildId);
    res.json({
      success: true,
      message: '推送成功',
      data: toApiStory(findStoryById(req.params.id)),
    });
  } else {
    res.status(404).json({
      success: false,
      message: '故事不存在',
    });
  }
});

// 家长故事大纲生成
app.post('/api/parent/outline', optionalAuth, async (req, res) => {
  const { lesson, character, plot, feedback } = req.body;

  if (!lesson?.trim()) {
    return res.status(400).json({ success: false, message: '请提供想要传达的道理' });
  }

  try {
    const outlineSvc = new OutlineService();
    const result = await outlineSvc.generate({
      lesson: lesson.trim(),
      character: character?.trim() || '',
      plot: plot?.trim() || '',
      feedback: feedback?.trim() || '',
    });

    if (!result) {
      return res.status(500).json({ success: false, message: '大纲生成失败，请重试' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('大纲生成错误:', error);
    res.status(500).json({ success: false, message: '大纲生成失败' });
  }
});

// ===== 预设角色名称映射（用于匹配参考图）=====
const PRESET_CHARACTER_MAP: Record<string, string> = {
  '孙悟空': '角色1-孙悟空.png',
  '灰姑娘': '角色2-灰姑娘.png',
  '粉红小猪': '角色3-粉红小猪.png',
  '小小超人': '角色4-小小超人.png',
  '公主': '角色5-公主.png',
  '小恐龙': '角色6-小恐龙.png',
  '小熊猫': '角色7-小熊猫.png',
  '小魔法师': '角色8-小魔法师.png',
};

function findPresetRefImage(characterName: string): string | null {
  for (const [key, filename] of Object.entries(PRESET_CHARACTER_MAP)) {
    if (characterName.includes(key)) {
      const refPath = path.join(__dirname, '..', 'public', 'characters', 'ref', filename);
      if (fs.existsSync(refPath)) return refPath;
      const fallbackPath = path.join(__dirname, '..', 'public', 'characters', filename);
      if (fs.existsSync(fallbackPath)) return fallbackPath;
    }
  }
  return null;
}

// ===== 家长故事一键生成（异步后台）=====
app.post('/api/parent/generate', rateLimit(10, 3600_000), optionalAuth, async (req, res) => {
  const { lesson, character, scene, plot } = req.body;
  if (!lesson?.trim() || !character?.trim()) {
    return res.status(400).json({ success: false, message: '缺少必要参数（道理和角色）' });
  }

  // 先创建故事记录
  const story = createStory({
    title: `${character}的故事`,
    type: 'parent_create',
    character: character.trim(),
    scene: scene?.trim() || '',
    description: plot?.trim() || '',
    userId: req.userId,
  });
  // 记录 lesson
  setStoryLesson(story.id, lesson.trim());

  const storyId = story.id;
  updateStoryStatus(storyId, 'generating');
  updateStoryProgress(storyId, 0, '准备开始...');

  // 立即返回
  res.json({ success: true, message: '已开始生成', data: { _id: storyId } });

  // ===== 后台异步生成 =====
  setImmediate(async () => {
    try {
      const parentSvc = new ParentStoryTextService();
      const imageSvc = new ImageService();
      const tts = new TtsService();

      // Step 1: 生成故事文本
      updateStoryPipelineStep(storyId, 'generating_text');
      updateStoryProgress(storyId, 5, '正在构思故事...');
      console.log(`📝 [${storyId}] 生成家长故事文本...`);

      const storyResult = await parentSvc.generateStory({
        lesson: lesson.trim(),
        character: character.trim(),
        scene: scene?.trim() || '',
        plot: plot?.trim() || '',
      });
      const storyTitle = storyResult.title;
      const storyContent = storyResult.content;
      updateStoryMeta(storyId, {
        title: storyTitle,
        character: character.trim(),
        scene: scene?.trim() || '',
        description: plot?.trim() || '',
        lesson: lesson.trim(),
      });

      // Step 2: 拆分页面
      updateStoryPipelineStep(storyId, 'splitting_pages');
      updateStoryProgress(storyId, 15, '正在拆分故事段落...');
      console.log(`📖 [${storyId}] 拆分故事为5页...`);

      const splitResult = await parentSvc.splitIntoPages(storyContent);
      if (!splitResult) {
        updateStoryStatus(storyId, 'draft');
        updateStoryProgress(storyId, 0, '故事拆分失败');
        return;
      }

      setStoryPages(storyId, splitResult.pages.map((p, i) => ({
        page_number: i + 1,
        text: p.narration,
        illustration_url: '',
        audio_url: '',
      })));

      // 创建故事文件夹
      const { dir: storyDir, urlPrefix } = getStoryFolder(storyId, storyTitle);
      if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });
      fs.writeFileSync(path.join(storyDir, 'story.txt'), storyContent, 'utf-8');

      // Step 3: 角色参考图判断
      updateStoryPipelineStep(storyId, 'generating_character_ref');
      updateStoryProgress(storyId, 25, '正在准备角色形象...');

      let referenceImagePath: string | undefined;
      const presetRef = findPresetRefImage(character.trim());
      if (presetRef) {
        referenceImagePath = presetRef;
        console.log(`✅ [${storyId}] 使用预设角色参考图: ${path.basename(presetRef)}`);
      } else {
        console.log(`👤 [${storyId}] 生成自定义角色定妆照...`);
        updateStoryProgress(storyId, 28, '正在生成角色形象...');
        const charRefPath = await imageSvc.generateCharacterReference(
          splitResult.characterProfile,
          storyDir,
          'character_ref.jpg',
        );
        if (charRefPath) {
          referenceImagePath = charRefPath;
        }
      }

      // Step 4: 并行生成 场景图 + 封面图 + 音频
      updateStoryPipelineStep(storyId, 'generating_media');
      updateStoryProgress(storyId, 30, '正在生成配图、封面和音频...');
      console.log(`🎵🖼️ [${storyId}] 并行生成: 5张场景图 + 封面 + 音频`);

      const safeTitle = storyTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);

      // 场景图
      const scenePromise = (referenceImagePath
        ? imageSvc.generateAllWithReference(
            splitResult.pages.map(p => p.imagePrompt),
            splitResult.pages.map(p => `${safeTitle}_${p.part}.jpg`),
            storyDir, referenceImagePath, urlPrefix,
          )
        : imageSvc.generateAll(
            splitResult.pages.map(p => p.imagePrompt),
            splitResult.pages.map(p => `${safeTitle}_${p.part}.jpg`),
            storyDir, urlPrefix,
          )
      ).then(results => {
        let ok = 0;
        results.forEach((r, i) => {
          if (r) { updatePageIllustration(storyId, i + 1, r.url); ok++; }
        });
        return ok;
      });

      // 封面图 (2:3)
      const coverPrompt = `Children's book cover illustration, ${splitResult.characterProfile}, in a magical storybook scene. Ghibli animation film style, soft warm lighting, pure and healing, hand-painted watercolor texture. Vertical 2:3 portrait layout, title space at top. Cute colorful children's book style. No text.`;
      const coverPromise = (async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 120000);
          const resp = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ARK_IMAGE_API_KEY || process.env.ARK_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'doubao-seedream-4-0-250828',
              prompt: coverPrompt,
              response_format: 'url',
              size: '2K',
              n: 1,
              stream: false,
              watermark: false,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!resp.ok) return '';
          const data: any = await resp.json();
          const url = data?.data?.[0]?.url || '';
          if (url) {
            const coverBuffer = await fetch(url).then(r => r.arrayBuffer());
            const coverPath = path.join(storyDir, 'cover.jpg');
            fs.writeFileSync(coverPath, Buffer.from(coverBuffer));
            const coverUrl = `${urlPrefix}/cover.jpg`;
            updateStoryCover(storyId, coverUrl);
            return coverUrl;
          }
          return '';
        } catch { return ''; }
      })();

      // 音频
      const fullNarration = splitResult.pages.map(p => p.narration).join('');
      const audioPromise = (async () => {
        try {
          const buf = await tts.synthesize(fullNarration);
          if (!buf) return false;
          const audioPath = path.join(storyDir, 'audio.mp3');
          fs.writeFileSync(audioPath, buf);
          const audioUrl = `${urlPrefix}/audio.mp3`;
          for (let i = 0; i < splitResult.pages.length; i++) {
            updatePageAudio(storyId, i + 1, audioUrl);
          }
          return true;
        } catch { return false; }
      })();

      const [sceneOk, coverOk, audioOk] = await Promise.all([scenePromise, coverPromise, audioPromise]);
      console.log(`   ✅ [${storyId}] 场景图:${sceneOk}/5, 封面:${coverOk ? 'OK' : 'FAIL'}, 音频:${audioOk ? 'OK' : 'FAIL'}`);

      updateStoryStatus(storyId, 'ready');
      updateStoryProgress(storyId, 100, '生成完成');
      updateStoryPipelineStep(storyId, 'ready');
    } catch (error) {
      updateStoryStatus(storyId, 'draft');
      updateStoryProgress(storyId, 0, '生成失败，请重试');
      updateStoryPipelineStep(storyId, 'failed');
      console.error(`❌ [${storyId}] 家长故事生成失败:`, error);
    }
  });
});

// 音频生成（全文一次性生成一个音频文件，所有页共用）
app.post('/api/stories/:id/generate-audio', requireAuth, async (req, res) => {
  let story = findStoryById(req.params.id);
  if (!story) {
    return res.status(404).json({ success: false, message: '故事不存在' });
  }
  if (req.userId && story.user_id && story.user_id !== req.userId) {
    return res.status(403).json({ success: false, message: '无权操作此故事' });
  }

  // 若还未生成文本，自动先走文本生成
  if (!story.pages || story.pages.length === 0 || !story.pages[0]?.text) {
    console.log('📝 尚未生成文本，自动触发文本生成...');
    const { character, scene, description } = req.body;
    try {
      const adapter = getAiAdapter();
      const result = await adapter.generateStory({
        title: story.title,
        character: character || story.character,
        scene: scene || story.scene,
        description: description || story.description,
      });
      setStoryPages(req.params.id, result.pages.map((p: any, i: number) => ({
        page_number: i + 1,
        text: p.text || '',
        illustration_url: p.illustrationUrl || '',
        audio_url: p.audioUrl || '',
      })));
      story = findStoryById(req.params.id)!;
    } catch (error) {
      console.error('自动文本生成失败:', error);
      return res.status(500).json({ success: false, message: '自动文本生成失败' });
    }
  }

  const fullText = story.pages[0]?.text;
  if (!fullText) {
    return res.status(400).json({ success: false, message: '故事文本为空' });
  }

  const tts = new TtsService();
  const { dir: storyDir, urlPrefix } = getStoryFolder(req.params.id, story.title);
  if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });

  try {
    const audioBuffer = await tts.synthesize(fullText);
    if (!audioBuffer) {
      return res.status(500).json({ success: false, message: '音频生成失败' });
    }

    const audioFilename = 'audio.mp3';
    fs.writeFileSync(path.join(storyDir, audioFilename), audioBuffer);
    const audioUrl = `${urlPrefix}/${audioFilename}`;

    // 所有页共用同一个音频 URL
    for (const page of story.pages) {
      updatePageAudio(req.params.id, page.page_number, audioUrl);
    }

    res.json({ success: true, message: '音频生成完成', data: toApiStory(findStoryById(req.params.id)) });
  } catch (error) {
    console.error('音频生成失败:', error);
    res.status(500).json({ success: false, message: '音频生成失败' });
  }
});

// 图片分页 + 批量生成
app.post('/api/stories/:id/generate-images', requireAuth, async (req, res) => {
  let story = findStoryById(req.params.id);
  if (!story) {
    return res.status(404).json({ success: false, message: '故事不存在' });
  }
  if (req.userId && story.user_id && story.user_id !== req.userId) {
    return res.status(403).json({ success: false, message: '无权操作此故事' });
  }

  // 若还未生成文本，自动先走文本生成
  if (!story.pages || story.pages.length === 0 || !story.pages[0]?.text) {
    console.log('📝 尚未生成文本，自动触发文本生成...');
    const { character, scene, description } = req.body;
    try {
      const adapter = getAiAdapter();
      const result = await adapter.generateStory({
        title: story.title,
        character: character || story.character,
        scene: scene || story.scene,
        description: description || story.description,
      });
      setStoryPages(req.params.id, result.pages.map((p: any, i: number) => ({
        page_number: i + 1,
        text: p.text || '',
        illustration_url: p.illustrationUrl || '',
        audio_url: p.audioUrl || '',
      })));
      story = findStoryById(req.params.id)!;
    } catch (error) {
      console.error('自动文本生成失败:', error);
      return res.status(500).json({ success: false, message: '自动文本生成失败' });
    }
  }

  const storyText = story.pages[0]?.text;
  if (!storyText) {
    return res.status(400).json({ success: false, message: '故事文本为空' });
  }

  try {
    // 第一步：用 DeepSeek 拆分为 5 个叙事段落 + 配图 prompt
    console.log('📖 拆分故事为5个叙事段落...');
    const textSvc = new StoryTextService();
    const splitResult = await textSvc.splitIntoPages(storyText);

    if (!splitResult) {
      return res.status(500).json({ success: false, message: '故事拆分失败' });
    }

    console.log(`   ✅ 角色画像: ${splitResult.characterProfile.slice(0, 50)}...`);
    console.log(`   ✅ ${splitResult.pages.length} 个段落`);

    // 第二步：保存分页到数据库
    const pageRows = splitResult.pages.map((p, i) => ({
      page_number: i + 1,
      text: p.narration,
      illustration_url: '',
      audio_url: '',
    }));
    setStoryPages(req.params.id, pageRows);

    // 第三步：创建故事文件夹，保存 story.txt（不覆盖已有文件）
    const { dir: storyDir, urlPrefix } = getStoryFolder(req.params.id, story.title);
    if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });
    const storyTxtPath = path.join(storyDir, 'story.txt');
    if (!fs.existsSync(storyTxtPath)) {
      const storyTxt = story.pages[0].text;
      fs.writeFileSync(storyTxtPath, storyTxt, 'utf-8');
    }

    // 第四步：5 张图并行生成
    console.log('🖼️  并行生成5张配图...');
    const imageSvc = new ImageService();
    const prompts = splitResult.pages.map(p => p.imagePrompt);
    const safeTitle = story.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
    const filenames = splitResult.pages.map(p => `${safeTitle}_${p.part}.jpg`);
    const imageResults = await imageSvc.generateAll(prompts, filenames, storyDir, urlPrefix);

    // 第五步：更新每页的 illustration_url
    let successCount = 0;
    for (let i = 0; i < imageResults.length; i++) {
      const r = imageResults[i];
      if (r) {
        updatePageIllustration(req.params.id, i + 1, r.url);
        successCount++;
      }
    }

    console.log(`   ✅ ${successCount}/${imageResults.length} 张图片生成成功`);

    res.json({
      success: true,
      message: `图片生成完成 (${successCount}/5)`,
      data: {
        characterProfile: splitResult.characterProfile,
        pages: splitResult.pages.map((p, i) => ({
          ...p,
          illustrationUrl: imageResults[i]?.url || '',
        })),
      },
    });
  } catch (error) {
    console.error('图片生成失败:', error);
    res.status(500).json({ success: false, message: '图片生成失败' });
  }
});

// 一站式媒体生成：拆分故事 + 并行生成音频和图片（异步后台执行 + 进度更新）
app.post('/api/stories/:id/generate-media', rateLimit(10, 3600_000), optionalAuth, async (req, res) => {
  const story = findStoryById(req.params.id);
  if (!story) return res.status(404).json({ success: false, message: '故事不存在' });
  if (req.userId && story.user_id && story.user_id !== req.userId) {
    return res.status(403).json({ success: false, message: '无权操作此故事' });
  }

  // 原子操作：仅当故事不在生成中时，才标记为生成中
  if (!trySetGenerating(req.params.id)) {
    return res.json({ success: true, message: '生成中', data: toApiStory(story) });
  }

  // 立即返回，后台异步执行
  res.json({ success: true, message: '已开始生成', data: toApiStory(story) });

  // 后台生成任务
  setImmediate(async () => {
    try {
      let localStory = findStoryById(req.params.id)!;

      // 若还未生成文本，自动先走文本生成
      if (!localStory.pages || localStory.pages.length === 0 || !localStory.pages[0]?.text) {
        console.log('📝 尚未生成文本，自动触发文本生成...');
        updateStoryProgress(req.params.id, 5, '正在构思故事...');
        const { character, scene, description } = req.body;
        const adapter = getAiAdapter();
        const result = await adapter.generateStory({
          title: localStory.title,
          character: character || localStory.character,
          scene: scene || localStory.scene,
          description: description || localStory.description,
        });
        setStoryPages(req.params.id, result.pages.map((p: any, i: number) => ({
          page_number: i + 1,
          text: p.text || '',
          illustration_url: p.illustrationUrl || '',
          audio_url: p.audioUrl || '',
        })));
        localStory = findStoryById(req.params.id)!;
      }

      const storyText = localStory.pages[0]?.text;
      if (!storyText) {
        updateStoryStatus(req.params.id, 'draft');
        updateStoryProgress(req.params.id, 0, '故事文本为空');
        return;
      }

      updateStoryProgress(req.params.id, 15, '正在拆分故事段落...');

      // 第一步：拆分故事为 5 个叙事段落
      console.log('📖 拆分故事为5个叙事段落...');
      const textSvc = new StoryTextService();
      const splitResult = await textSvc.splitIntoPages(storyText);
      if (!splitResult) {
        updateStoryStatus(req.params.id, 'draft');
        updateStoryProgress(req.params.id, 0, '故事拆分失败');
        console.error('❌ 故事拆分失败');
        return;
      }
      console.log(`   ✅ ${splitResult.pages.length} 个段落`);

      // 第二步：保存分页到数据库
      setStoryPages(req.params.id, splitResult.pages.map((p, i) => ({
        page_number: i + 1,
        text: p.narration,
        illustration_url: '',
        audio_url: '',
      })));

      // 第三步：创建故事文件夹
      const { dir: storyDir, urlPrefix } = getStoryFolder(req.params.id, localStory.title);
      if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });
      const storyTxtPath = path.join(storyDir, 'story.txt');
      if (!fs.existsSync(storyTxtPath)) {
        fs.writeFileSync(storyTxtPath, storyText, 'utf-8');
      }

      // 第四步：先生成角色定妆照（确保所有场景图角色一致）
      const imageSvc = new ImageService();
      let referenceImagePath: string | undefined;

      updateStoryProgress(req.params.id, 25, '正在生成角色形象...');
      referenceImagePath = await imageSvc.generateCharacterReference(
        splitResult.characterProfile,
        storyDir,
        'character_ref.jpg',
      ) ?? undefined;

      updateStoryProgress(req.params.id, 30, '正在生成配图和音频...');

      // 第五步：全文一次 TTS + 带角色参考的图片生成
      console.log('🎵🖼️  生成全文音频 + 5张配图...');
      const tts = new TtsService();
      const safeTitle = localStory.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);

      // 音频：全文拼接后一次合成，保证语气一致
      const fullNarration = splitResult.pages.map(p => p.narration).join('');
      const audioPromise = (async () => {
        try {
          const audioBuffer = await tts.synthesize(fullNarration);
          if (!audioBuffer) return { ok: false, url: '' };
          const audioFilename = 'audio.mp3';
          fs.writeFileSync(path.join(storyDir, audioFilename), audioBuffer);
          const url = `${urlPrefix}/${audioFilename}`;
          // 所有页共用同一个音频 URL
          for (let i = 0; i < splitResult.pages.length; i++) {
            updatePageAudio(req.params.id, i + 1, url);
          }
          updateStoryProgress(req.params.id, 50, '全文音频已生成');
          return { ok: true, url };
        } catch (err) {
          console.error('全文音频生成失败:', err);
          return { ok: false, url: '' };
        }
      })();

      // 图片：5 张并行生成（优先使用角色参考图保持一致性）
      const imagePromise = (referenceImagePath
        ? imageSvc.generateAllWithReference(
            splitResult.pages.map(p => p.imagePrompt),
            splitResult.pages.map(p => `${safeTitle}_${p.part}.jpg`),
            storyDir,
            referenceImagePath,
            urlPrefix,
          )
        : imageSvc.generateAll(
            splitResult.pages.map(p => p.imagePrompt),
            splitResult.pages.map(p => `${safeTitle}_${p.part}.jpg`),
            storyDir,
            urlPrefix,
          )
      ).then(results => {
        let successCount = 0;
        results.forEach((r, i) => {
          if (r) {
            updatePageIllustration(req.params.id, i + 1, r.url);
            successCount++;
            const currentProgress = 50 + successCount * 10;
            updateStoryProgress(req.params.id, Math.min(currentProgress, 95), `配图 ${successCount}/5 已生成`);
          }
        });
        return { results, successCount };
      });

      const [audioResult, imageResults] = await Promise.all([audioPromise, imagePromise]);

      console.log(`   ✅ 音频: ${audioResult.ok ? 'OK' : 'FAIL'}, 图片: ${imageResults.successCount}/5`);
      updateStoryStatus(req.params.id, 'ready');
      updateStoryProgress(req.params.id, 100, '生成完成');
    } catch (error) {
      updateStoryStatus(req.params.id, 'draft');
      updateStoryProgress(req.params.id, 0, '生成失败');
      console.error('媒体生成失败:', error);
    }
  });
});

// 图片生成 API - 使用豆包即梦
app.post('/api/images/generate', rateLimit(10, 3600_000), async (req, res) => {
  const { prompt, size = '2K', watermark = true } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: '请提供生成图片的提示词',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_IMAGE_API_KEY || process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-0-250828',
        prompt: prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: size,
        stream: false,
        watermark: watermark,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    console.log('豆包即梦 API 响应:', JSON.stringify(data, null, 2));

    if (response.ok) {
      const imageUrl = (data as any)?.data?.[0]?.url || (data as any)?.data?.url || (data as any)?.url || (data as any)?.images?.[0]?.url;
      res.json({
        success: true,
        message: '图片生成成功',
        data: {
          url: imageUrl,
          size: size,
          watermark: watermark,
          rawResponse: data,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: '图片生成失败',
      });
    }
  } catch (error) {
    const isTimeout = (error as Error).name === 'AbortError';
    console.error(isTimeout ? '图片生成超时' : '图片生成错误:', error);
    res.status(500).json({
      success: false,
      message: isTimeout ? '图片生成超时，请稍后重试' : '图片生成失败',
    });
  }
});

// 语音语义理解端点 - DeepSeek 处理孩子的语音输入
app.post('/api/speech/process', rateLimit(5, 60_000), async (req, res) => {
  const { text, type, character, scene: currentScene } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: '请提供语音文本' });
  }

  // 有效内容检查：至少3个字符，不只是嗯啊之类的语气词
  const trimmed = text.trim();
  if (trimmed.length < 1 || /^[嗯啊哦诶咦唔哈嘿]+$/.test(trimmed)) {
    return res.json({ success: false, message: 'content_too_short' });
  }

  // 敏感词前置过滤：命中硬黑名单的直接拒绝，不发给 AI
  const safetyCheck = filterContent(trimmed);
  if (!safetyCheck.clean) {
    console.log(`🛡️ 语音输入触发敏感词过滤: ${safetyCheck.hits.join(', ')}`);
    return res.json({ success: false, message: 'content_not_meaningful' });
  }

  const isScene = type === 'scene';

  const characterContext = character ? `孩子当前扮演的角色是"${character}"。` : '';
  const sceneContext = currentScene ? `孩子已经选择了冒险场景"${currentScene}"。` : '';

  const systemPrompt = isScene
    ? `你是一个儿童语音助手。孩子用语音说了想去冒险的地方或场景。
${characterContext}
只要孩子表达了任何有意义的内容（地点、事件、想法、活动等），一律视为有效。
仅当输入完全是乱码、纯拟声词（嗯啊哦诶）、或完全无法理解时才判无效。

输出JSON：
- 有效：{"valid":true,"scene":"场景名(2-6字)","reply":"鼓励的话(15字内)"}
- 无效：{"valid":false,"scene":"","reply":""}

只输出JSON，不要其他内容。`
    : `你是一个儿童语音助手。孩子用语音描述了一个故事想法。
${characterContext}${sceneContext}
请结合孩子的角色和已选场景来理解孩子说的话。比如孩子说"给我的好朋友白雪公主庆祝生日"，结合角色"公主"和场景，应该理解为"公主去给白雪公主庆祝生日"，而不是"给自己庆祝生日"。
只要孩子表达了任何有意义的内容（事件、想法、活动、愿望等），一律视为有效。
仅当输入完全是乱码、纯拟声词（嗯啊哦诶）、或完全无法理解时才判无效。

输出JSON：
- 有效：{"valid":true,"scene":"主题概括(2-8字，要体现角色和场景关联)","reply":"鼓励的话(15字内)"}
- 无效：{"valid":false,"scene":"","reply":""}

只输出JSON，不要其他内容。`;

  const userPrompt = `孩子说："${text}"`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'doubao-seed-character-251128',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    const raw = (data as any).choices?.[0]?.message?.content || '';
    console.log('🤖 豆包语音处理原始响应:', raw);

    let scene = '好有趣的地方！';
    let replyText = '';
    let valid = true;
    try {
      const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      if (parsed.valid === false) {
        valid = false;
      } else {
        scene = parsed.scene || scene;
        replyText = parsed.reply || '';
      }
    } catch {
      replyText = raw.trim();
    }

    if (!valid) {
      return res.json({ success: false, message: 'content_not_meaningful' });
    }

    res.json({
      success: true,
      data: { scene, reply: replyText || scene, raw },
    });
  } catch (error) {
    console.error('语音处理错误:', error);
    res.status(500).json({ success: false, message: '语音处理失败' });
  }
});

// 自动决定 - 孩子连续3次说不出时，AI 帮做决定
app.post('/api/speech/auto-decide', async (req, res) => {
  const { type, character, scene } = req.body;

  const systemPrompt = type === 'scene'
    ? `孩子选了角色"${character || '小动物'}"但不知道怎么选场景。请帮孩子选一个有趣的冒险场景（2-6个字），适合3-8岁。例如：海边沙滩、魔法森林、恐龙世界、赛车场、糖果屋等。然后写一句温暖鼓励的话（15字内）。严格输出JSON：{"scene":"场景名","reply":"鼓励的话"}`
    : `孩子要去"${scene || '一个有趣的地方'}"冒险但不知道会发生什么故事。请帮孩子想一个有趣的活动或故事（2-8个字），适合3-8岁。例如：参加飞行比赛、找宝藏、大胃王比赛、躲猫猫、交新朋友等。然后写一句兴奋鼓励的话（15字内）。严格输出JSON：{"scene":"活动名","reply":"鼓励的话"}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'doubao-seed-character-251128',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请帮孩子做一个有趣的决定。' },
        ],
        max_tokens: 256,
        temperature: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    const raw = (data as any).choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      res.json({ success: true, data: { scene: parsed.scene || '冒险乐园', reply: parsed.reply || '我们一起去冒险吧！' } });
    } catch {
      res.json({ success: true, data: { scene: '冒险乐园', reply: '我们一起去冒险吧！' } });
    }
  } catch (error) {
    console.error('自动决定错误:', error);
    res.json({ success: true, data: { scene: '冒险乐园', reply: '我们一起去冒险吧！' } });
  }
});

// DeepSeek 测试端点
app.post('/api/test/deepseek', async (req, res) => {
  try {
    const adapter = getAiAdapter();
    const result = await adapter.generateStory({
      title: '勇敢的小兔子',
      character: req.body.character || '小兔子',
      scene: req.body.scene || '魔法森林',
      description: req.body.plot || '小兔子在森林里发现了一颗会发光的宝石',
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 删除故事
app.delete('/api/stories/:id', optionalAuth, (req, res) => {
  const story = findStoryById(req.params.id);
  if (!story) return res.status(404).json({ success: false, message: '故事不存在' });
  if (req.userId && story.user_id && story.user_id !== req.userId) {
    return res.status(403).json({ success: false, message: '无权操作此故事' });
  }
  deleteStory(req.params.id);
  res.json({ success: true, message: '已删除' });
});

// 更新故事封面
app.patch('/api/stories/:id/cover', (req, res) => {
  const { coverUrl } = req.body;
  if (!coverUrl) return res.status(400).json({ success: false, message: '缺少 coverUrl' });
  const story = findStoryById(req.params.id);
  if (!story) return res.status(404).json({ success: false, message: '故事不存在' });
  updateStoryCover(req.params.id, coverUrl);
  res.json({ success: true, message: '封面已更新' });
});

// 静态资源缓存：图片/音频缓存 7 天，JS/CSS 缓存 1 天
function staticCache(maxAge: string) {
  return (req: any, res: any, next: any) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

// WebP 图片服务：浏览器支持时自动返回 .webp 版本（比 PNG 小 20 倍）
function serveImageWithWebp(baseDir: string) {
  return (req: any, res: any, next: any) => {
    const accept = req.headers.accept || '';
    const decodedPath = decodeURIComponent(req.path);
    const isImage = /\.(jpg|jpeg|png)$/i.test(decodedPath);
    if (accept.includes('image/webp') && isImage) {
      const rel = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
      const webpFile = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpFull = path.join(baseDir, webpFile);
      if (fs.existsSync(webpFull)) {
        res.set('Content-Type', 'image/webp');
        res.set('Cache-Control', 'public, max-age=604800');
        return res.sendFile(webpFull);
      }
    }
    next();
  };
}

// 故事文件夹静态服务（图片+音频缓存 7 天，自动 WebP）
const storiesDir = path.join(__dirname, '..', 'public', 'stories');
app.use('/stories', serveImageWithWebp(storiesDir), staticCache('604800'), express.static(storiesDir));

// 角色图片缓存 7 天，自动 WebP
const charactersDir = path.join(__dirname, '..', 'public', 'characters');
app.use('/characters', serveImageWithWebp(charactersDir), staticCache('604800'), express.static(charactersDir));

// 前端静态资源（JS/CSS 缓存 1 天，因为有 hash 文件名）
app.use(express.static(path.join(__dirname, '../../client/dist'), { maxAge: '1d' }));

// SPA fallback：所有非 API、非静态文件的 GET 请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// 启动服务器
initDb().then(() => {
  const recovered = recoverStuckStories();
  if (recovered > 0) {
    console.log(`🔄 恢复了 ${recovered} 个因服务器重启而中断的故事`);
  }
  app.listen(PORT, () => {
    console.log(`🚀 服务运行在 http://localhost:${PORT}`);
  });
});
