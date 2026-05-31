// ===== 故事文本知识库 —— 规则引擎 =====
// 每个规则带标签，召回 = 标签匹配，不进 prompt 的规则供后处理

// ---- 规则定义 ----

export interface Rule {
  id: string;
  content: string;
  tags: {
    age?: ('3-4' | '5-6' | '7-8')[];
    personality?: ('内向' | '外向')[];
    category: 'safety' | 'age_guide' | 'personality' | 'education' | 'creative';
  };
  priority: number; // 越小越靠前
  injectTarget: 'system' | 'user';
}

// ---- 知识库规则集 ----

export const RULES: Rule[] = [
  // ===== 安全红线（始终召回）=====
  {
    id: 'safety-general',
    content: '禁止恐怖、暴力、死亡、血腥、色情、歧视、诱骗、体罚、羞辱及危险模仿行为',
    tags: { category: 'safety' },
    priority: 1,
    injectTarget: 'system',
  },

  // ===== 教育融入技巧（始终召回）=====
  {
    id: 'education-technique',
    content: '禁止说教（不要说"这个故事告诉我们……"），通过主角行为后果让孩子自己体会道理',
    tags: { category: 'education' },
    priority: 2,
    injectTarget: 'system',
  },

  // ===== 年龄指南：3-4岁 =====
  {
    id: 'age-guide-3-4',
    content: '适合3-4岁：主角≤2个，情节简单重复，句子≤10字，道理极浅显',
    tags: { age: ['3-4'], category: 'age_guide' },
    priority: 3,
    injectTarget: 'system',
  },

  // ===== 年龄指南：5-6岁（默认）=====
  {
    id: 'age-guide-5-6',
    content: '适合5-6岁：可引入简单冲突转折，主角2-3个，适当加入成语（如"五颜六色""兴高采烈"），道理稍深刻',
    tags: { age: ['5-6'], category: 'age_guide' },
    priority: 3,
    injectTarget: 'system',
  },

  // ===== 年龄指南：7-8岁 =====
  {
    id: 'age-guide-7-8',
    content: '适合7-8岁：情节可有多层，主角3-4个，可使用比喻修辞和丰富成语',
    tags: { age: ['7-8'], category: 'age_guide' },
    priority: 3,
    injectTarget: 'system',
  },

  // ===== 性格指南：内向 =====
  {
    id: 'personality-introvert',
    content: '孩子性格内向：适合温馨治愈、节奏舒缓的故事',
    tags: { personality: ['内向'], category: 'personality' },
    priority: 4,
    injectTarget: 'system',
  },

  // ===== 性格指南：外向 =====
  {
    id: 'personality-extrovert',
    content: '孩子性格外向：适合冒险幽默、节奏快的故事',
    tags: { personality: ['外向'], category: 'personality' },
    priority: 4,
    injectTarget: 'system',
  },

  // ===== 创作要求（始终召回，注入 user prompt）=====
  {
    id: 'creative-reversal',
    content: `反转：从「软萌反差反转 / 乌龙巧合反转 / 身份小反转」中选一种。要求：反转必须制造一个让读者"哇！"的意外时刻——看似坏事的局面突然变成好事，或看似厉害的能力反而闹出笑话。反转要成为故事的高潮转折点，而不是轻轻一笔带过`,
    tags: { category: 'creative' },
    priority: 10,
    injectTarget: 'user',
  },
  {
    id: 'creative-humor',
    content: `幽默：至少制造2-3个连锁的乌龙事件，一个蠢萌举动触发下一个（例：踩尾巴→掉进蘑菇堆→挂到树上→尾巴缠出星光）。加入软萌动作（粘糖纸、打滚、弹来弹去）和拟声词（吧唧、啪嗒、咕噜噜、噗通）`,
    tags: { category: 'creative' },
    priority: 11,
    injectTarget: 'user',
  },
  {
    id: 'creative-sidekick',
    content: `配角：添加1-2个软萌配角（贪吃小松鼠、圆滚滚小猪等），配角要有自己的小笑点，不只是背景板`,
    tags: { category: 'creative' },
    priority: 12,
    injectTarget: 'user',
  },
  {
    id: 'creative-ending',
    content: `结尾：以乌龙幽默收尾，禁止说教`,
    tags: { category: 'creative' },
    priority: 13,
    injectTarget: 'user',
  },
];

// ---- 召回函数 ----

export interface RecallParams {
  childAge?: string;          // 不传默认 5-6
  childPersonality?: string;  // 不传则不召回性格规则
}

export function recallRules(params: RecallParams = {}): { system: string[]; user: string[] } {
  const ageNum = params.childAge ? parseInt(params.childAge, 10) : 5; // 默认 5

  // 年龄 → 标签
  let ageTag: '3-4' | '5-6' | '7-8' = '5-6';
  if (ageNum <= 4) ageTag = '3-4';
  else if (ageNum <= 6) ageTag = '5-6';
  else ageTag = '7-8';

  // 性格 → 标签（可能为空）
  let personalityTag: '内向' | '外向' | null = null;
  if (params.childPersonality) {
    if (params.childPersonality.includes('内向') || params.childPersonality === 'introvert') personalityTag = '内向';
    else if (params.childPersonality.includes('外向') || params.childPersonality === 'extrovert') personalityTag = '外向';
  }

  const matched = RULES.filter(r => {
    const t = r.tags;

    // 年龄匹配：规则没标 age 标签 = 全年龄通用；有标签则需命中
    if (t.age && t.age.length > 0 && !t.age.includes(ageTag)) return false;

    // 性格匹配：规则没标 personality 标签 = 通用；有标签则仅在家长提供性格时才召回
    if (t.personality && t.personality.length > 0) {
      if (!personalityTag) return false;
      if (!t.personality.includes(personalityTag)) return false;
    }

    return true;
  });

  // 按优先级排序
  matched.sort((a, b) => a.priority - b.priority);

  return {
    system: matched.filter(r => r.injectTarget === 'system').map(r => r.content),
    user: matched.filter(r => r.injectTarget === 'user').map(r => r.content),
  };
}

// ===== 敏感词黑名单（不进 prompt，后处理用）=====
export const HARD_BAN: string[] = [
  '死亡', '自杀', '跳楼', '上吊', '割腕',
  '血', '流血', '杀人', '谋杀', '凶器', '刀子割', '枪杀', '炸死',
  '尸体', '坟墓', '棺材',
  '鬼', '幽灵', '僵尸', '吸血鬼', '恶鬼', '妖怪',
  '恐怖', '吓人', '噩梦', '黑暗恐惧',
  '绑架', '拐卖', '人贩子', '虐待',
  '打骂', '耳光', '拳打脚踢', '殴打', '鞭子', '锁链', '关小黑屋',
  '抛弃', '遗弃', '丢孩子', '不要你了', '没人要你',
  '坏妈妈', '坏爸爸',
  '去死吧', '杀死你', '打死你', '砍死', '刺死', '捅死', '掐死', '咬死',
  '毒死', '烧死', '淹死', '活埋',
  '分尸', '肢解', '断手', '断脚', '挖眼', '割舌', '拔牙',
  '电击', '火烤', '开水烫', '推下楼', '推下河', '摔死',
  '车祸', '撞死', '压死', '爆炸', '火灾', '烧伤', '烫伤', '毁容',
  '怪物', '巫婆', '狼人', '骷髅', '鬼屋', '阴森', '诅咒',
  '下毒', '毒药', '毒蛇', '蝎子', '蜘蛛',
  '老鼠', '蟑螂', '呕吐物',
  '大便', '屎', '裸体', '光屁股', '脱裤子',
  '摸隐私部位', '亲嘴', '性器官',
  '小鸡鸡', '乳房', '屁股', '内裤', '洗澡',
  '尿床', '拉裤子',
  '笨死了', '傻子', '笨蛋', '蠢货', '废物', '垃圾', '白痴', '弱智', '神经病', '疯子',
  '丑八怪', '肥猪', '矮冬瓜', '瘸子', '瞎子', '聋子', '哑巴',
  '穷光蛋', '讨饭的', '脏死了', '恶心鬼', '讨厌鬼',
  '滚开', '滚蛋', '闭嘴', '欠揍', '揍你', '打你', '扇你', '踢你', '掐你', '咬你',
  '放屁', '狗屎', '屁话',
  '操', '靠', '妈的', '他妈的', '特么', '卧槽', '尼玛', '傻逼',
  '混蛋', '王八蛋', '畜生', '狗娘养的', '贱人', '骚货', '婊子',
  '妓女', '嫖客', '强奸', '轮奸', '猥亵', '性骚扰',
  '色情', '黄片', '裸照',
  '鸡奸', '口交', '自慰', '精液', '阴道', '阴茎', '月经', '避孕套',
  '打胎', '堕胎', '流产', '怀孕', '生孩子',
  '离婚', '吵架', '打架',
  '欺负人', '勒索', '抢劫', '偷东西', '小偷', '强盗', '骗子',
  '作弊', '逃学', '离家出走', '不听话',
  '坏孩子', '不孝顺',
  '打老人', '打小孩', '虐待动物', '杀动物', '杀狗', '杀猫',
  '踩死虫子', '拔翅膀', '剪尾巴', '灌药',
  '诱骗', '猥亵动作', '强吻',
  '暴露狂', '露阴癖', '恋童', '儿童色情',
  '幼女', '正太', '乱伦',
  '父女', '母子', '师生',
  '教会孩子骂人', '教会孩子说谎', '教会孩子偷东西', '教会孩子打人',
  '教会孩子自残', '教会孩子自杀方法',
  '危险模仿', '从高处跳', '玩火', '玩刀', '玩电', '玩开水', '玩插座', '玩煤气',
  '爬窗台', '爬阳台', '爬栏杆', '钻栏杆', '把头伸进栏杆',
  '吞食异物', '吃电池', '吃磁力球', '吃洗衣液', '吃硬币', '吞钉子',
  '喝洗洁精', '喝消毒水', '喝农药', '误食药品',
  '塑料袋套头', '绳子套脖', '模仿勒颈', '模仿窒息',
  '模仿殴打他人', '模仿暴力游戏', '模仿恐怖片', '模仿鬼怪叫声',
  '吓唬别人', '装鬼吓人', '推人下楼梯', '在楼梯上打闹',
  '在马路上乱跑', '闯红灯', '从车上跳下', '把头伸出车窗',
  '玩电梯门', '玩扶梯', '把手伸进扶梯缝隙',
  '向人扔鞭炮', '用石头砸人', '用棍子打头', '用尖锐物戳人',
  '孤立他人', '排挤他人', '嘲笑残疾', '嘲笑贫穷', '嘲笑外貌', '起侮辱性外号',
  '网络欺凌', '隐私暴露', '家庭住址泄露', '裸照分享',
  '引诱见面', '私聊陌生人', '送礼物诱骗',
  '假装警察', '假装老师', '假装父母朋友',
  '下药', '迷药', '听话水',
  '酒精', '香烟', '毒品', '吸毒',
  '罚站', '罚抄', '打手心', '打屁股',
  '关禁闭', '饿饭', '罚跪', '扇耳光', '揪耳朵', '拧大腿',
  '皮带抽', '棍子打', '衣架打', '跪搓衣板',
  '不许睡觉', '不许吃饭', '不许说话', '关厕所', '关地下室', '锁柜子',
  '扔门外', '赶出家门', '断绝关系',
  '你不是亲生的', '捡来的', '抱养的', '多余的',
  '校园欺凌', '霸凌',
  '家庭暴力',
  '后妈', '后爸', '继母虐待', '继父性侵',
  '陌生人给糖', '陌生人问路', '陌生人说爸妈让接',
  '陌生人给玩具', '陌生人给宠物',
  '陌生人请上车', '陌生人请带路', '陌生人进屋',
  '恋童癖', '儿童色情片', '儿童裸照', '儿童性交易', '儿童卖淫',
  '雏妓', '幼妓', '童妓',
  '色情直播', '成人网站',
  '裸贷', '果贷', '性贿赂', '性勒索',
];

// ===== 敏感词白名单（不进 prompt，后处理用）=====
export const SENSITIVE_WHITELIST: string[] = [
  '屁股', '便便', '放屁', '尿尿', '拉粑粑',
  '鼻涕', '打嗝', '打喷嚏', '打呼噜',
  '害怕', '伤心', '生气', '哭鼻子', '委屈',
  '摔倒', '砸到', '撞上', '滑倒',
  '魔法', '女巫', '妖怪', '怪兽', '幽灵',
  '宝藏', '秘密', '消失', '变身',
];

// ===== 敏感词过滤 =====

export interface FilterResult {
  clean: boolean;
  hits: string[];
  text: string; // 已替换敏感词为 ***
}

export function filterContent(text: string): FilterResult {
  if (!text) return { clean: true, hits: [], text: '' };

  const hits: string[] = [];
  let filtered = text;

  // 按长度降序排列，避免短词误匹配（如"血"匹配到"吸血鬼"）
  const sorted = [...HARD_BAN].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    if (filtered.includes(word)) {
      hits.push(word);
      // 按出现次数逐个替换，保留位置信息
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtered = filtered.replace(new RegExp(escaped, 'g'), '***');
    }
  }

  return { clean: hits.length === 0, hits, text: filtered };
}

// ===== 质量检查项（不进 prompt，后处理用）=====
export const QUALITY_CHECKS = [
  '开头是否在1-2句内引入角色',
  '反转是否自然不突兀',
  '结尾是否幽默收尾（非说教）',
  '是否有至少1个配角互动',
  '是否有拟声词或软萌动作描写',
  '主角数量是否符合年龄段要求',
  '句子长度是否符合年龄段要求',
];
