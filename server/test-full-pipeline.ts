// ===== 完整流水线测试：文本 → 音频(全文) + 图片(5张) =====
import 'dotenv/config';

const BASE = 'http://localhost:3000';

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  console.log('🚀 完整流水线测试\n');
  console.log('='.repeat(60));

  // Step 1: 创建故事
  console.log('📝 Step 1: 创建故事...');
  const createRes = await api('POST', '/api/stories', {
    title: '好奇的小猫咪',
    type: 'ai_create',
    character: '毛茸茸的小橘猫',
    scene: '海底泡泡王国',
    description: '小橘猫戴上鱼泡泡头盔潜入海底，遇到一只会唱歌的海马，海马说只要猜对谜语就能获得一枚神奇的鳞片',
  });
  if (!createRes.success) { console.error('创建失败:', createRes); process.exit(1); }
  const storyId = createRes.data._id;
  const storyTitle = createRes.data.title;
  console.log(`   ✅ 故事已创建: ${storyId} "${storyTitle}"`);

  // Step 2: 生成故事文本
  console.log('\n📖 Step 2: 生成故事文本...');
  const startText = Date.now();
  const textRes = await api('POST', `/api/stories/${storyId}/generate`, {
    character: '毛茸茸的小橘猫',
    scene: '海底泡泡王国',
    description: '小橘猫戴上鱼泡泡头盔潜入海底，遇到一只会唱歌的海马，海马说只要猜对谜语就能获得一枚神奇的鳞片',
  });
  const textElapsed = Date.now() - startText;
  if (!textRes.success) { console.error('文本生成失败:', textRes); process.exit(1); }

  const storyText = textRes.data.pages[0]?.text || '';
  console.log(`   ✅ ${textElapsed}ms | ${storyText.length}字`);
  console.log(`   预览: ${storyText.slice(0, 80)}...`);

  // Step 3: 一站式媒体生成
  console.log('\n🎵🖼️  Step 3: 媒体生成（全文音频 + 5张图片 并行）...');
  const startMedia = Date.now();
  const mediaRes = await api('POST', `/api/stories/${storyId}/generate-media`);
  const mediaElapsed = Date.now() - startMedia;
  if (!mediaRes.success) { console.error('媒体生成失败:', mediaRes); process.exit(1); }

  const audioOk = !!mediaRes.data.audioUrl;
  const pages = mediaRes.data.pages as any[];
  const imgOkCount = pages.filter((p: any) => p.illustrationUrl).length;

  console.log(`   ✅ ${mediaElapsed}ms`);
  console.log(`   角色画像: ${mediaRes.data.characterProfile?.slice(0, 60)}...`);
  console.log(`   文件夹: ${mediaRes.data.folderUrl}`);
  console.log(`   全文音频: ${audioOk ? '✅ ' + mediaRes.data.audioUrl : '❌'}`);

  console.log('\n   分页文本 + 配图:');
  for (const p of pages) {
    const imgOk = p.illustrationUrl ? '✅' : '❌';
    console.log(`   ${p.part} | "${p.summary?.slice(0, 24)}..." | 图${imgOk} | ${p.narration?.length || 0}字`);
  }

  // Step 4: 验证 DB
  console.log('\n🔍 Step 4: 验证数据库...');
  const detailRes = await api('GET', `/api/stories/${storyId}`);
  if (detailRes.success) {
    const s = detailRes.data;
    console.log(`   状态: ${s.status} | 页数: ${s.pages.length}`);
    for (const p of s.pages) {
      console.log(`   page${p.pageNumber}: text=${p.text?.length || 0}字 audio=${p.audioUrl ? 'OK' : 'N/A'} img=${p.illustrationUrl ? 'OK' : 'N/A'}`);
    }
    // 验证所有页的音频 URL 一致
    const audioUrls = [...new Set(s.pages.map((p: any) => p.audioUrl))];
    console.log(`   音频URL一致性: ${audioUrls.length === 1 ? '✅ 所有页共用同一音频' : '❌ 不一致!'}`);
  }

  // 汇总
  console.log('\n' + '='.repeat(60));
  console.log('📊 流水线汇总:');
  console.log(`   文本: ${textElapsed}ms | ${storyText.length}字`);
  console.log(`   媒体: ${mediaElapsed}ms | 音频:${audioOk ? '✅' : '❌'} 图片:${imgOkCount}/5`);
  console.log(`   总耗时: ${textElapsed + mediaElapsed}ms`);
  console.log(`   文件夹: public/stories/${storyId}_${storyTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)}/`);
  console.log('='.repeat(60));

  return { storyId, storyText };
}

main().catch(console.error);
