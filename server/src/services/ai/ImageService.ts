// ===== 图片生成服务 —— 豆包即梦 ARK API =====
import * as fs from 'fs';
import * as path from 'path';
import { MODEL_CONFIG } from '../../config/model';

const cfg = MODEL_CONFIG.storyImage;

interface SingleResult {
  url: string;
  localPath: string;
}

export class ImageService {
  /** 生成单张图（兼容旧接口） */
  async generate(prompt: string): Promise<string> {
    const urls = await this.generateCandidates(prompt, 1);
    return urls[0] || '';
  }

  /** 生成多张候选图，返回 URL 数组 */
  async generateCandidates(prompt: string, n: number = 2): Promise<string[]> {
    return this.callImageApi({ prompt, n });
  }

  /** 核心 API 调用 */
  private async callImageApi(params: {
    prompt: string;
    n?: number;
    referenceImageUrl?: string;
  }): Promise<string[]> {
    if (!process.env.ARK_IMAGE_API_KEY && !process.env.ARK_API_KEY) return [];

    const { prompt, n = 2, referenceImageUrl } = params;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeout);

    try {
      const body: any = {
        model: cfg.model,
        prompt,
        response_format: 'url',
        size: cfg.size,
        n,
        stream: false,
        watermark: cfg.watermark,
      };
      if (referenceImageUrl) {
        body.image = referenceImageUrl;
        console.log(`   🖼️ 参考图 data URL 大小: ${(referenceImageUrl.length / 1024).toFixed(0)} KB`);
      }

      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_IMAGE_API_KEY || process.env.ARK_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ 图片API错误 ${response.status} [prompt: "${prompt.slice(0, 60)}..."]: ${errText.slice(0, 300)}`);
        return [];
      }

      const data: any = await response.json();
      console.log(`   ✅ 图片生成成功: ${(data?.data || []).length} 张`);
      return (data?.data || []).map((d: any) => d.url).filter(Boolean);
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout = err?.name === 'AbortError';
      console.error(`❌ 图片API异常 [prompt: "${prompt.slice(0, 60)}..."]: ${isTimeout ? '请求超时' : err?.message || err}`);
      return [];
    }
  }

  /** 带容错：生成2张候选，第一张优先；失败则最多重试2次 */
  async generateWithFallback(prompt: string, referenceImageUrl?: string): Promise<string> {
    for (let attempt = 0; attempt <= 2; attempt++) {
      const urls = await this.callImageApi({ prompt, n: 2, referenceImageUrl });
      if (urls.length > 0) return urls[0];
      if (attempt < 2) console.log(`   🔄 图片生成重试 (${attempt + 1}/2)...`);
    }
    return '';
  }

  /** 并行生成多张图，下载到指定目录，返回 URL 路径 */
  async generateAll(
    prompts: string[],
    filenames: string[],
    outputDir: string,
    urlPrefix: string = '/images',
  ): Promise<(SingleResult | null)[]> {
    return this.generateAllInternal(prompts, filenames, outputDir, urlPrefix);
  }

  /** 带参考图的批量生成 —— 读取参考图转 base64，传入每张场景图保持角色一致 */
  async generateAllWithReference(
    prompts: string[],
    filenames: string[],
    outputDir: string,
    referenceImagePath: string,
    urlPrefix: string = '/images',
  ): Promise<(SingleResult | null)[]> {
    let referenceDataUrl: string | undefined;
    try {
      const ext = path.extname(referenceImagePath).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const buffer = fs.readFileSync(referenceImagePath);
      const kb = buffer.length / 1024;
      if (kb > 1024) {
        console.log(`⚠️ 参考图过大 (${kb.toFixed(0)} KB > 1024 KB)，跳过参考图，退回到纯 prompt 模式`);
      } else {
        referenceDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        console.log(`🖼️ 角色参考图已加载: ${referenceImagePath} (${kb.toFixed(0)} KB)`);
      }
    } catch (err) {
      console.log(`⚠️ 无法读取角色参考图，退回到纯 prompt 模式: ${referenceImagePath}`);
    }
    return this.generateAllInternal(prompts, filenames, outputDir, urlPrefix, referenceDataUrl);
  }

  /** 生成角色定妆照（用于后续场景图参考） */
  async generateCharacterReference(
    characterProfile: string,
    outputDir: string,
    filename: string = 'character_ref.jpg',
  ): Promise<string | null> {
    const prompt = `${characterProfile}, full body character sheet, front view, children's book illustration, cute colorful style, simple white background, high quality, consistent character design reference. IMPORTANT: the character must be a pure animal/creature, absolutely NO human head on animal body, NO human-animal hybrid, NO anthropomorphic distortion. Keep the character as a complete adorable animal. No text.`;
    console.log(`👤 生成角色定妆照: "${prompt.slice(0, 80)}..."`);
    const url = await this.generateWithFallback(prompt);
    if (!url) {
      console.log('   ❌ 角色定妆照生成失败');
      return null;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`   ❌ 下载角色照失败: HTTP ${response.status}`);
        return null;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const localPath = path.join(outputDir, filename);
      fs.writeFileSync(localPath, buffer);
      console.log(`   ✅ 角色定妆照已保存: ${localPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      return localPath;
    } catch (err: any) {
      console.log(`   ❌ 角色照下载异常: ${err?.message || err}`);
      return null;
    }
  }

  private async generateAllInternal(
    prompts: string[],
    filenames: string[],
    outputDir: string,
    urlPrefix: string = '/images',
    referenceImageUrl?: string,
  ): Promise<(SingleResult | null)[]> {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const urlResults = await Promise.all(
      prompts.map((prompt, i) =>
        this.generateWithFallback(prompt, referenceImageUrl).then(url => ({ index: i, url }))
      )
    );

    const results = await Promise.all(
      urlResults.map(async ({ index, url }) => {
        const filename = filenames[index] || `page${index + 1}.jpg`;
        if (!url) {
          console.log(`   ❌ 图片[${index + 1}/${prompts.length}] "${filename}": 生成失败`);
          return null;
        }

        const localPath = path.join(outputDir, filename);

        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.log(`   ❌ 图片[${index + 1}/${prompts.length}] "${filename}": 下载失败 HTTP ${response.status}`);
            return null;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(localPath, buffer);
          console.log(`   ✅ 图片[${index + 1}/${prompts.length}] "${filename}" 已保存`);
          return { url: `${urlPrefix}/${filename}`, localPath };
        } catch (err: any) {
          console.log(`   ❌ 图片[${index + 1}/${prompts.length}] "${filename}": ${err?.message || err}`);
          return null;
        }
      })
    );

    const ok = results.filter(Boolean).length;
    console.log(`   📊 批量图片结果: ${ok}/${prompts.length} 成功`);
    return results;
  }
}
