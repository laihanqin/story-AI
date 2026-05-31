/**
 * 批量生成展示故事（故事宝盒用）
 * 用法: npx tsx scripts/generateShowcase.ts
 *
 * 每本故事: 创建 → 生成文本 → 拆页 → 配图+TTS → 完成
 * 按分类顺序生成，每本完成后自动下一本
 * 进度保存到 scripts/showcase_progress.json，中断后可续跑
 */

const BASE = 'http://localhost:3000/api';
const PROGRESS_FILE = `${__dirname}/showcase_progress.json`;

interface StorySpec {
  title: string;
  category: string;
  character: string;
  scene: string;
  description: string;
}

const STORIES: StorySpec[] = [
  // ===== 品格成长 =====
  {
    title: '勇敢的小兔子',
    category: '品格成长',
    character: '一只名叫跳跳的白色小兔子，长耳朵，胆子很小，但心地善良，总是随身带着一条红色小围巾',
    scene: '一片阳光斑驳的童话森林，有高大的橡树、蘑菇房子和萤火虫小路',
    description: '小兔子跳跳非常胆小，什么都害怕。一天她的好朋友小鸟困在了高高的树上下不来，跳跳为了救朋友，鼓起勇气克服恐高，一步步爬上大树，发现自己原来比想象中更勇敢。',
  },
  {
    title: '分享的快乐',
    category: '品格成长',
    character: '一只毛茸茸的棕色小熊，圆滚滚的，最喜欢吃蜂蜜，但总是独享，朋友们都觉得他很自私',
    scene: '一片开满野花的山坡，有一棵巨大的蜂蜜树，旁边是小动物们的村落',
    description: '小熊找到了一大罐最美味的蜂蜜，决定一个人偷偷享用。但他发现独自吃蜂蜜一点也不开心，而把蜂蜜分给大家时，看到的笑脸让他感受到了真正的快乐——分享比独享更甜。',
  },
  {
    title: '诚实的小熊',
    category: '品格成长',
    character: '一只憨厚的小棕熊，有点粗心但心地很好，脖子上挂着妈妈织的蓝色围巾',
    scene: '一个温馨的树洞小屋，里面有温暖的壁炉、木制家具和妈妈心爱的花瓶',
    description: '小熊在屋里玩耍时不小心打碎了妈妈最心爱的花瓶。他害怕被责备，撒了谎说风吹倒的。但内心的不安让他整夜睡不着，第二天他鼓起勇气向妈妈说了实话，发现诚实让心里变轻松了，妈妈也原谅了他。',
  },
  {
    title: '新朋友的微笑',
    category: '品格成长',
    character: '一只刚刚搬到森林的小鹿斑斑，身上有漂亮的梅花斑点，但很害羞，不敢主动说话',
    scene: '一个全新的森林社区，有各种各样的动物居民，但小鹿一个都不认识',
    description: '小鹿斑斑刚搬到新森林，很想交朋友但太害羞了，总是一个人躲在树后看其他小动物玩耍。一天她看到另一只也在独自玩耍的小松鼠，鼓起勇气走过去微笑打招呼，发现原来一个微笑就能开启一段美好的友谊。',
  },
  {
    title: '坚持到山顶',
    category: '品格成长',
    character: '一只名叫小豆的小山羊，腿有点短，但眼睛亮闪闪的，总是充满好奇',
    scene: '一座层层叠叠的大山，山脚有溪流，山腰有花海，山顶有最美妙的风景和彩虹瀑布',
    description: '小山羊想爬到山顶看传说中的彩虹瀑布，但山太高了，爬到一半就累得想放弃。这时遇到一只慢悠悠但从不停止的乌龟爷爷，乌龟爷爷教会他不用着急，一步一步坚持就能到达。最后小山羊终于站在山顶，看到了最美的风景。',
  },
  {
    title: '谢谢你，小蚂蚁',
    category: '品格成长',
    character: '一只骄傲的小狐狸火火，聪明机灵，但有点看不起比自己小的动物',
    scene: '一片广袤的草原，有各种大小的动物，从大象到蚂蚁都有',
    description: '小狐狸觉得小蚂蚁太渺小了帮不上任何忙。一天小狐狸不小心掉进了深坑怎么都爬不出来，一群小蚂蚁齐心协力挖出了一条斜坡通道救了他。从那以后小狐狸学会了尊重每一个生命，懂得了感恩，无论大小。',
  },

  // ===== 奇幻冒险 =====
  {
    title: '云朵上的城堡',
    category: '奇幻冒险',
    character: '一个名叫朵朵的小女孩，扎着双马尾，有一件奶奶留下的羽毛披风，热爱天空和飞翔',
    scene: '一片宽阔的麦田上方，天空中漂浮着各种形状的云朵，其中最大的一朵云上藏着神秘的城堡',
    description: '朵朵在麦田里遇到了一朵会说话的小云朵，云朵邀请她去天上的云朵城堡做客。城堡里住着会制作各种天气的云朵精灵，她们正在为今年的第一场雪做准备，但制作雪花的机器坏了，朵朵帮忙修好了机器，和大家一起迎来了美丽的初雪。',
  },
  {
    title: '海底奇遇记',
    category: '奇幻冒险',
    character: '一个喜欢收集贝壳的小男孩小海，有一条会发光的贝壳项链，戴上后能在水下呼吸',
    scene: '一片美丽的珊瑚礁海域，有五颜六色的珊瑚、发光水母、贝壳宫殿和会唱歌的海草森林',
    description: '小海戴上魔法贝壳潜入海底，遇到一条找不到回家路的发光小丑鱼泡泡。他们一起穿越水母森林、贝壳迷宫和海草峡谷，一路上结识了各种海洋朋友，最终帮泡泡找到了家——藏在珊瑚深处的发光宝珠宫殿。',
  },
  {
    title: '星星守护者',
    category: '奇幻冒险',
    character: '一个喜欢在屋顶看星星的小女孩星儿，有一架外公留下的望远镜，能看到星星上的世界',
    scene: '夜空、银河、星座之间，有星星列车可以搭乘，每颗星星都是一个发光的小世界',
    description: '星儿发现夜空中的一颗小星星不亮了，用望远镜一看，原来星星上的魔法水晶累了需要充电。星儿搭乘流星列车前往那颗星星，遇到了星星守护者爷爷，一起用孩子们的笑容和笑声为魔法水晶重新充能，让星星重新闪耀。',
  },
  {
    title: '会走路的树',
    category: '奇幻冒险',
    character: '一个对植物充满好奇的小男孩木木，有一本植物图鉴，梦想发现一种没人见过的神奇植物',
    scene: '一片古老的魔法森林，树木有灵性，有些树会在夜晚悄悄移动，森林深处有各种神奇生物',
    description: '木木在森林里发现一棵会走路的树——树爷爷。树爷爷因为原来的土地干涸了正在寻找新的家园。木木骑在树枝上，和树爷爷一起穿越森林，见识了发光的蘑菇圈、唱歌的花朵、彩虹色的瀑布，最终帮树爷爷找到了一片肥沃的新土地。',
  },
  {
    title: '时间的沙漏',
    category: '奇幻冒险',
    character: '一个好奇心旺盛的小男孩时光，在阁楼打扫时发现了一个古老的沙漏，沙子是金色的',
    scene: '时光的家里有一个神秘的阁楼，里面堆满了奶奶留下的老物件，每件都有故事',
    description: '时光在阁楼发现了一个金色沙漏，倒过来就能看到过去的美好回忆。他看到了爸爸妈妈小时候的样子——爸爸也像他一样调皮，妈妈也爱穿花裙子。通过这段时光旅行，时光明白了每个人都是从孩子长大的，而爱是代代相传的。',
  },
  {
    title: '画里的世界',
    category: '奇幻冒险',
    character: '一个热爱画画的小女孩彩彩，有一盒神奇的彩色蜡笔，画出来的东西有时会变成真的',
    scene: '彩彩的小房间墙上贴满了她的画，有一扇她用蜡笔画的门，晚上门会发出微微的光芒',
    description: '彩彩画了一扇门，晚上门居然打开了，她走进画里的世界——一个由她的画作构成的奇妙王国。但画里的一只小龙因为彩彩画了一半就跑开了所以只有一只翅膀。彩彩帮小龙画好了另一只翅膀，小龙高兴地带她飞遍了整个画中世界。',
  },

  // ===== 动物朋友 =====
  {
    title: '小熊的蜂蜜罐',
    category: '动物朋友',
    character: '一只即将冬眠的胖胖棕熊蜜蜜，最爱蜂蜜，家里收藏了各种形状的蜂蜜罐',
    scene: '秋天的森林，树叶金黄，空气中弥漫着果实的甜香，动物们都在为冬天做准备',
    description: '冬天快到了，小熊蜜蜜需要为冬眠储备最后一罐蜂蜜。他一路穿过秋日森林寻找最甜的蜂蜜，沿途和忙着准备过冬的朋友们一一告别——收集坚果的小松鼠、南飞的燕子姐姐、储藏萝卜的兔阿姨。最后蜜蜜在一棵老槐树下找到了最甜的蜂蜜，带着满足和期待入睡了。',
  },
  {
    title: '小企鹅的游泳课',
    category: '动物朋友',
    character: '一只毛茸茸的帝企鹅宝宝球球，圆滚滚的非常可爱，但天生怕水，看到大海就往回跑',
    scene: '南极冰原和蔚蓝的大海，有冰山、极光和友好的海洋动物们',
    description: '小企鹅球球到了该学游泳的年纪了，但她非常害怕冰冷的海水，每次都退缩。海豹大叔告诉她水下有最美的世界，鲸鱼阿姨喷出一道彩虹鼓励她。最终球球鼓起勇气跳进海里，发现水下世界比想象中温暖和美丽多了，她爱上了游泳。',
  },
  {
    title: '蝴蝶的翅膀',
    category: '动物朋友',
    character: '一只住在花园里的毛毛虫花花，每天看着蝴蝶们飞舞非常羡慕，急切地想做同样的事',
    scene: '一个美丽的花园，有向日葵、玫瑰、薰衣草，还有各种昆虫朋友',
    description: '毛毛虫花花太想飞了，天天问妈妈什么时候才能变成蝴蝶。妈妈说需要耐心等待。花花着急地尝试各种方法——用树叶当翅膀、请甲虫背着她飞。但都不成功。最后她安静下来，结成了茧。经过耐心的等待和蜕变，她终于展开美丽的翅膀，飞了起来，明白了最美的成长需要时间。',
  },
  {
    title: '长颈鹿的围巾',
    category: '动物朋友',
    character: '一只长颈鹿高高，脖子非常长，冬天寒风吹得脖子好冷，但他找不到足够长的围巾',
    scene: '非洲大草原的冬天，动物们都穿上了暖暖的衣服，但长颈鹿的脖子是个大难题',
    description: '冬天来了长颈鹿高高冷得直打哆嗦，但商店里根本买不到那么长的围巾。小鸟们看到了，决定帮助他——他们飞上天空收集最柔软的云朵，几十只小鸟一起编织了一条全世界最长最暖和的云朵围巾。高高戴上围巾暖暖的，这是朋友们最好的礼物。',
  },
  {
    title: '小海龟的旅程',
    category: '动物朋友',
    character: '一只刚出生的小海龟点点，只有手掌大小，但心中有巨大的勇气，要去寻找大海',
    scene: '热带沙滩和广阔的海洋，有珊瑚礁、海草床和深海奇观',
    description: '小海龟点点从沙滩蛋壳中爬出，要独自穿越沙滩进入大海。这是一段危险的旅程，但他不害怕。进入大海后点点遇到了向导海豚、珊瑚礁里的热带鱼群、随洋流飘荡的海龟阿姨。在旅程中点点学会了游泳、找食物、躲避危险，逐渐成长为一只勇敢的大海龟。',
  },
  {
    title: '猫头鹰的夜班',
    category: '动物朋友',
    character: '一只小猫头鹰呜呜，第一次值夜班，有点紧张但很认真，有一双超级大的圆眼睛',
    scene: '夜晚的森林，安静中透着神秘，月光洒在树木间，有许多白天看不到的夜行动物',
    description: '小猫头鹰呜呜今晚第一次独立值夜班。森林里的小动物们有各种夜间问题——小刺猬做噩梦睡不着、小蝙蝠迷路找不到家、小老鼠的摇篮曲停了。呜呜一一帮助它们，用他的大眼睛找到迷路的蝙蝠，用温柔的叫声哄小动物入睡。天亮时呜呜很开心：原来自己可以帮到这么多朋友。',
  },

  // ===== 睡前故事 =====
  {
    title: '月亮船',
    category: '睡前故事',
    character: '一个准备睡觉的小女孩安安，躺在床上看着窗外的月亮，怀里抱着她最爱的兔子布偶',
    scene: '温柔的夜晚，一轮又大又圆的月亮挂在窗前，月光洒在安安的被子上像银色的毯子',
    description: '今晚的月亮变成了一艘银色的小船缓缓驶到安安窗前，邀请她上来。月亮船载着安安在夜空中轻轻巡游，经过亮着暖黄灯光的窗户——每个窗户后面都有一个温馨的故事：妈妈在给孩子讲故事、爸爸在做晚安亲吻、奶奶在织毛衣。安安看了一圈，觉得自己的家最温暖，月亮船把她温柔地送回床上，她安心地闭上眼睛。',
  },
  {
    title: '晚安，小星星',
    category: '睡前故事',
    character: '一个喜欢数星星的小男孩宁宁，每天晚上都要对着窗外的星星说一会儿话才肯睡',
    scene: '满天繁星的夜空，每颗星星都对应一个孩子心中的小愿望或小秘密',
    description: '宁宁每晚都要和星星道晚安。今晚他决定一颗一颗数过去，每数一颗那颗星星就分享一个温暖的小画面：一个小女孩学会了骑自行车、一个小男孩第一次帮妈妈浇花、一只小猫找到了新家。数到最后一颗时星星打了个哈欠说宁宁也该睡了，所有的星星一起放出柔和的星光摇篮曲，宁宁甜甜地睡着了。',
  },
  {
    title: '梦的守护者',
    category: '睡前故事',
    character: '一只毛茸茸的梦兽团团，白天住在云朵里，晚上悄悄来到孩子们的房间，把好梦放进枕头',
    scene: '孩子们的卧室、云朵之上的梦工厂、以及孩子们五彩缤纷的梦境世界',
    description: '梦兽团团今晚要照顾一个做了不开心事情的小女孩——她今天和好朋友吵架了心情不好。团团先用柔软的绒毛蹭蹭她的额头把不好的记忆轻轻吸出来，然后把这些记忆带到梦工厂，用彩虹、星星糖和欢笑声加工成美丽的梦还给她。第二天女孩醒来觉得心情好多了，和好朋友也和好了。团团躲在窗外看到这一幕开心地笑了。',
  },
  {
    title: '软软的云被子',
    category: '睡前故事',
    character: '一个想象天马行空的小女孩绵绵，每次睡觉前都在想如果被子是云朵做的该多好',
    scene: '夕阳落下后的天空，有粉色、橙色、淡紫和深蓝的云，以及绵绵的温馨小卧室',
    description: '绵绵今天不想睡觉，但妈妈说睡好了明天能去公园玩。绵绵闭上眼睛开始想象——她飞到天上收集不同颜色的云朵：粉色的做枕头、白色的做被子、淡紫色的做床单。她还用一缕月光绑了一个蝴蝶结在最软的白云上。当绵绵微笑入睡时，她的云朵被子和枕头都变成了真的，软软地包裹着她进入甜美的梦乡。',
  },
  {
    title: '小闹钟休息了',
    category: '睡前故事',
    character: '一个精力充沛但该睡觉的小男孩淘淘，房间里每件物品在他眼中都是有生命的',
    scene: '淘淘的温馨卧室，有玩具柜、小书桌、台灯和小闹钟',
    description: '淘淘不想睡觉觉得睡觉浪费时间。但今晚很奇怪——他的小台灯揉揉眼睛说不亮了要睡了，玩具小熊打了个哈欠躺下了，小书桌上的蜡笔一根一根躺回盒子里，连最爱吵闹的小闹钟也闭上了眼睛安静下来。所有的东西都睡了淘淘突然觉得眼皮很重打了个大哈欠，乖乖盖上被子进入了梦乡。',
  },
  {
    title: '妈妈的声音',
    category: '睡前故事',
    character: '一个依恋妈妈的小男孩暖宝，最喜欢听妈妈讲故事但今晚妈妈在忙让爸爸讲',
    scene: '暖宝的小卧室晚上，床头灯发出温暖的光，爸爸坐在床边准备讲故事',
    description: '暖宝今晚有点不安因为妈妈没有来讲故事。爸爸说我们做一个游戏——闭上眼睛回忆今天和妈妈在一起的每一个瞬间。暖宝闭上眼睛：妈妈早上做的笑脸早餐、送他上学时的挥手、放学接他时的大大拥抱、帮他在擦破的膝盖上贴创口贴。一个接一个回忆像幻灯片一样闪过。当暖宝回忆到第十个瞬间时已经甜甜地睡着了，嘴角挂着微笑。',
  },
];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress(): Set<string> {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return new Set(data.completed || []);
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveProgress(completed: Set<string>) {
  try {
    const fs = require('fs');
    const dir = require('path').dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ completed: [...completed], updatedAt: new Date().toISOString() }, null, 2));
  } catch { /* ignore */ }
}

async function main() {
  console.log('📚 开始批量生成展示故事\n');
  console.log(`共 ${STORIES.length} 本故事，4 个分类\n`);

  const completed = loadProgress();
  if (completed.size > 0) {
    console.log(`📋 已完成的: ${[...completed].join(', ')}\n`);
  }

  let successCount = completed.size;
  let failCount = 0;

  for (let i = 0; i < STORIES.length; i++) {
    const spec = STORIES[i];
    if (completed.has(spec.title)) {
      console.log(`⏭️  [${i + 1}/${STORIES.length}] ${spec.title} (已完成，跳过)`);
      continue;
    }

    console.log(`\n📖 [${i + 1}/${STORIES.length}] 开始生成: ${spec.title} [${spec.category}]`);
    console.log(`   角色: ${spec.character.slice(0, 40)}...`);
    console.log(`   场景: ${spec.scene.slice(0, 40)}...`);

    try {
      // 1. 创建故事
      console.log('   📝 创建故事...');
      const createRes = await fetch(`${BASE}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: spec.title,
          type: 'showcase',
          tag: 'showcase',
          character: spec.character,
          scene: spec.scene,
          description: spec.description,
        }),
      });

      if (!createRes.ok) {
        console.log(`   ❌ 创建失败: HTTP ${createRes.status}`);
        failCount++;
        continue;
      }

      const createJson: any = await createRes.json();
      if (!createJson.success) {
        console.log(`   ❌ 创建失败: ${createJson.message}`);
        failCount++;
        continue;
      }

      const storyId = createJson.data._id;
      console.log(`   ✅ 已创建: ${storyId}`);

      // 2. 触发媒体生成
      console.log('   🎨 触发媒体生成...');
      const genRes = await fetch(`${BASE}/stories/${storyId}/generate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: spec.character,
          scene: spec.scene,
          description: spec.description,
        }),
      });

      if (!genRes.ok) {
        console.log(`   ❌ 触发生成失败: HTTP ${genRes.status}`);
        failCount++;
        continue;
      }

      // 3. 轮询等待完成
      console.log('   ⏳ 等待生成完成...');
      let lastProgress = -1;
      let pollCount = 0;
      const maxPolls = 120; // 最多等 30 分钟 (120 × 15s)

      while (pollCount < maxPolls) {
        await sleep(15000);
        pollCount++;

        try {
          const checkRes = await fetch(`${BASE}/stories/${storyId}`);
          const checkJson: any = await checkRes.json();
          if (!checkJson.success) continue;

          const story = checkJson.data;
          if (story.progress !== lastProgress) {
            console.log(`   📊 ${story.progress}% - ${story.progressMessage || ''}`);
            lastProgress = story.progress;
          }

          if (story.status === 'ready') {
            console.log(`   ✅ 生成完成! (用时约 ${Math.round(pollCount * 0.25)} 分钟)`);
            successCount++;
            completed.add(spec.title);
            saveProgress(completed);
            break;
          }

          if (story.status === 'draft' && story.progress === 0 && pollCount > 4) {
            // 可能失败了，再等一轮确认
            console.log('   ⚠️ 状态异常，等待确认...');
            await sleep(15000);
            const recheck = await fetch(`${BASE}/stories/${storyId}`);
            const reJson: any = await recheck.json();
            if (reJson.data.status === 'draft' && reJson.data.progress === 0) {
              console.log('   ❌ 生成失败');
              failCount++;
              break;
            }
          }
        } catch (err: any) {
          console.log(`   ⚠️ 轮询异常: ${err.message}`);
        }
      }

      if (pollCount >= maxPolls) {
        console.log('   ⚠️ 超时，跳过');
        failCount++;
      }
    } catch (err: any) {
      console.log(`   ❌ 异常: ${err.message}`);
      failCount++;
    }

    // 每本之间休息 5 秒避免 API 限流
    await sleep(5000);
  }

  console.log(`\n\n🎉 批量生成完成!`);
  console.log(`   成功: ${successCount}/${STORIES.length}`);
  console.log(`   失败: ${failCount}/${STORIES.length}`);
}

main().catch(err => {
  console.error('脚本异常:', err);
  process.exit(1);
});
