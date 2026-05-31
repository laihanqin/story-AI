import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryGeneration } from '@shared/hooks/useStoryGeneration';
import type { FlowState, FlowAction } from '@shared/hooks/useFlowReducer';
import {
  SPRITE_CONFIG,
  RIDDLE_DATABASE,
  GAME_CONFIG,
  INTRO_TEXT,
  type SpriteConfig,
  type RiddleData,
} from '@shared/constants/treasureHunt';

interface Props {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
}

interface Treasure extends SpriteConfig {
  size: string;
  isBomb: boolean;
  revealed: boolean;
}

const SPRITE_SIZE = 60;

export default function StoryWaiting({ state, dispatch }: Props) {
  const navigate = useNavigate();
  const { generate, cancel } = useStoryGeneration();
  const startedRef = useRef(false);
  const waitingVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  // Game state
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [currentRiddle, setCurrentRiddle] = useState<RiddleData | null>(null);
  const [goldCoins, setGoldCoins] = useState(0);
  const [showCoinFloat, setShowCoinFloat] = useState(false);
  const [coinFloatType, setCoinFloatType] = useState<'gain' | 'lose'>('gain');
  const [gameMessage, setGameMessage] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isIntro, setIsIntro] = useState(true);

  const treasuresRef = useRef(treasures);
  const currentRiddleRef = useRef(currentRiddle);
  const gameTimerRef = useRef<number | null>(null);
  const typewriterRef = useRef<number | null>(null);

  useEffect(() => { treasuresRef.current = treasures; }, [treasures]);
  useEffect(() => { currentRiddleRef.current = currentRiddle; }, [currentRiddle]);

  // Star particles (stable)
  const starParticles = useMemo(() => [...Array(12)].map(() => ({
    width: Math.random() * 4 + 2,
    height: Math.random() * 4 + 2,
    left: Math.random() * 100,
    top: Math.random() * 60,
    duration: 1.5 + Math.random() * 2,
    delay: Math.random() * 3,
  })), []);

  // Start story generation
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const charName = state.character?.role || '小动物';
    const scene = state.scene || '一个有趣的地方';
    const plot = state.plot || `${charName}去${scene}冒险的故事`;

    generate(
      { character: charName, scene, plot, characterImg: state.character?.img },
      {
        onProgress: (progress, message) => dispatch({ type: 'GENERATION_PROGRESS', progress, message }),
        onDone: (storyId) => dispatch({ type: 'GENERATION_DONE', storyId }),
        onFail: () => dispatch({ type: 'GENERATION_FAIL' }),
      },
    );

    return () => {
      cancel();
      startedRef.current = false;
    };
  }, []);

  // Navigate when ready
  useEffect(() => {
    if (state.phase === 'ready' && state.storyId) {
      const t = setTimeout(() => navigate(`/story/${state.storyId}`), 300);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.storyId, navigate]);

  // Video playback
  useEffect(() => {
    if (waitingVideoRef.current && !videoFailed) {
      waitingVideoRef.current.currentTime = 0;
      waitingVideoRef.current.muted = false;
      waitingVideoRef.current.play().catch(() => {
        if (waitingVideoRef.current) {
          waitingVideoRef.current.muted = true;
          waitingVideoRef.current.play().catch(() => setVideoFailed(true));
        }
      });
    }
  }, [videoFailed]);

  // Init game
  useEffect(() => {
    const bombPositions = new Set<number>();
    while (bombPositions.size < GAME_CONFIG.bombCount) {
      bombPositions.add(Math.floor(Math.random() * 8) + 1);
    }

    const newTreasures: Treasure[] = SPRITE_CONFIG.map(config => ({
      ...config,
      size: `width: ${SPRITE_SIZE * 0.9 * 2}px; height: ${SPRITE_SIZE * 0.9 * 2}px`,
      isBomb: bombPositions.has(config.id),
      revealed: false,
    }));

    setTreasures(newTreasures);
    setGoldCoins(0);
    setGameMessage('');
    setIsIntro(true);
    setCurrentRiddle(null);

    // 开场介绍停留足够时间，然后加载第一个谜语
    const introTimer = window.setTimeout(() => {
      setIsIntro(false);
      // 延迟一帧确保 isIntro 更新后再加载谜语
      window.setTimeout(() => loadFirstRiddle(), 100);
    }, GAME_CONFIG.introDelay);

    return () => clearTimeout(introTimer);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    const text = isIntro ? INTRO_TEXT : currentRiddle?.text || gameMessage || '';
    setDisplayText('');

    let i = 0;
    typewriterRef.current = window.setInterval(() => {
      i++;
      setDisplayText(text.slice(0, i));
      if (i >= text.length && typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    }, 40);

    return () => {
      if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    };
  }, [gameMessage, currentRiddle, isIntro]);

  // 加载第一个可用谜语（只选宝石目标）
  const loadFirstRiddle = useCallback(() => {
    const ct = treasuresRef.current;
    // 找出所有是宝石的精灵 ID
    const gemIds = new Set(ct.filter(t => !t.isBomb).map(t => t.id));

    // 从谜题库中选第一个目标为宝石且未被揭示的谜语
    const shuffled = [...RIDDLE_DATABASE].sort(() => Math.random() - 0.5);
    const next = shuffled.find(r => gemIds.has(r.target) && !ct.find(t => t.id === r.target)?.revealed);

    if (next) {
      setCurrentRiddle(next);
      setGameMessage('🧠 小老虎给你出题啦！根据提示找到对应的精灵吧！');
    } else {
      setCurrentRiddle(null);
      setGameMessage('✅ 所有宝石都被找到了！剩下的精灵可能藏着炸弹，要小心哦～');
    }
  }, []);

  // 加载下一个谜语（跳过炸弹目标 + 已揭示目标）
  const loadNextRiddle = useCallback(() => {
    const ct = treasuresRef.current;
    const gemIds = new Set(ct.filter(t => !t.isBomb).map(t => t.id));

    // 找出所有未使用的谜语，随机排序
    const available = RIDDLE_DATABASE.filter(r =>
      gemIds.has(r.target) && !ct.find(t => t.id === r.target)?.revealed
    );

    if (available.length > 0) {
      const next = available[Math.floor(Math.random() * available.length)];
      setCurrentRiddle(next);
      setGameMessage('🧠 新谜语来啦！根据提示找到对应的精灵吧！');
    } else {
      setCurrentRiddle(null);
      const allRevealed = ct.every(t => t.revealed);
      setGameMessage(allRevealed ? '🎉 所有宝藏都已找到！你太厉害了！' : '✅ 宝石都找到了！剩下的精灵里藏着炸弹，要小心哦～');
    }
  }, []);

  // 处理精灵点击
  const handleTreasureClick = useCallback((treasureId: number) => {
    const ct = treasuresRef.current;
    const treasure = ct.find(t => t.id === treasureId);
    const riddle = currentRiddleRef.current;
    if (!treasure || treasure.revealed) return;

    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);

    // 标记为已揭示
    setTreasures(prev => prev.map(t => t.id === treasureId ? { ...t, revealed: true } : t));

    if (treasure.isBomb) {
      // 💣 炸弹：扣分 + 保持当前谜语不变
      setGoldCoins(prev => Math.max(0, prev - GAME_CONFIG.bombPenalty));
      setCoinFloatType('lose');
      setShowCoinFloat(true);
      gameTimerRef.current = window.setTimeout(() => setShowCoinFloat(false), 1000);

      setGameMessage(`💣 哎呀！${treasure.name}是炸弹！扣了${GAME_CONFIG.bombPenalty}个金币！继续寻找宝石吧～`);
      // 炸弹点击后不跳谜语，保持当前谜语
    } else {
      // 💎 宝石：加分
      setGoldCoins(prev => prev + GAME_CONFIG.coinPerGem);
      setCoinFloatType('gain');
      setShowCoinFloat(true);
      gameTimerRef.current = window.setTimeout(() => setShowCoinFloat(false), 1000);

      if (riddle && treasureId === riddle.target) {
        // 猜对谜语！额外加分 + 加载下一个谜语
        setGoldCoins(prev => prev + GAME_CONFIG.coinPerRiddleBonus);
        setGameMessage(`🎉 太棒了！你找到了${treasure.name}，谜语正确！额外获得${GAME_CONFIG.coinPerRiddleBonus}个金币！`);
        gameTimerRef.current = window.setTimeout(() => loadNextRiddle(), GAME_CONFIG.resultDelay);
      } else if (riddle && treasureId !== riddle.target) {
        // 猜错了：宝石但不对应谜语，保持当前谜语
        setGameMessage(`💎 找到了${treasure.name}！获得${GAME_CONFIG.coinPerGem}个金币！但这不是谜底哦，再看看提示吧～`);
        // 不加载新谜语，保持当前谜语
      } else {
        // 自由探索（无活跃谜语）
        setGameMessage(`💎 发现了${treasure.name}！获得${GAME_CONFIG.coinPerGem}个金币！`);
        gameTimerRef.current = window.setTimeout(() => loadNextRiddle(), GAME_CONFIG.resultDelay);
      }
    }
  }, [loadNextRiddle]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0" style={{ zIndex: 50 }}>
      {/* Background */}
      {videoFailed ? (
        <img src="/故事生成等待界面.png" alt="背景" className="w-full h-full object-cover" />
      ) : (
        <video ref={waitingVideoRef} src="/故事等待生成.mp4" loop playsInline className="w-full h-full object-cover" onError={() => setVideoFailed(true)} />
      )}
      <img src="/故事生成等待界面.png" alt="" className="absolute inset-0 w-full h-full object-cover -z-10" />

      {/* Star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {starParticles.map((p, i) => (
          <div key={i} className="absolute rounded-full bg-yellow-100" style={{
            width: `${p.width}px`, height: `${p.height}px`, left: `${p.left}%`, top: `${p.top}%`,
            animation: `twinkle ${p.duration}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
            boxShadow: '0 0 6px 2px rgba(255,255,200,0.6)',
          }} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="landscape-progress absolute top-[12%] md:top-[18%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3 px-4">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-base md:text-[22px]">🪶</span>
          <p style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '14px', color: '#5a4a3a', textShadow: '0 1px 3px rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }} className="md:text-[20px]">
            魔法羽毛笔正在书写你的故事...
          </p>
        </div>
        <div className="landscape-progress-bar relative w-[260px] md:w-[320px] h-[22px] md:h-[28px]">
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ background: 'rgba(90,70,50,0.25)', border: '2px solid rgba(139,110,80,0.4)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden" style={{
              width: `${state.waitingProgress}%`,
              background: 'linear-gradient(90deg, #8B6914, #DAA520, #FFD700)',
              boxShadow: '0 0 10px rgba(218,165,32,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
              <div className="absolute right-0 top-0 bottom-0 w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            </div>
          </div>
          <p className="absolute inset-0 flex items-center justify-center font-bold select-none" style={{ fontFamily: '"Comic Sans MS", cursive', fontSize: '14px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {Math.min(Math.round(state.waitingProgress), 100)}%
          </p>
        </div>
        <p className="text-center px-4 py-1 rounded-full" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '16px', color: '#6b5a48', background: 'rgba(255,248,230,0.7)', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap' }}>
          {state.waitingMessage || (state.waitingProgress < 30 ? '📖 正在收集故事素材...' : state.waitingProgress < 60 ? '📝 正在编织精彩情节...' : state.waitingProgress < 90 ? '🔮 正在施展魔法...' : '🎉 故事即将完成！')}
        </p>
      </div>

      {/* Treasure game */}
      <div className="landscape-sprites absolute inset-0 pointer-events-none">
        {/* Coin display */}
        <div className="landscape-coins absolute top-[6%] left-[2%] flex items-center gap-2 bg-yellow-100/80 px-4 py-2 rounded-full border-2 border-yellow-400 shadow-lg pointer-events-auto" style={{ minWidth: '80px' }}>
          <span className="text-2xl" style={{ animation: showCoinFloat ? 'coinBounce 0.3s ease-in-out 3' : 'none' }}>💰</span>
          <span className="font-bold text-xl" style={{ color: '#B8860B' }}>{goldCoins}</span>
          {showCoinFloat && (
            <div className="absolute top-0 right-0 font-black text-2xl" style={{
              color: coinFloatType === 'gain' ? '#FFD700' : '#ef4444',
              textShadow: coinFloatType === 'gain' ? '0 2px 4px rgba(255,215,0,0.6)' : '0 2px 4px rgba(239,68,68,0.6)',
              animation: 'coinFloatUp 1s ease-out forwards',
              zIndex: 10,
            }}>{coinFloatType === 'gain' ? `+${GAME_CONFIG.coinPerGem}` : `-${GAME_CONFIG.bombPenalty}`}</div>
          )}
        </div>

        {/* Riddle box */}
        <div className="landscape-riddle absolute top-[62%] md:top-[67%] left-1/2 -translate-x-1/2 w-[90%] md:w-[34%] max-w-[500px] pointer-events-auto" style={{ animation: isIntro || currentRiddle ? 'riddleBreath 3s ease-in-out infinite' : 'none' }}>
          <div className="py-1 px-3 bg-white/75 rounded-2xl backdrop-blur-sm border-2 border-orange-200 shadow-xl">
            <div className="flex items-start gap-3">
              <img src="/小老虎.png" alt="小老虎" style={{ width: `${SPRITE_SIZE * 0.9 * 2 * 0.7}px`, height: `${SPRITE_SIZE * 0.9 * 2 * 0.7}px`, objectFit: 'contain' }} />
              <div className="flex-1">
                <p className="text-sm font-bold mb-1" style={{ color: '#ff6b35' }}>
                  {isIntro ? '📖 游戏介绍：' : '🐯 小老虎的提示：'}
                </p>
                <p className="text-lg font-medium leading-relaxed whitespace-pre-line" style={{ color: isIntro || currentRiddle ? '#5a4a3a' : '#999' }}>
                  {displayText}
                  <span className="inline-block w-[2px] h-[1em] bg-current align-middle ml-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Sprites */}
        {treasures.map(treasure => (
          <div key={treasure.id} onClick={() => handleTreasureClick(treasure.id)}
            className={`absolute cursor-pointer transition-all duration-300 pointer-events-auto ${treasure.revealed ? 'pointer-events-none' : 'hover:scale-115 hover:-translate-y-3'}`}
            style={{
              bottom: treasure.position.bottom,
              ...(treasure.position.right ? { right: treasure.position.right } : { left: treasure.position.left }),
              ...(!treasure.revealed && {
                animation: `${treasure.posture === 'floating' ? 'spriteFly' : 'spriteFloat'} ${2 + treasure.id * 0.3}s ease-in-out infinite`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }),
            }}
          >
            <div className="landscape-sprite relative" style={{ width: `${SPRITE_SIZE * 0.9 * 2}px`, height: `${SPRITE_SIZE * 0.9 * 2}px` }}>
              <div className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-black z-10 transition-opacity duration-300" style={{
                width: '20px', height: '20px', fontSize: '11px',
                background: treasure.revealed ? (treasure.isBomb ? '#ef4444' : '#22c55e') : 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.4)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', opacity: treasure.revealed ? 0 : 1,
              }}>{treasure.id}</div>
              <div className="w-full h-full" style={{ opacity: treasure.revealed ? 0 : 1, transition: 'opacity 0.3s ease-out' }}>
                <img src={treasure.img} alt={treasure.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/icons/金币.png'; }} />
              </div>
              {treasure.revealed && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5, animation: treasure.isBomb ? 'bombSmoke 2s ease-out forwards' : 'gemGlow 1.2s ease-out forwards' }}>
                  <span style={{ fontSize: `${SPRITE_SIZE * 0.8}px` }}>{treasure.isBomb ? '💣' : '💎'}</span>
                </div>
              )}
            </div>
            <div className="mt-1 text-center transition-opacity duration-300" style={{ opacity: treasure.revealed ? 0 : 1 }}>
              <p className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${treasure.revealed ? 'bg-gray-300/80 text-gray-600' : 'bg-orange-100/90 text-orange-700'}`}
                style={{ textShadow: treasure.revealed ? 'none' : '0 1px 2px rgba(255,255,255,0.5)' }}>{treasure.revealed ? '???' : treasure.name}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        /* 手机横屏适配 */
        @media (orientation: landscape) and (max-height: 500px) {
          .landscape-progress { top: 8% !important; }
          .landscape-progress p { font-size: 11px !important; }
          .landscape-progress-bar { width: 180px !important; height: 16px !important; }
          .landscape-coins { top: 2% !important; left: 1% !important; padding: 2px 8px !important; }
          .landscape-coins span { font-size: 16px !important; }
          .landscape-riddle { top: 38% !important; width: 60% !important; max-width: 420px !important; }
          .landscape-riddle .text-lg { font-size: 13px !important; }
          .landscape-riddle .text-sm { font-size: 10px !important; }
          .landscape-riddle img { width: 40px !important; height: 40px !important; }
          .landscape-sprite { width: 60px !important; height: 60px !important; }
          .landscape-sprites .text-xs { font-size: 9px !important; padding: 1px 6px !important; }
          /* 整体缩小+上移精灵群，避免挤压谜语框（仅选中精灵，排除金币区和谜语框） */
          .landscape-sprites > .cursor-pointer {
            transform: translateY(15%) scale(0.7) !important;
            transform-origin: center bottom !important;
          }
        }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes shimmer { 0% { opacity: 0; transform: translateX(-8px); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateX(8px); } }
        @keyframes spriteFloat { 0%, 100% { transform: translateY(0px) rotate(0deg); } 25% { transform: translateY(-6px) rotate(-1deg); } 50% { transform: translateY(-10px) rotate(0deg); } 75% { transform: translateY(-4px) rotate(1deg); } }
        @keyframes spriteFly { 0%, 100% { transform: translateY(0px) translateX(0px); } 20% { transform: translateY(-12px) translateX(3px); } 40% { transform: translateY(-18px) translateX(-2px); } 60% { transform: translateY(-14px) translateX(4px); } 80% { transform: translateY(-8px) translateX(-3px); } }
        @keyframes coinBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes coinFloatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(0.8); } }
        @keyframes gemGlow { 0% { opacity: 1; transform: scale(1); } 30% { opacity: 1; transform: scale(1.3); } 100% { opacity: 0; transform: scale(0); } }
        @keyframes bombSmoke { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.5); } }
        @keyframes riddleBreath { 0%, 100% { transform: translateX(-50%) scale(1); box-shadow: 0 4px 16px rgba(255,107,53,0.2); } 50% { transform: translateX(-50%) scale(1.01); box-shadow: 0 6px 24px rgba(255,107,53,0.3); } }
      `}</style>
    </div>
  );
}
