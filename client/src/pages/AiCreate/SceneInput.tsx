import { useEffect, useRef, useCallback, useState } from 'react';
import { useSpeechRecognition } from '@shared/hooks/useSpeechRecognition';
import { getAccessHeaders } from '@shared/services/access';
import type { FlowState, FlowAction, CharacterInfo, DialogItem } from '@shared/hooks/useFlowReducer';

const sceneList = [
  { name: '天空之城', img: '/场景1-天空之城.png', color: '#ea580c' },
  { name: '海洋王国', img: '/场景2-海洋王国.png', color: '#2563eb' },
  { name: '糖果乐园', img: '/场景3-糖果城堡.png', color: '#db2777' },
  { name: '数字世界', img: '/场景4-数字世界.png', color: '#7c3aed' },
];

interface Props {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
  character: CharacterInfo;
}

interface ConfirmData {
  scene: string;
  reply: string;
}

export default function SceneInput({ state, dispatch, character }: Props) {
  const sceneAudioRef = useRef<HTMLAudioElement | null>(null);
  const apiAbortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);
  const plotTimerRef = useRef<number | null>(null);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

  // 播放场景音频
  useEffect(() => {
    const timer = setTimeout(() => sceneAudioRef.current?.play().catch(() => {}), 500);
    return () => { clearTimeout(timer); sceneAudioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    return () => { if (plotTimerRef.current) clearTimeout(plotTimerRef.current); };
  }, []);

  // 图片点击流程：waiting → confirmed → go to plot
  useEffect(() => {
    if (state.dialogMode !== 'waiting') return;
    const t = setTimeout(() => dispatch({ type: 'SCENE_CONFIRMED' }), 500);
    return () => clearTimeout(t);
  }, [state.dialogMode, dispatch]);

  useEffect(() => {
    if (state.dialogMode !== 'confirmed') return;
    const t = setTimeout(() => dispatch({ type: 'GO_TO_PLOT' }), 500);
    return () => clearTimeout(t);
  }, [state.dialogMode, dispatch]);

  const processVoiceInput = useCallback(async (text: string) => {
    const sessionId = ++sessionRef.current;
    apiAbortRef.current?.abort();
    apiAbortRef.current = new AbortController();

    try {
      const res = await fetch('/api/speech/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAccessHeaders() },
        body: JSON.stringify({ text, type: 'scene', character: character.role }),
        signal: apiAbortRef.current.signal,
      });
      const data = await res.json();
      if (sessionRef.current !== sessionId) return;

      if (!data.success) {
        const msg = data.message === 'content_too_short'
          ? '我没有听清楚哦，可以再说一次吗？'
          : '我没有听懂你想去哪里哦，可以再说一次吗？';
        dispatch({ type: 'VOICE_ERROR', message: msg });
        return;
      }

      const scene = data.data.scene;
      const reply = data.data.reply ? `${scene}！${data.data.reply}` : scene;
      setConfirmData({ scene, reply });
    } catch {
      if (sessionRef.current === sessionId) {
        dispatch({ type: 'VOICE_ERROR', message: '网络好像不太好，可以再说一次吗' });
      }
    }
  }, [dispatch, character.role]);

  const handleConfirm = useCallback(() => {
    if (!confirmData) return;
    dispatch({ type: 'SCENE_API_RESPONSE', scene: confirmData.scene, reply: confirmData.reply });
    setConfirmData(null);
    if (plotTimerRef.current) clearTimeout(plotTimerRef.current);
    plotTimerRef.current = window.setTimeout(() => {
      dispatch({ type: 'GO_TO_PLOT' });
    }, 1500);
  }, [confirmData, dispatch]);

  const handleReject = useCallback(() => {
    setConfirmData(null);
    dispatch({ type: 'VOICE_ERROR', message: '那我再听一次，你想去哪里呢？' });
  }, [dispatch]);

  const onVoiceStop = useCallback((finalText: string) => {
    if (!finalText.trim()) {
      dispatch({ type: 'VOICE_ERROR', message: '我没有听清楚哦，可以再说一次吗？' });
      return;
    }
    processVoiceInput(finalText);
  }, [processVoiceInput, dispatch]);

  const speech = useSpeechRecognition({
    onResult: (text) => dispatch({ type: 'VOICE_TEXT', text }),
    onError: (msg) => dispatch({ type: 'VOICE_ERROR', message: msg }),
    onStop: onVoiceStop,
    silenceTimeout: 4000,
    maxDuration: 8000,
  });

  const handleSceneClick = (sceneName: string) => {
    if (state.dialogMode !== 'idle') return;
    dispatch({ type: 'SCENE_SELECTED', scene: sceneName });
  };

  const handleMicClick = () => {
    if (speech.isListening) {
      speech.stop();
    } else {
      dispatch({ type: 'VOICE_START' });
      speech.start();
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{
        backgroundImage: `url('/角色选择界面.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {/* 老虎 */}
      <div className="absolute top-[2%] left-[10%] landscape:!top-[1%] landscape:!left-[10%] landscape:!w-[80px] landscape:!h-[80px] md:top-[4%] md:left-[40%] w-[120px] h-[120px] md:w-[286px] md:h-[286px]" style={{ animation: 'dance 1.2s ease-in-out infinite' }}>
        <img src="/小老虎.png" alt="小老虎" className="w-full h-full object-contain" style={{ filter: 'brightness(1.05)' }} />
      </div>

      {/* 思考气泡 */}
      <div className="absolute top-[0%] left-[35%] md:top-[1%] md:left-[53%]">
        <div className="thought-cloud-mobile md:thought-cloud landscape-shrink-cloud">
          <p className="thought-text-mobile md:thought-text landscape-text">你，<br />想去哪里冒险呢？</p>
        </div>
      </div>

      {/* 半透明罩 */}
      <div className="landscape-panel absolute bottom-[1%] left-1/2 -translate-x-1/2" style={{ zIndex: 2, width: '94%', maxWidth: '2550px', height: '62%' }}>
        <div className="absolute inset-0" style={{
          borderRadius: '40px', background: 'rgba(80, 80, 80, 0.1)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
        }} />

        {/* 引导对话框 */}
        <div className="absolute top-[2%] md:top-[3%] left-[2%] flex items-center z-10">
          <div className="w-[32px] h-[32px] md:w-[50px] md:h-[50px] rounded-full overflow-hidden border-2 border-orange-300 mr-1 md:mr-2 flex-shrink-0">
            <img src="/系统.png" alt="系统头像" className="w-full h-full object-cover" />
          </div>
          <div className="h-[32px] md:h-[50px] inline-block relative" style={{ width: '180px' }}>
            <img src="/对话框.png" alt="对话框" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '14px', color: '#333', fontWeight: 500, lineHeight: 1.4, padding: '0 20px', whiteSpace: 'nowrap', margin: 0 }} className="md:text-[24px]">
                你想去哪里冒险呢？
              </p>
            </div>
          </div>
        </div>

        {/* 麦克风 */}
        <div className="absolute right-[-2%] md:right-[0%] top-1/2 -translate-y-1/2 z-10">
          <img src="/麦克风.png" alt="麦克风"
            className="w-[80px] md:w-[156px] h-auto object-contain cursor-pointer transition-all duration-200"
            style={{
              transform: speech.isListening ? 'scale(1.2)' : 'scale(1)',
              filter: speech.isListening ? 'drop-shadow(0 0 15px rgba(255,100,100,0.6))' : 'drop-shadow(0 0 8px rgba(255,200,100,0.3))',
            }}
            onClick={handleMicClick}
          />
        </div>

        {/* 倾听提示 */}
        {speech.isListening && (
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm shadow-lg z-20">
            <span className="text-lg text-gray-700 font-medium">{state.voiceText || '正在倾听...'}</span>
          </div>
        )}

        {/* 对话历史 */}
        <div className="absolute top-[14%] left-[2%] right-[15%] flex flex-col gap-3 z-10">
          {state.dialogHistory.map((item: DialogItem, index: number) => (
            <div key={index} className="relative w-full" style={{
              animation: item.role === 'user' ? 'slideInRight 0.3s ease-out forwards' : 'slideInLeft 0.3s ease-out forwards',
              marginBottom: '8px',
            }}>
              {item.role === 'system' && (
                <div className="flex items-center w-full">
                  <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-orange-300 flex-shrink-0">
                    <img src="/系统.png" alt="系统" className="w-full h-full object-cover" />
                  </div>
                  <div className="h-[50px] inline-block relative ml-2" style={{ width: `${Math.max(item.text.length * 28 + 60, 180)}px` }}>
                    <img src="/对话框.png" alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '24px', color: '#333', fontWeight: 500, lineHeight: 1.4, padding: '0 30px', whiteSpace: 'nowrap', margin: 0 }}>{item.text}</p>
                    </div>
                  </div>
                </div>
              )}
              {item.role === 'user' && (
                <div className="flex items-center justify-end w-full">
                  <div className="h-[50px] inline-block relative flex-shrink-0" style={{ width: `${Math.max(item.text.length * 28 + 60, 180)}px` }}>
                    <img src="/对话框.png" alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '24px', color: '#333', fontWeight: 500, lineHeight: 1.4, padding: '5px 30px', whiteSpace: 'nowrap' }}>{item.text}</p>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 relative w-[60px] h-[70px]">
                    <img src="/角色卡片.png" alt="" className="w-full h-full object-contain" />
                    <img src={character.img} alt={character.role} className="absolute object-contain" style={{ width: '70%', height: '70%', top: '5%', left: '15%' }} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 确认气泡 */}
          {confirmData && (
            <div className="relative w-full" style={{ animation: 'slideInLeft 0.3s ease-out forwards', marginBottom: '8px' }}>
              <div className="flex items-start w-full">
                <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-orange-300 flex-shrink-0 mt-1">
                  <img src="/系统.png" alt="系统" className="w-full h-full object-cover" />
                </div>
                <div className="ml-2 flex flex-col gap-2">
                  <div className="bg-white rounded-2xl shadow-md px-5 py-2.5 inline-block" style={{ maxWidth: '420px' }}>
                    <p style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', fontSize: '22px', color: '#333', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                      你是想去「{confirmData.scene}」，对吗？
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirm}
                      className="px-5 py-2 bg-green-400 hover:bg-green-500 text-white font-bold rounded-full shadow-md transition-all text-lg"
                      style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
                    >
                      ✓ 对呀！
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-5 py-2 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-full shadow-md transition-all text-lg"
                      style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
                    >
                      ↺ 再说一次
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 场景图片 */}
        <div
          className="absolute top-[8%] md:top-[14%] left-[2%] md:left-[3%] right-[18%] md:right-[22%] grid grid-cols-2 grid-rows-2 md:flex md:justify-between landscape:!grid landscape:!grid-cols-2 landscape:!grid-rows-2 landscape:!gap-1 landscape:!top-[3%] landscape:!left-[2%] landscape:!right-[25%] items-center gap-1 md:gap-0"
          style={{ zIndex: state.showSceneImages ? 3 : -1, opacity: state.showSceneImages ? 1 : 0, pointerEvents: state.showSceneImages ? 'auto' : 'none', transition: 'opacity 0.3s' }}
        >
          {sceneList.map(s => (
            <div key={s.name} className="relative w-full md:w-[286px] landscape:!w-full landscape:!h-[100px] h-[140px] md:h-[320px] cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => handleSceneClick(s.name)}>
              <div className="w-full h-[110px] md:h-[286px] landscape:!h-[80px] p-1 md:p-2">
                <img src="/场景背景版.png" alt="" className="w-full h-full object-cover rounded-2xl" />
                <img src={s.img} alt={s.name} className="absolute inset-1 md:inset-3 object-cover rounded-xl shadow-md" style={{ width: 'calc(100% - 8px)', height: 'calc(100% - 28px)' }} />
              </div>
              <p className="absolute bottom-0 md:bottom-1 left-0 right-0 text-center text-sm md:text-xl font-bold" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive', color: s.color }}>{s.name}</p>
            </div>
          ))}
        </div>
      </div>

      <audio ref={sceneAudioRef} src="/场景选择.mp3" preload="auto" />

      <style>{`
        /* 仅保留本页独有的样式，共享部分在 @shared/styles/landscape.css */
        @media (orientation: landscape) and (max-height: 500px) {
          .landscape-mic { width: 56px !important; }
        }
      `}</style>
    </div>
  );
}
