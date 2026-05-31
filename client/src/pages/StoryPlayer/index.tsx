import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  audioUrl: string;
}

interface Story {
  _id: string;
  title: string;
  status: string;
  pages: StoryPage[];
}

interface SentenceItem {
  text: string;
  pageIdx: number;
  globalIdx: number;
}

// 通过 Vite proxy 代理 API 和静态资源，避免硬编码地址

const splitSentences = (text: string): string[] => {
  if (!text?.trim()) return [];
  return text
    .split(/(?<=[。！？；，])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

export default function StoryPlayer() {
  const { id } = useParams<{ id: string }>();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [flipPhase, setFlipPhase] = useState<'idle' | 'flipping' | 'crossfading'>('idle');
  const [flipProgress, setFlipProgress] = useState(0);
  const [crossfadeProgress, setCrossfadeProgress] = useState(0);
  const [storyComplete, setStoryComplete] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromParam = searchParams.get('from');
  const hideSave = fromParam === 'storybox' || fromParam === 'saved';

  const handleBack = useCallback(() => {
    if (fromParam === 'storybox') navigate('/story-box');
    else if (fromParam === 'saved') navigate('/saved');
    else navigate('/features');
  }, [fromParam, navigate]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevSentIdxRef = useRef(0);
  const isFlippingRef = useRef(false);
  const flipDisplayPageRef = useRef<StoryPage | null>(null);

  useEffect(() => {
    if (!id) return;
    setPageIndex(0);
    setSentenceIndex(0);
    setStoryComplete(false);
    setAudioReady(false);
    setAudioProgress(0);
    setIsPlaying(false);
    setAudioError(false);
    setFlipPhase('idle');
    setFlipProgress(0);
    setLoading(true);
    fetch(`/api/stories/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setStory(data.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 所有句子（跨所有页）
  const allSentences = useMemo<SentenceItem[]>(() => {
    if (!story?.pages?.length) return [];
    let globalIdx = 0;
    return story.pages.flatMap((page, pageIdx) => {
      const sentences = splitSentences(page.text);
      return sentences.map(text => ({
        text,
        pageIdx,
        globalIdx: globalIdx++,
      }));
    });
  }, [story]);

  // 每页内逐句的结束比例（加权字符数，标点符号计入停顿，使同步更精准）
  const pageSentenceBoundaries = useMemo(() => {
    if (!story?.pages?.length) return [] as number[][];
    const pauseWeight = (ch: string) => /[。！？]/.test(ch) ? 3 : /[，；：]/.test(ch) ? 2 : 1;
    return story.pages.map(page => {
      const sentences = splitSentences(page.text);
      const weights = sentences.map(s => [...s].reduce((sum, ch) => sum + pauseWeight(ch), 0));
      const total = weights.reduce((s, w) => s + w, 0);
      if (total === 0) return [] as number[];
      let cum = 0;
      return weights.map(w => { cum += w; return cum / total; });
    });
  }, [story]);

  // 按页累积的起始句子序号
  const pageSentenceOffsets = useMemo(() => {
    if (!story?.pages?.length) return [] as number[];
    const offsets: number[] = [];
    let offset = 0;
    for (const page of story.pages) {
      offsets.push(offset);
      offset += splitSentences(page.text).length;
    }
    return offsets;
  }, [story]);

  // 优雅降级：缺失配图的页面继承最近有效配图
  const effectivePages = useMemo(() => {
    if (!story?.pages?.length) return [];
    const res = story.pages.map(p => ({ ...p }));
    // 正向填充：无图页继承上一页
    for (let i = 1; i < res.length; i++) {
      if (!res[i].illustrationUrl) {
        res[i].illustrationUrl = res[i - 1].illustrationUrl;
      }
    }
    // 反向填充：第一页也无图则继承下一页
    for (let i = res.length - 2; i >= 0; i--) {
      if (!res[i].illustrationUrl && res[i + 1].illustrationUrl) {
        res[i].illustrationUrl = res[i + 1].illustrationUrl;
      }
    }
    return res;
  }, [story]);

  // 检测是否为单音频模式（所有页共用同一音频文件 — 后端全文一次 TTS）
  const isSingleAudio = useMemo(() => {
    if (!story?.pages?.length || story.pages.length < 2) return true;
    const firstUrl = story.pages[0]?.audioUrl;
    if (!firstUrl) return false;
    return story.pages.every(p => p.audioUrl === firstUrl);
  }, [story]);

  // 全局页面边界进度 [0-1]（单音频模式下驱动翻页）
  const globalPageBoundaries = useMemo(() => {
    if (!story?.pages?.length) return [] as number[];
    const pauseWeight = (ch: string) => /[。！？]/.test(ch) ? 3 : /[，；：]/.test(ch) ? 2 : 1;
    const pageWeights = story.pages.map(page =>
      [...(page.text || '')].reduce((sum, ch) => sum + pauseWeight(ch), 0)
    );
    const total = pageWeights.reduce((s, w) => s + w, 0);
    if (total === 0) return [] as number[];
    let cum = 0;
    return pageWeights.map(w => { cum += w; return cum / total; });
  }, [story]);

  const triggerPageFlip = useCallback(async () => {
    if (!story || isFlippingRef.current) return;
    const lastIdx = effectivePages.length - 1;
    if (pageIndex >= lastIdx) {
      setStoryComplete(true);
      return;
    }
    isFlippingRef.current = true;
    const nextIdx = pageIndex + 1;
    const nextPageData = effectivePages[nextIdx];

    // 预解码下一页图片（GPU 纹理解码），避免翻页后首帧卡顿
    if (nextPageData?.illustrationUrl) {
      try {
        const img = new Image();
        img.src = nextPageData.illustrationUrl;
        await Promise.race([
          img.decode(),
          new Promise<void>(r => setTimeout(r, 2000)),
        ]);
      } catch { /* 超时或解码失败不阻塞翻页 */ }
    }

    // 预缓冲下一页音频（仅 legacy 多音频模式需要）
    if (!isSingleAudio && nextPageData?.audioUrl) {
      try {
        const preloadAudio = new Audio(nextPageData.audioUrl);
        preloadAudio.preload = 'auto';
      } catch { /* 预加载失败不影响播放 */ }
    }

    flipDisplayPageRef.current = effectivePages[pageIndex];
    setFlipPhase('flipping');
    setFlipProgress(0);
    const start = performance.now();
    const duration = 600;

    const animate = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / duration, 1);
      const eased = raw < 0.5
        ? 2 * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      setFlipProgress(eased);

      if (raw < 1) {
        requestAnimationFrame(animate);
      } else {
        // 翻页动画结束 → 更新 pageIndex → 启动 crossfade
        setPageIndex(nextIdx);
        if (nextIdx < pageSentenceOffsets.length) {
          setSentenceIndex(pageSentenceOffsets[nextIdx]);
          prevSentIdxRef.current = pageSentenceOffsets[nextIdx];
        }
        setFlipPhase('crossfading');
        setFlipProgress(0);

        const cfDuration = 150;
        const cfStart = performance.now();
        const cfAnimate = (now2: number) => {
          const cfRaw = Math.min((now2 - cfStart) / cfDuration, 1);
          setCrossfadeProgress(cfRaw);
          if (cfRaw < 1) {
            requestAnimationFrame(cfAnimate);
          } else {
            setFlipPhase('idle');
            setCrossfadeProgress(0);
            isFlippingRef.current = false;
            flipDisplayPageRef.current = null;
          }
        };
        requestAnimationFrame(cfAnimate);
      }
    };

    requestAnimationFrame(animate);
  }, [story, pageIndex, pageSentenceOffsets, effectivePages]);

  // 音频时间追踪 — 句子同步 + 翻页检测（单音频模式由时间驱动翻页）
  useEffect(() => {
    if (!audioRef.current || !audioReady || storyComplete) return;

    const audio = audioRef.current;
    let lastPageIdx = pageIndex;

    const tick = () => {
      if (!audio.duration || audio.paused) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const globalProgress = audio.currentTime / audio.duration;
      setAudioProgress(globalProgress);

      if (isSingleAudio && globalPageBoundaries.length > 0) {
        // 全局进度 → 定位当前页
        let currentPageIdx = 0;
        for (let i = 0; i < globalPageBoundaries.length; i++) {
          if (globalProgress < globalPageBoundaries[i]) {
            currentPageIdx = i;
            break;
          }
        }
        const lastBoundary = globalPageBoundaries[globalPageBoundaries.length - 1] || 1;
        if (globalProgress >= lastBoundary) {
          currentPageIdx = globalPageBoundaries.length - 1;
        }

        // 跨越页面边界 → 触发翻页
        if (currentPageIdx > lastPageIdx && !isFlippingRef.current) {
          lastPageIdx = currentPageIdx;
          triggerPageFlip();
        }

        // 当前页内进度 → 句子定位
        const pageStart = currentPageIdx > 0 ? globalPageBoundaries[currentPageIdx - 1] : 0;
        const pageEnd = globalPageBoundaries[currentPageIdx] || 1;
        const pageProgress = pageEnd > pageStart
          ? (globalProgress - pageStart) / (pageEnd - pageStart)
          : 0;

        const boundaries = pageSentenceBoundaries[currentPageIdx] || [];
        if (boundaries.length > 0) {
          const leadProgress = Math.min(pageProgress + 0.01, 1);
          let localIdx = boundaries.findIndex(b => leadProgress < b);
          if (localIdx === -1) localIdx = boundaries.length - 1;
          const globalIdx = (pageSentenceOffsets[currentPageIdx] || 0) + localIdx;
          if (globalIdx !== prevSentIdxRef.current) {
            prevSentIdxRef.current = globalIdx;
            setSentenceIndex(globalIdx);
          }
        }
      } else {
        // Legacy: 每页独立音频
        const boundaries = pageSentenceBoundaries[pageIndex] || [];
        if (boundaries.length > 0) {
          const leadProgress = Math.min(globalProgress + 0.01, 1);
          let localIdx = boundaries.findIndex(b => leadProgress < b);
          if (localIdx === -1) localIdx = boundaries.length - 1;
          const globalIdx = (pageSentenceOffsets[pageIndex] || 0) + localIdx;
          if (globalIdx !== prevSentIdxRef.current) {
            prevSentIdxRef.current = globalIdx;
            setSentenceIndex(globalIdx);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioReady, isSingleAudio, globalPageBoundaries, pageSentenceBoundaries, pageSentenceOffsets, pageIndex, storyComplete, triggerPageFlip]);

  // 音频加载 — 单音频模式（全文一次 TTS）
  useEffect(() => {
    if (!isSingleAudio || !effectivePages.length) return;
    const firstPage = effectivePages[0];
    if (!firstPage?.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setAudioReady(false);
    setAudioError(false);
    prevSentIdxRef.current = 0;
    audioIdRef.current += 1;
    const currentAudioId = audioIdRef.current;

    const audio = new Audio(`${firstPage.audioUrl}`);
    audio.preload = 'auto';

    const onReady = () => { if (audioIdRef.current === currentAudioId) setAudioReady(true); };
    const onPlay = () => { if (audioIdRef.current === currentAudioId) setIsPlaying(true); };
    const onPause = () => { if (audioIdRef.current === currentAudioId) setIsPlaying(false); };
    const onEnded = () => {
      if (audioIdRef.current !== currentAudioId) return;
      setIsPlaying(false);
      setStoryComplete(true);
    };
    const onError = () => {
      if (audioIdRef.current !== currentAudioId) return;
      setAudioReady(false);
      setIsPlaying(false);
      setAudioError(true);
    };

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, [story, isSingleAudio]); // 不依赖 pageIndex — 一个 Audio 贯穿全部页

  // 音频加载 — Legacy 模式（每页独立音频）
  useEffect(() => {
    if (isSingleAudio || !effectivePages.length) return;
    const page = effectivePages[pageIndex];
    if (!page?.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setAudioReady(false);
    setAudioError(false);
    prevSentIdxRef.current = pageSentenceOffsets[pageIndex] || 0;
    audioIdRef.current += 1;
    const currentAudioId = audioIdRef.current;

    const audio = new Audio(`${page.audioUrl}`);
    audio.preload = 'auto';

    const onReady = () => { if (audioIdRef.current === currentAudioId) setAudioReady(true); };
    const onPlay = () => { if (audioIdRef.current === currentAudioId) setIsPlaying(true); };
    const onPause = () => { if (audioIdRef.current === currentAudioId) setIsPlaying(false); };
    const onEnded = () => {
      if (audioIdRef.current !== currentAudioId) return;
      if (pageIndex < effectivePages.length - 1) {
        triggerPageFlip();
      } else {
        setIsPlaying(false);
        setStoryComplete(true);
      }
    };
    const onError = () => {
      if (audioIdRef.current !== currentAudioId) return;
      setAudioReady(false);
      setIsPlaying(false);
      setAudioError(true);
    };

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, [story, pageIndex, isSingleAudio, pageSentenceOffsets, effectivePages, triggerPageFlip]);

  // 自动播放
  useEffect(() => {
    if (audioReady && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioReady]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  };

  // 预加载下一页图片，减少翻页闪烁
  useEffect(() => {
    if (!effectivePages.length || pageIndex >= effectivePages.length - 1) return;
    const next = effectivePages[pageIndex + 1];
    if (next?.illustrationUrl) {
      const img = new Image();
      img.src = next.illustrationUrl;
    }
  }, [pageIndex, effectivePages]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1a1a2e]">
        <p className="text-white text-xl font-bold">加载故事中...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1a1a2e]">
        <p className="text-white text-xl font-bold">故事未找到</p>
      </div>
    );
  }

  const pages = effectivePages;
  const currentPage = pages[pageIndex];
  const nextPage = pageIndex < pages.length - 1 ? pages[pageIndex + 1] : null;
  const duration = audioRef.current?.duration || 0;
  const currentTime = audioRef.current?.currentTime || 0;
  const pageCount = pages.length || 1;
  const globalProgress = (pageIndex + audioProgress) / pageCount;

  // 上槽固定放偶数索引句，下槽固定放奇数索引句，说完即换
  const upperIdx = sentenceIndex % 2 === 0
    ? sentenceIndex
    : Math.min(sentenceIndex + 1, allSentences.length - 1);
  const lowerIdx = sentenceIndex % 2 === 1
    ? sentenceIndex
    : Math.min(sentenceIndex + 1, allSentences.length - 1);

  const upperSentence = allSentences[upperIdx] || null;
  const lowerSentence = (upperIdx !== lowerIdx && lowerIdx < allSentences.length)
    ? allSentences[lowerIdx]
    : null;

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: '#0a0a12' }} onClick={togglePlay}>
      {/* 歌词入场动画 + 翻页动画 + 移动端适配 */}
      <style>{`
        @keyframes lyricIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .subtitle-upper { transform: translateX(-20%); min-height: 2rem; }
        .subtitle-lower { transform: translateX(20%); min-height: 2rem; }
        @media (min-width: 768px) {
          .subtitle-upper { transform: translateX(-60%); min-height: 2.5rem; }
          .subtitle-lower { transform: translateX(60%); min-height: 2.5rem; }
        }
        @media (orientation: landscape) and (max-height: 500px) {
          .subtitle-upper, .subtitle-lower { min-height: 1.2rem !important; }
          .subtitle-upper { transform: translateX(-25%) !important; }
          .subtitle-lower { transform: translateX(25%) !important; }
        }
      `}</style>

      {/* 背景层：下一页的图片（翻页/crossfade 期间不显示，避免与新页叠加闪烁） */}
      {nextPage?.illustrationUrl && flipPhase === 'idle' && (
        <img
          src={`${nextPage.illustrationUrl}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 0.25,
            filter: 'brightness(0.5)',
          }}
        />
      )}
      {nextPage?.illustrationUrl && flipPhase === 'flipping' && (
        <img
          src={`${nextPage.illustrationUrl}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 1,
            filter: 'brightness(0.5)',
          }}
        />
      )}

      {/* 左上角返回键 */}
      <div
        className="absolute top-6 left-6 z-30 bg-black/30 backdrop-blur rounded-full p-3 pointer-events-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          handleBack();
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </div>

      {/* 非播放状态 — 居中大播放键 / 音频错误（翻页/crossfade 期间不显示） */}
      {!isPlaying && !storyComplete && flipPhase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          {audioError ? (
            <div className="flex flex-col items-center gap-4 pointer-events-auto">
              <p className="text-white text-lg font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                音频加载失败
              </p>
              <button
                className="bg-white/20 backdrop-blur rounded-full px-6 py-3 text-white font-semibold cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setAudioError(false);
                  if (audioRef.current) {
                    audioRef.current.load();
                  }
                }}
              >
                重新加载
              </button>
            </div>
          ) : (
            <div
              className="bg-black/30 backdrop-blur rounded-full pointer-events-auto cursor-pointer"
              style={{ padding: '24px' }}
              onClick={(e) => {
                e.stopPropagation();
                audioRef.current?.play().catch(console.error);
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 当前页 —— 左半不动，右半Y轴书页翻转 */}
      <div className="absolute inset-0" style={{ perspective: '1200px' }}>
        {(() => {
          const displayPage = flipDisplayPageRef.current || currentPage;
          if (!displayPage?.illustrationUrl) return null;
          return (
            <>
              {/* 左半页 - 静态 */}
              <div className="absolute top-0 left-0 bottom-0 w-1/2 overflow-hidden">
                <img
                  src={`${displayPage.illustrationUrl}`}
                  alt=""
                  className="absolute top-0 left-0 h-full w-[100vw] max-w-none"
                />
              </div>

              {/* 右半页 - 绕书脊(左边缘) Y轴旋转 */}
              <div
                className="absolute top-0 right-0 bottom-0 w-1/2 overflow-hidden"
                style={{
                  transformOrigin: 'left center',
                  transform: flipPhase === 'flipping'
                    ? `rotateY(${-160 * flipProgress}deg)`
                    : 'rotateY(0deg)',
                  backfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={`${displayPage.illustrationUrl}`}
                  alt=""
                  className="absolute top-0 right-0 h-full w-[100vw] max-w-none"
                />
              </div>
            </>
          );
        })()}

        {/* 书脊阴影 — 翻转时左侧渐变 */}
        {flipPhase === 'flipping' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, rgba(0,0,0,${0.5 * Math.sin(flipProgress * Math.PI)}) 0%, transparent 35%)`,
            }}
          />
        )}

        {/* crossfade 覆盖层：翻页动画结束后，新页淡入 */}
        {flipPhase === 'crossfading' && currentPage?.illustrationUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: crossfadeProgress }}
          >
            <img
              src={`${currentPage.illustrationUrl}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* ===== 进度条 ===== */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
        style={{ bottom: '0%', zIndex: 20 }}
      >
        <div className="w-full max-w-md flex items-center gap-3" style={{ padding: '0 8%' }}>
          <span className="text-white text-xs font-bold font-mono w-10 text-right">
            {fmtTime(currentTime)}
          </span>
          <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${globalProgress * 100}%`,
                background: 'linear-gradient(90deg, rgba(255,220,180,0.8), rgba(255,255,255,0.9))',
                boxShadow: '0 0 6px rgba(255,220,180,0.5)',
              }}
            />
          </div>
          <button
            className="pointer-events-auto text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="text-white/80 text-xs font-bold font-mono w-10 text-left">
            {fmtTime(duration)}
          </span>
        </div>
      </div>

      {/* ===== 酷狗歌词式文字区域 ===== */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end pointer-events-none"
        style={{ top: '80%', bottom: '2%', zIndex: 20 }}
      >

        {/* 歌词 — 左上当前句 + 右下下一句，两句同等清晰 */}
        <div className="w-full max-w-2xl flex flex-col gap-3 md:gap-4 subtitle-container" style={{ padding: '0 4%' }}>
          {/* 上行 — 偶数句槽位，靠左 */}
          <div className="flex justify-start subtitle-upper">
            {upperSentence && (
              <p
                key={`up-${upperSentence.globalIdx}`}
                className="text-white max-w-[85vw] md:max-w-none overflow-hidden text-ellipsis"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(0.875rem, 3.5vw, 1.5rem)',
                  fontWeight: 900,
                  textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6)',
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
                  borderRadius: '14px',
                  padding: '8px 14px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  letterSpacing: '0.02em',
                  animation: 'lyricIn 0.45s ease-out',
                }}
              >
                {upperSentence.text}
              </p>
            )}
          </div>

          {/* 下行 — 奇数句槽位，靠右 */}
          <div className="flex justify-end subtitle-lower">
            {lowerSentence && (
              <p
                key={`lo-${lowerSentence.globalIdx}`}
                className="text-white max-w-[85vw] md:max-w-none overflow-hidden text-ellipsis"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(0.875rem, 3.5vw, 1.5rem)',
                  fontWeight: 900,
                  textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6)',
                  background: 'linear-gradient(225deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
                  borderRadius: '14px',
                  padding: '8px 14px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  letterSpacing: '0.02em',
                  animation: 'lyricIn 0.45s ease-out',
                }}
              >
                {lowerSentence.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 完成状态 ===== */}
      {storyComplete && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          {!hideSave && (
            <button
              className="absolute top-6 right-6 px-5 py-2 text-white font-semibold rounded-full pointer-events-auto cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const savedStories = JSON.parse(localStorage.getItem('saved_stories') || '[]');
                  const exists = savedStories.some((s: any) => s._id === story._id);
                  if (!exists) {
                    savedStories.unshift({ ...story, savedAt: Date.now() });
                    try {
                      localStorage.setItem('saved_stories', JSON.stringify(savedStories));
                    } catch {
                      // 容量不足时移除最旧的故事后重试
                      savedStories.pop();
                      try { localStorage.setItem('saved_stories', JSON.stringify(savedStories)); } catch {}
                    }
                  }
                } catch {}
                navigate('/saved');
              }}
            >
              保存
            </button>
          )}
          <p className="text-white text-2xl font-bold" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            故事结束
          </p>
          {/* 居中大播放键 — 重播 */}
          <div
            className="bg-black/30 backdrop-blur rounded-full pointer-events-auto cursor-pointer"
            style={{ padding: '24px' }}
            onClick={(e) => {
              e.stopPropagation();
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(console.error);
              }
              setStoryComplete(false);
              setFlipPhase('idle');
              setSentenceIndex(0);
              setPageIndex(0);
              prevSentIdxRef.current = 0;
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
