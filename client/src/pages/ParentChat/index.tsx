import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, MicOff } from 'lucide-react';
import { parentApi } from '@shared/services/api';
import { getAccessHeaders } from '@shared/services/access';
import { CHARACTER_NAMES } from '@shared/constants/characters';

type ChatStep = 'lesson' | 'character' | 'plot' | 'confirm' | 'generating';

interface ChatMessage {
  id: string;
  role: 'ai' | 'parent' | 'system';
  text: string;
  isSummary?: boolean;
  summary?: { lesson: string; character: string; plot: string };
  isToast?: boolean;
}

const SKIP_PATTERNS = /^(你帮我想|你来|随便|都行|没想好|没有想法|不知道|都可以|帮我选|你决定|交给你).*$/;
const CONFIRM_KEYWORDS = ['可以', '确认', '没问题', '好的', '好', '行', '嗯', '对', '是的', '就这样', '生成吧', '生成', 'OK', 'ok', 'Ok', '没问题', '可以的', '好了', '好哒', '好的呢'];
function isConfirm(text: string): boolean {
  const t = text.trim();
  // 只有 5 个字以内的纯确认词才算确认
  if (t.length > 5) return false;
  return CONFIRM_KEYWORDS.some(k => t === k || t === k + '！' || t === k + '！!' || t === k + '~' || t === k + '。');
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let msgCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++msgCounter}`;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'ai',
  text: '你好呀～我是故事小精灵！✨\n\n接下来我会引导你一步步为宝贝创作一个专属故事。\n\n首先：你想让宝贝从故事中学会什么道理呢？\n比如分享、诚实、勇敢、友善、坚持...你也可以说说具体的场景～',
};

export default function ParentChat() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [step, setStep] = useState<ChatStep>('lesson');
  const [isListening, setIsListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // 收集的数据
  const dataRef = useRef({ lesson: '', character: '', plot: '', confirmed: false });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const recognitionRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const smoothScrollToBottom = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = chatContainerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }, 80);
  }, []);

  useEffect(() => {
    smoothScrollToBottom();
  }, [messages, smoothScrollToBottom]);

  // 初始化语音识别
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognitionRef.current = recognition;
    }
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Toast 自动消失
  useEffect(() => {
    if (toast) {
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
      return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
    }
  }, [toast]);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    const id = nextId();
    setMessages(prev => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const addAiMessage = useCallback((text: string, extra?: Partial<ChatMessage>) => {
    addMessage({ role: 'ai', text, ...extra });
  }, [addMessage]);

  // 开始生成故事
  const startGeneration = useCallback(() => {
    const d = dataRef.current;
    setStep('generating');
    setGenerating(true);
    setGenProgress(0);
    setGenMessage('正在准备...');

    addMessage({ role: 'system', text: '故事正在后台生成中，你可以离开本页面，完成后会通知你～' });

    parentApi.generate({
      lesson: d.lesson,
      character: d.character,
      scene: '',
      plot: d.plot,
    }).then(res => {
      if (!res.success || !res.data?._id) {
        setGenerating(false);
        addAiMessage('生成启动失败，请重试～');
        return;
      }

      const storyId = res.data._id;

      // 轮询进度
      pollTimerRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem('story-ai-token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAccessHeaders() };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const pollRes = await fetch(`/api/stories/${storyId}`, { headers });
          const pollData = await pollRes.json();
          if (!pollData.success) return;

          const story = pollData.data;
          setGenProgress(story.progress || 0);
          setGenMessage(story.progressMessage || '');

          if (story.status === 'ready') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setGenerating(false);
            setGenProgress(100);
            setGenMessage('生成完成');
            // 右上角弹窗通知
            setToast('🎉 故事已生成！可在「我的故事」中查看');
            addAiMessage('故事已经生成好啦～快去「我的故事」看看吧！📚');
          } else if (story.status === 'draft' && (story.progress || 0) === 0) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setGenerating(false);
            addAiMessage('故事生成遇到问题，请重试～');
          }
        } catch {
          // 网络抖动，继续轮询
        }
      }, 2000);
    }).catch(() => {
      setGenerating(false);
      addAiMessage('网络异常，请稍后重试～');
    });
  }, [addMessage, addAiMessage]);

  // 调用后端大纲智能体
  const fetchOutline = useCallback(async (params: {
    lesson: string;
    character: string;
    plot: string;
    feedback?: string;
  }) => {
    const token = localStorage.getItem('story-ai-token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAccessHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/parent/outline', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const d = data.data as { lesson: string; character: string; scene: string; plot: string };
    return {
      lesson: d.lesson,
      character: d.character,
      plot: d.scene ? `【${d.scene}】${d.plot}` : d.plot,
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    // 添加家长消息
    addMessage({ role: 'parent', text });

    const currentStep = step;

    setTimeout(() => {
      if (currentStep === 'lesson') {
        // Step 1 → 道理收集完毕，追问角色
        dataRef.current.lesson = text;
        setStep('character');
        addAiMessage(
          `嗯嗯，「${text}」是很棒的道理呢～📝\n\n接下来：宝贝平时最喜欢什么角色呀？\n比如孙悟空、公主、小恐龙...也可以告诉我宝贝喜欢什么样的动物或者人物～`
        );
      } else if (currentStep === 'character') {
        // Step 2 → 角色收集，追问场景剧情
        if (SKIP_PATTERNS.test(text)) {
          const picked = pickRandom(CHARACTER_NAMES);
          dataRef.current.character = picked;
          addAiMessage(`好的，那我帮宝贝选了「${picked}」作为故事主角～🎭`);
        } else {
          dataRef.current.character = text;
          addAiMessage(`「${text}」收到！宝贝一定会喜欢的～💕`);
        }
        // 延迟发第二条
        setTimeout(() => {
          setStep('plot');
          addAiMessage(
            '最后一步：你希望这个故事发生在什么地方？发生什么样的事呢？\n\n比如"在森林里冒险"、"在海底交朋友"...\n\n如果没有特别的想法，交给我来自由发挥就好～🌟'
          );
        }, 600);
      } else if (currentStep === 'plot') {
        // Step 3 → 场景剧情收集
        if (SKIP_PATTERNS.test(text)) {
          dataRef.current.plot = '';
          addAiMessage('好的，我正在根据你提供的道理和角色，帮宝贝构思一个合适的故事大纲～📝');
        } else {
          dataRef.current.plot = text;
          addAiMessage('收到！我正在整理信息，为宝贝构思一个贴心的大纲～✨');
        }

        // 调用后端智能体生成大纲
        fetchOutline({
          lesson: dataRef.current.lesson,
          character: dataRef.current.character,
          plot: dataRef.current.plot,
        }).then((outline) => {
          if (outline) {
            // 用 AI 返回的结果更新 dataRef
            dataRef.current.lesson = outline.lesson;
            dataRef.current.character = outline.character;
            dataRef.current.plot = outline.plot;
          }
          setStep('confirm');
          const d = dataRef.current;
          addAiMessage('', {
            isSummary: true,
            summary: {
              lesson: d.lesson,
              character: d.character,
              plot: d.plot,
            },
          });
          addAiMessage(
            '请确认以上信息～\n如果没有问题，点击右上角「完成」开始生成故事！\n如果有需要修改的地方，直接告诉我哪里要调整就好～'
          );
          setSending(false);
        }).catch(() => {
          // API 失败 → 降级使用本地数据
          setStep('confirm');
          const d = dataRef.current;
          addAiMessage('', {
            isSummary: true,
            summary: {
              lesson: d.lesson,
              character: d.character,
              plot: d.plot || '一段有趣的冒险故事',
            },
          });
          addAiMessage(
            '请确认以上信息～\n如果没有问题，点击右上角「完成」开始生成故事！\n如果有需要修改的地方，直接告诉我哪里要调整就好～'
          );
          setSending(false);
        });
        return; // 不执行后面的 setSending(false)
      } else if (currentStep === 'confirm') {
        // 确认阶段 → 判断是确认还是修改
        if (isConfirm(text)) {
          dataRef.current.confirmed = true;
          addAiMessage('太棒了！点击右上角「完成」按钮，我就开始为宝贝创作故事啦～🎉');
        } else {
          // 视为修改请求 → 调用智能体重新生成
          addAiMessage('好的，我根据你的意见重新调整大纲～💡');
          fetchOutline({
            lesson: dataRef.current.lesson,
            character: dataRef.current.character,
            plot: dataRef.current.plot,
            feedback: text,
          }).then((outline) => {
            if (outline) {
              dataRef.current.lesson = outline.lesson;
              dataRef.current.character = outline.character;
              dataRef.current.plot = outline.plot;
            }
            addAiMessage('已根据你的意见更新：');
            const d = dataRef.current;
            addAiMessage('', {
              isSummary: true,
              summary: { lesson: d.lesson, character: d.character, plot: d.plot },
            });
            addAiMessage('确认无误的话，点击右上角「完成」开始生成；还有想改的继续告诉我就好～');
            setSending(false);
          }).catch(() => {
            addAiMessage('大纲调整暂时遇到问题，请再试一次～');
            setSending(false);
          });
          return; // 不执行后面的 setSending(false)
        }
      }
      setSending(false);
    }, 400);
  }, [input, step, sending, addMessage, addAiMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  const canComplete = step === 'confirm' && !generating;

  return (
    <div
      className="h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: `url('/家长创作中心背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Toast 通知 */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-base font-medium shadow-lg animate-toast-in"
          style={{
            background: 'rgba(129,199,132,0.95)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
          }}
        >
          {toast}
        </div>
      )}

      {/* 导航栏 */}
      <header
        className="relative z-10 flex items-center justify-between px-3 py-3"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm">返回</span>
        </button>

        <span className="text-white font-semibold text-lg tracking-wide">
          为宝贝写故事
        </span>

        <button
          className="text-sm px-5 py-2 rounded-full font-semibold transition-all"
          style={
            canComplete
              ? {
                  background: 'rgba(232,197,80,0.8)',
                  color: '#333',
                  border: '1px solid rgba(232,197,80,0.6)',
                }
              : {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'not-allowed',
                }
          }
          disabled={!canComplete}
          onClick={() => {
            if (canComplete && !generating) {
              startGeneration();
            }
          }}
        >
          {generating ? `生成中 ${genProgress}%` : '完成'}
        </button>
      </header>

      {/* 对话区域 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="w-full flex flex-col gap-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {sending && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(129,199,132,0.3)', border: '2px solid rgba(129,199,132,0.5)' }}>
                🧚
              </div>
              <div className="flex gap-1.5 items-center px-5 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.85)', borderTopLeftRadius: '4px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: '#bbb', animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: '#bbb', animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: '#bbb', animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          {generating && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(129,199,132,0.3)', border: '2px solid rgba(129,199,132,0.5)' }}>
                🧚
              </div>
              <div className="px-5 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.85)', borderTopLeftRadius: '4px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{genMessage}</p>
                <div className="mt-2 w-full h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${genProgress}%`,
                      background: 'linear-gradient(90deg, #81c784, #e8c550)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部输入栏 */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
      >
        {/* 麦克风按钮 */}
        <button
          onClick={toggleVoice}
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isListening
              ? 'rgba(244,67,54,0.6)'
              : 'rgba(255,255,255,0.12)',
          }}
        >
          {isListening ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white/70" />
          )}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening ? '正在聆听...' : '输入你的想法...'
          }
          disabled={sending}
          className="flex-1 px-5 py-3 rounded-full outline-none text-base"
          style={{ background: 'rgba(255,255,255,0.7)', color: '#1a1a1a' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
          style={{ background: 'rgba(232,197,80,0.7)' }}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === 'ai';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`flex gap-2 ${isAI || isSystem ? 'flex-row' : 'flex-row-reverse'}`}
      style={{ animation: 'fadeInUpMsg 0.35s ease-out both' }}
    >
      {/* 头像 */}
      <div
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
        style={{
          background: isAI || isSystem ? 'rgba(129,199,132,0.3)' : 'rgba(255,183,77,0.3)',
          border: isAI || isSystem ? '2px solid rgba(129,199,132,0.5)' : '2px solid rgba(255,183,77,0.5)',
        }}
      >
        {isAI || isSystem ? '🧚' : '👩'}
      </div>

      {/* 内容区 */}
      <div className="max-w-[92%]">
        {message.isSummary && message.summary ? (
          <SummaryCard summary={message.summary} />
        ) : (
          <div
            className="px-5 py-3 rounded-2xl text-base leading-relaxed whitespace-pre-wrap"
            style={
              isSystem
                ? {
                    background: 'rgba(129,199,132,0.15)',
                    color: '#555',
                    borderTopLeftRadius: '4px',
                    border: '1px dashed rgba(129,199,132,0.3)',
                  }
                : isAI
                ? {
                    background: 'rgba(255,255,255,0.85)',
                    color: '#1a1a1a',
                    borderTopLeftRadius: '4px',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                  }
                : {
                    background: 'rgba(232,197,80,0.5)',
                    color: '#1a1a1a',
                    borderTopRightRadius: '4px',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                  }
            }
          >
            {message.text}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUpMsg {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-toast-in {
          animation: toastIn 0.3s ease-out, toastIn 0.3s ease-out 2.2s reverse forwards;
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ summary }: { summary: { lesson: string; character: string; plot: string } }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1.5px solid rgba(232,197,80,0.4)',
        borderTopLeftRadius: '4px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <div className="px-5 py-3" style={{ background: 'rgba(232,197,80,0.25)' }}>
        <span className="text-base font-semibold" style={{ color: '#8b6914' }}>
          📋 故事创作确认
        </span>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3 text-base" style={{ color: '#1a1a1a' }}>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 text-lg">🎯</span>
          <div>
            <span className="text-xs" style={{ color: '#999' }}>道理</span>
            <p className="text-base font-medium">{summary.lesson}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 text-lg">🧸</span>
          <div>
            <span className="text-xs" style={{ color: '#999' }}>角色</span>
            <p className="text-base font-medium">{summary.character}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 text-lg">🏞️</span>
          <div>
            <span className="text-xs" style={{ color: '#999' }}>场景 & 剧情</span>
            <p className="text-base font-medium">{summary.plot}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
