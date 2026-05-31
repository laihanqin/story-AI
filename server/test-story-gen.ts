// ===== 故事文本生成测试 —— 5 个不同主题 =====
import 'dotenv/config';
import { getAiAdapter } from './src/services/ai';
import { StoryTextService } from './src/services/ai/StoryTextService';

const TEST_CASES = [
  {
    title: '测试1-勇敢小兔子',
    character: '胖嘟嘟的小白兔',
    scene: '糖果城堡的彩虹大厅',
    description: '小白兔想偷吃城堡里最大的彩虹棒棒糖，结果棒棒糖活了追着它满城堡跑',
  },
  {
    title: '测试2-打喷嚏云朵',
    character: '会打喷嚏的小云朵',
    scene: '长满棉花糖树的山谷',
    description: '小云朵每次打喷嚏就会下雨，把山谷里的动物们淋得湿漉漉的，它想学会控制喷嚏',
  },
  {
    title: '测试3-贪吃小松鼠',
    character: '圆滚滚的小松鼠豆豆',
    scene: '月亮上的坚果商店',
    description: '豆豆把坚果商店的所有坚果都藏进了自己的腮帮子，结果嘴巴鼓得像气球飞了起来',
  },
  {
    title: '测试4-爱跳舞熊猫',
    character: '爱跳舞的小熊猫胖达',
    scene: '竹林里的星光舞台',
    description: '胖达想在星光舞台上表演，但一跳起舞来就踩到自己的尾巴，引发了一连串搞笑事故',
  },
  {
    title: '测试5-糊涂小女巫',
    character: '总念错咒语的小女巫咪咪',
    scene: '泡泡糖森林里的魔法学校',
    description: '咪咪想把铅笔变成巧克力，结果把整个教室变成了巧克力池，老师和同学们都在巧克力里游泳',
  },
];

async function main() {
  const adapter = getAiAdapter();
  let totalTokens = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;

  for (const test of TEST_CASES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 ${test.title}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const start = Date.now();
      const result = await adapter.generateStory({
        title: test.title,
        character: test.character,
        scene: test.scene,
        description: test.description,
      });
      const elapsed = Date.now() - start;

      const usage = (adapter as any).getLastUsage?.() || { prompt: 0, completion: 0, total: 0 };
      totalPrompt += usage.prompt;
      totalCompletion += usage.completion;
      totalTokens += usage.total;

      console.log(`✅ ${elapsed}ms | tokens: ${usage.total} (prompt:${usage.prompt} completion:${usage.completion})`);
      console.log(`   标题: ${(result as any).title}`);
    } catch (error) {
      console.log(`❌ 失败: ${(error as Error).message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 全部完成');
  console.log(`   Token 总计: ${totalTokens} (prompt:${totalPrompt} completion:${totalCompletion})`);
  console.log(`   平均/故事: ${Math.round(totalTokens / 5)} tokens`);
  console.log(`${'='.repeat(60)}`);
}

main();
