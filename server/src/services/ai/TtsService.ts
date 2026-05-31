// ===== 语音合成服务 —— 豆包 OpenSpeech TTS =====
import { MODEL_CONFIG } from '../../config/model';

const BASE_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const REQUEST_TIMEOUT_MS = 30_000;

interface TtsOptions {
  speedRatio?: number;
  speaker?: string;
}

export class TtsService {
  async synthesize(text: string, options: TtsOptions = {}): Promise<Buffer | null> {
    if (!process.env.TTS_API_KEY) return null;

    const cfg = MODEL_CONFIG.storyAudio;
    let lastError: string = '';

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(BASE_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-api-key': process.env.TTS_API_KEY,
            'X-Api-Resource-Id': cfg.resourceId,
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            req_params: {
              text,
              speaker: options.speaker || cfg.speaker,
              additions: JSON.stringify({
                disable_markdown_filter: true,
                enable_language_detector: true,
                enable_latex_tn: true,
                disable_default_bit_rate: true,
                max_length_to_filter_parenthesis: 0,
                cache_config: { text_type: 1, use_cache: true },
              }),
              audio_params: {
                format: cfg.format,
                sample_rate: cfg.sampleRate,
              },
              speed_ratio: options.speedRatio ?? cfg.speedRatio,
            },
          }),
        });

        clearTimeout(timer);
        const raw = await response.text();

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${raw.slice(0, 200)}`;
          if (attempt < 2) {
            console.log(`   🔄 TTS 重试 (${attempt + 1}/2)...`);
            continue;
          }
          console.error(`   ❌ TTS API 最终失败: ${lastError}`);
          return null;
        }

        // NDJSON 流式解析，合并所有 Base64 音频块
        const lines = raw.trim().split('\n');
        const chunks: Buffer[] = [];

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);
            if (chunk.code === 0 && chunk.data) {
              chunks.push(Buffer.from(chunk.data, 'base64'));
            }
          } catch { /* skip non-JSON */ }
        }

        const result = chunks.length > 0 ? Buffer.concat(chunks) : null;
        if (result) {
          if (attempt > 0) console.log(`   ✅ TTS 重试成功 (第${attempt + 1}次)`);
          return result;
        }

        lastError = '响应为空或无有效音频块';
        if (attempt < 2) {
          console.log(`   🔄 TTS 音频块为空，重试 (${attempt + 1}/2)...`);
          continue;
        }
        break;
      } catch (err: any) {
        lastError = err?.name === 'AbortError' ? '请求超时' : (err?.message || String(err));
        if (attempt < 2) {
          console.log(`   🔄 TTS ${err?.name === 'AbortError' ? '超时' : '网络异常'}，重试 (${attempt + 1}/2)...`);
          continue;
        }
        break;
      }
    }

    console.error(`   ❌ TTS 最终失败: ${lastError}`);
    return null;
  }
}
