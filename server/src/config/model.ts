// ===== 模型参数配置 =====

export const MODEL_CONFIG = {
  // 故事文本生成
  storyText: {
    model: 'doubao-seed-character-251128',
    temperature: 0.9,
    top_p: 0.9,
    max_tokens: 1500,
    timeout: 30000,
  },

  // 故事分页 + 配图 prompt
  storySplit: {
    model: 'doubao-seed-character-251128',
    temperature: 0.3,
    max_tokens: 2000,
    timeout: 30000,
  },

  // 音频 TTS — 豆包语音合成
  storyAudio: {
    speaker: 'zh_female_vv_uranus_bigtts',
    resourceId: 'seed-tts-2.0',
    format: 'mp3' as const,
    sampleRate: 24000,
    speedRatio: 0.9,
    timeout: 30000,
  },

  // 插图生成（豆包即梦）
  storyImage: {
    model: 'doubao-seedream-4-0-250828',
    size: '2K' as const,
    ratio: '2:1' as const,
    watermark: false,
    timeout: 120000,
  },
} as const;
