// ===== 藏宝游戏数据配置 =====
// 精灵固定配置（顺序对应精灵图片编号 1-8）
// 注意：isBomb 和 revealed 是运行状态，由组件管理，不在此定义

export type TreasurePosture = 'lying' | 'sitting' | 'standing' | 'crouching' | 'floating';

export interface SpriteConfig {
  id: number;
  name: string;
  img: string;
  posture: TreasurePosture;
  position: { bottom: string; left?: string; right?: string };
  /** 精灵外观描述（用于谜语生成） */
  description: string;
}

export interface RiddleData {
  id: string;
  /** 指向的精灵编号 */
  target: number;
  /** 谜语文字（描述外观或数学题，引导小朋友找到对应数字） */
  text: string;
  /** 类型标签 */
  type: 'appearance' | 'math' | 'shape';
}

export interface GameConfig {
  bombCount: number;
  coinPerGem: number;
  coinPerRiddleBonus: number;
  bombPenalty: number;
  /** 开场介绍停留时间(ms) */
  introDelay: number;
  /** 点击结果展示时间(ms) */
  resultDelay: number;
}

// ---- 精灵配置（含外观描述，供谜语引用）----

export const SPRITE_CONFIG: SpriteConfig[] = [
  {
    id: 1,
    name: '小老虎',
    img: '/小精灵1.png',
    posture: 'lying',
    position: { bottom: '14%', left: '6%' },
    description: '一只圆滚滚、毛茸茸的可爱小老虎，身上有柔和的橙色与黑色条纹，肚皮是奶油白色。它正开心地在地上打滚，四只小爪子朝天轻轻挥舞，尾巴愉快地左右摇摆。它的脖子上系着一条小小的红色围巾，围巾一角绣着发光的数字"①"。',
  },
  {
    id: 2,
    name: '糖果精灵',
    img: '/小精灵2.png',
    posture: 'sitting',
    position: { bottom: '3%', right: '5%' },
    description: '一个小小的、半透明的甜美精灵，身体像粉色的果冻一样Q弹。她正坐在地上，双手捧着一颗比自己脑袋还大的彩色棒棒糖，开心地舔着。她的头上戴着一顶由小糖果串成的小皇冠，皇冠正中央镶嵌着一颗发光的数字"②"。',
  },
  {
    id: 3,
    name: '瞌睡泡泡',
    img: '/小精灵3.png',
    posture: 'lying',
    position: { bottom: '4%', left: '52%' },
    description: '一只圆乎乎、软绵绵的浅蓝色小瞌睡虫，正趴在一朵蓬松的小蘑菇上打瞌睡。它的眼睛舒服地闭着，鼻子上冒着一个透明的大泡泡，泡泡表面流转着柔和的微光。泡泡的正中央，浮现着一个若隐若现的发光数字"③"。',
  },
  {
    id: 4,
    name: '小仙子',
    img: '/小精灵4.png',
    posture: 'floating',
    position: { bottom: '26%', left: '16%' },
    description: '一位小巧精致的蝴蝶仙子，正踮着脚尖轻盈地悬停在半空中。她背后有一对美丽的、半透明的蓝色翅膀，翅膀上有着金色的纹路，组成一个清晰的数字"④"。她正低头温柔地看着下方，一只手轻轻扬起，洒下细小的闪光鳞粉。',
  },
  {
    id: 5,
    name: '拳击手',
    img: '/小精灵5.png',
    posture: 'standing',
    position: { bottom: '8%', left: '72%' },
    description: '一个圆头圆脑、憨态可掬的小大力士，他是一只戴着小小拳击手套的健壮小鼹鼠。他正努力地举起一颗比自己还大一圈的、刻着发光数字"⑤"的星星魔法石，小脸憋得通红，但嘴角却带着不服输的微笑。',
  },
  {
    id: 6,
    name: '坚果宝宝',
    img: '/小精灵6.png',
    posture: 'crouching',
    position: { bottom: '11%', left: '78%' },
    description: '一颗裂开了壳的浅棕色大开心果，但不是普通的果实，它有着圆圆的眼睛和一张笑得合不拢的大嘴，露出里面嫩绿的果仁。它正捂着肚子大笑，眼泪都快笑出来了。它裂开的坚硬果壳上，天然形成了一个发光的数字"⑥"。',
  },
  {
    id: 7,
    name: '蘑菇精灵',
    img: '/小精灵7.png',
    posture: 'crouching',
    position: { bottom: '2%', left: '10%' },
    description: '一朵粉扑扑、肉嘟嘟的小蘑菇，有着乳白色的菌柄和淡粉色的菌盖，菌盖上点缀着几颗白色圆点。它正躲在一朵稍大的蘑菇后面，只探出半个身子，用菌盖的边缘遮住自己一半的脸，只露出一双羞怯的大眼睛，偷偷地往外看。它菌盖上的白色圆点中，最大的一颗巧妙变成了发光的数字"⑦"。',
  },
  {
    id: 8,
    name: '魔法师',
    img: '/小精灵8.png',
    posture: 'floating',
    position: { bottom: '23%', right: '8%' },
    description: '一个深紫色、像小幽灵一样飘浮着的捣蛋鬼，它正调皮地拉起自己身体的一角，把自己裹成一个小包袱，只露出两只狡黠的眼睛。它的手里拿着一根小小的、沾着墨水的羽毛笔，正试图悄悄在书的封底画上一颗小星星。它身上有一块小小的补丁，补丁上缝着一个发光的数字"⑧"。',
  },
];

// ---- 谜语数据库（只描述宝石精灵，运行时由系统过滤掉炸弹目标）----
// 每个谜语 target 指向一个精灵编号
// 运行时：如果该精灵是炸弹，则跳过此谜语

export const RIDDLE_DATABASE: RiddleData[] = [
  // ===== 外观描述类 =====
  {
    id: 'appearance-1',
    target: 1,
    type: 'appearance',
    text: '🔍 找一找：身上有橙色和黑色条纹，戴着红色小围巾，正在地上开心打滚的是谁呀？它身上的数字是几？',
  },
  {
    id: 'appearance-2',
    target: 2,
    type: 'appearance',
    text: '🔍 找一找：身体像粉色果冻一样Q弹，戴着小糖果皇冠，正在舔棒棒糖的是谁呀？皇冠上的数字是多少？',
  },
  {
    id: 'appearance-3',
    target: 3,
    type: 'appearance',
    text: '🔍 找一找：浅蓝色、圆乎乎的小瞌睡虫，趴在蘑菇上吹泡泡，泡泡里面藏着一个数字，你看到了吗？',
  },
  {
    id: 'appearance-4',
    target: 4,
    type: 'appearance',
    text: '🔍 找一找：有美丽的蓝色翅膀，翅膀上有金色花纹，正在空中洒下闪光鳞粉的小仙子，她的翅膀上写着什么数字？',
  },
  {
    id: 'appearance-5',
    target: 5,
    type: 'appearance',
    text: '🔍 找一找：戴着拳击手套、正在举起一颗大星星的小力士，星星上刻着什么数字？',
  },
  {
    id: 'appearance-6',
    target: 6,
    type: 'appearance',
    text: '🔍 找一找：一颗裂开壳的大开心果，正捂着肚子哈哈大笑，它的果壳上有什么数字？',
  },
  {
    id: 'appearance-7',
    target: 7,
    type: 'appearance',
    text: '🔍 找一找：一朵粉嘟嘟的小蘑菇，正害羞地躲在另一朵蘑菇后面，菌盖上最大的白色圆点变成了什么数字？',
  },
  {
    id: 'appearance-8',
    target: 8,
    type: 'appearance',
    text: '🔍 找一找：一个深紫色、像小幽灵一样飘着的小捣蛋鬼，手里拿着羽毛笔，它身上的补丁上缝着什么数字？',
  },

  // ===== 数学题类（答案 = 精灵编号）=====
  { id: 'math-1', target: 1, type: 'math', text: '🧮 算一算：树上有3只小鸟，飞走了2只，还剩几只？那就是我们要找的精灵编号哦！' },
  { id: 'math-2', target: 2, type: 'math', text: '🧮 算一算：1 + 1 等于几？答案就是精灵身上的数字哦！' },
  { id: 'math-3', target: 3, type: 'math', text: '🧮 算一算：5 - 2 等于几？算出来的数字就是我们要找的精灵！' },
  { id: 'math-4', target: 4, type: 'math', text: '🧮 算一算：2 + 2 等于几？答案就是精灵的编号，去找找看！' },
  { id: 'math-5', target: 5, type: 'math', text: '🧮 算一算：小朋友一只手有几根手指？这个数字的精灵在等着你哦！' },
  { id: 'math-6', target: 6, type: 'math', text: '🧮 算一算：3 + 3 等于几？算对了就能找到宝石精灵！' },
  { id: 'math-7', target: 7, type: 'math', text: '🧮 算一算：一个星期有几天？答案就是精灵身上的数字！' },
  { id: 'math-8', target: 8, type: 'math', text: '🧮 算一算：4 + 4 等于几？找到这个数字的精灵就能获得宝石！' },

  // ===== 形状联想类 =====
  { id: 'shape-1', target: 1, type: 'shape', text: '🔷 想一想：什么东西像一根直直的铅笔？对应数字1的精灵在等你！' },
  { id: 'shape-2', target: 2, type: 'shape', text: '🔷 想一想：小鸭子游泳的样子像什么数字？找到它身上的精灵编号！' },
  { id: 'shape-3', target: 3, type: 'shape', text: '🔷 想一想：耳朵的形状像哪个数字？找到对应数字的精灵吧！' },
  { id: 'shape-4', target: 4, type: 'shape', text: '🔷 想一想：小旗子飘扬的样子像哪个数字？看看哪个精灵身上有这个数字！' },
  { id: 'shape-5', target: 5, type: 'shape', text: '🔷 想一想：挂钩弯弯的像哪个数字？找找对应数字的精灵！' },
  { id: 'shape-6', target: 6, type: 'shape', text: '🔷 想一想：哨子的形状像哪个数字？找到它就能发现宝石！' },
  { id: 'shape-7', target: 7, type: 'shape', text: '🔷 想一想：拐杖的样子像哪个数字？对应数字的精灵在等你发现！' },
  { id: 'shape-8', target: 8, type: 'shape', text: '🔷 想一想：两个圆圈叠在一起像什么数字？找到对应精灵看看！' },
];

// ---- 游戏参数 ----

export const GAME_CONFIG: GameConfig = {
  bombCount: 2,
  coinPerGem: 1,
  coinPerRiddleBonus: 2,
  bombPenalty: 2,
  introDelay: 3000,
  resultDelay: 1500,
};

// ---- 开场介绍文本 ----

export const INTRO_TEXT = `🎮 欢迎来到精灵寻宝！

这里一共有8只可爱的小精灵，每只身上都有一个数字。

其中2只小精灵藏了炸弹💣，另外6只藏了宝石💎。

小老虎会给你出谜语，根据提示找到正确的精灵，就能获得额外金币！

但千万要小心炸弹哦～碰到炸弹会扣金币的。

准备好了吗？让我们开始寻宝吧！`;
