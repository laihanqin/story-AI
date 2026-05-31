import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessHeaders } from '@shared/services/access';
import { getCharacterImg } from '@shared/constants/characters';

interface StoryCard {
  _id: string;
  title: string;
  coverUrl: string;
  character: string;
  characterImg: string;
}

const CARDS_PER_PAGE = 5;

export default function SavedStories() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'mine' | 'baby'>('mine');
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [babyStories, setBabyStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [babyLoading, setBabyLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const mapStories = (list: any[]): StoryCard[] =>
    list.map((s: any) => {
      const character = s.character || '';
      const coverUrl = s.coverUrl || s.pages?.[0]?.illustrationUrl || s.pages?.[0]?.illustration_url || getCharacterImg(character) || '';
      return {
        _id: s._id,
        title: s.title || '未命名故事',
        coverUrl,
        character,
        characterImg: getCharacterImg(character),
      };
    });

  // 我的故事集：合并 localStorage + API (ai_create)
  useEffect(() => {
    let localStories: StoryCard[] = [];
    try { localStories = mapStories(JSON.parse(localStorage.getItem('saved_stories') || '[]')); } catch {}

    fetch('/api/stories', { headers: getAccessHeaders() })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.length > 0) {
          const aiStories = mapStories(json.data.filter((s: any) => s.type === 'ai_create'));
          const ids = new Set(localStories.map(s => s._id));
          setStories([...localStories, ...aiStories.filter(s => !ids.has(s._id))]);
        } else {
          setStories(localStories);
        }
      })
      .catch(() => setStories(localStories))
      .finally(() => setLoading(false));
  }, []);

  // 宝贝故事集：从 API 拉取 parent_create
  useEffect(() => {
    if (mode !== 'baby') return;
    if (babyStories.length > 0) return;
    setBabyLoading(true);

    fetch('/api/stories', { headers: getAccessHeaders() })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.length > 0) {
          setBabyStories(mapStories(json.data.filter((s: any) => s.type === 'parent_create')));
        }
      })
      .catch(() => {})
      .finally(() => setBabyLoading(false));
  }, [mode, babyStories.length]);

  const activeStories = mode === 'baby' ? babyStories : stories;
  const totalPages = Math.max(1, Math.ceil(activeStories.length / CARDS_PER_PAGE));
  const currentCards = activeStories.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  useEffect(() => { setPage(0); }, [mode]);

  const goPrev = () => {
    if (totalPages <= 1) return;
    setPage(p => (p - 1 + totalPages) % totalPages);
    setHoveredIdx(null);
  };

  const goNext = () => {
    if (totalPages <= 1) return;
    setPage(p => (p + 1) % totalPages);
    setHoveredIdx(null);
  };

  const getCardScale = (cardIdx: number): number => {
    if (hoveredIdx === null) return 1;
    const dist = Math.abs(cardIdx - hoveredIdx);
    if (dist === 0) return 1.18;
    if (dist === 1) return 0.95;
    return 0.82;
  };

  const openStory = (id: string) => {
    navigate(`/story/${id}?from=saved`);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        backgroundImage: `url('/故事界面背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 返回键 */}
      <button
        onClick={() => navigate('/features')}
        className="saved-return-btn absolute top-6 left-6 z-20 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
        aria-label="返回功能选择"
      >
        <img src="/返回键.png" alt="返回" className="w-28 h-28 object-contain" />
      </button>

      {/* 居中面板 */}
      <div className="flex-1 relative w-full flex flex-col items-center justify-center">
        <div className="relative w-full flex flex-col items-center justify-center" style={{ height: '66.67vh', width: '100%' }}>
          {/* 面板背景图（独立裁剪层） */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="/故事界面-居中面板.png"
              alt=""
              className="absolute inset-0 w-full h-full object-fill pointer-events-none panel-bg-img"
              style={{ transform: 'scale(2.16) translateY(10%)' }}
              draggable={false}
            />
          </div>

          {/* 内容层（不受 overflow 影响） */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4">
            {/* 标题 - 始终显示 */}
            <h1
              className="saved-title mb-4 font-bold tracking-wider"
              style={{
                color: '#e8c550',
                fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
                transform: 'translateY(-120%)',
              }}
            >
              {mode === 'baby' ? '宝贝故事集' : '我的故事集'}
            </h1>

            {/* 空状态 */}
            {activeStories.length === 0 ? (
              <div className="saved-empty-text flex flex-col items-center gap-6">
                {(loading || babyLoading) ? (
                  <p
                    className="text-white/60 text-xl"
                    style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
                  >
                    正在加载...
                  </p>
                ) : mode === 'baby' ? (
                  <>
                    <p
                      className="text-white/60 text-xl"
                      style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
                    >
                      还没有家长为你写的故事哦~
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="text-white/60 text-xl"
                      style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
                    >
                      还没有故事哦~
                    </p>
                    <button
                      onClick={() => navigate('/parent-center')}
                      className="px-8 py-3 rounded-full text-white font-semibold text-lg transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                    >
                      去家长中心创作故事
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* 故事卡片区：箭头独立 + 卡片区独立 */}
                <div className="relative w-full">
                  {/* 左箭头 - 独立定位 */}
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                    style={{ left: '0%', opacity: totalPages > 1 ? 1 : 0.2, pointerEvents: totalPages > 1 ? 'auto' : 'none' }}
                    aria-label="上一页"
                  >
                    <img src="/故事宝盒界面-向左.png" alt="上一页" className="w-28 h-28 object-contain" />
                  </button>

                  {/* 右箭头 - 独立定位 */}
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                    style={{ right: '0%', opacity: totalPages > 1 ? 1 : 0.2, pointerEvents: totalPages > 1 ? 'auto' : 'none' }}
                    aria-label="下一页"
                  >
                    <img src="/故事宝盒界面-向右.png" alt="下一页" className="w-28 h-28 object-contain" />
                  </button>

                  {/* 半透明黑底 - 独立背景层 */}
                  <div
                    className="absolute top-1/2 pointer-events-none"
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      width: 'calc(100% + 2rem)',
                      height: '129%',
                      left: '-1rem',
                      transform: 'translateY(-35%)',
                    }}
                  />

                  {/* 卡片列表 - 独立层 */}
                  <div
                    className="story-cards-container flex items-end justify-evenly py-3 px-2 mx-auto"
                    style={{ perspective: '800px', width: '70%', transform: 'translateX(-8%) translateY(10%)', gap: '7rem' }}
                  >
                    {currentCards.map((story, i) => {
                      const scale = getCardScale(i);
                      const zIdx = hoveredIdx === i ? 20 : 10 - Math.abs((hoveredIdx ?? 2) - i);

                      return (
                        <div
                          key={story._id}
                          className="flex-shrink-0 cursor-pointer transition-all duration-300 ease-out flex flex-col items-center"
                          style={{
                            width: '16%',
                            transform: `scale(${scale})`,
                            zIndex: zIdx,
                            filter: hoveredIdx !== null && hoveredIdx !== i
                              ? 'brightness(0.6)'
                              : 'brightness(1)',
                          }}
                          onMouseEnter={() => setHoveredIdx(i)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          onClick={() => openStory(story._id)}
                        >
                          <div className="w-full" style={{ aspectRatio: '2/3' }}>
                            {story.coverUrl ? (
                              <img
                                src={story.coverUrl}
                                alt={story.title}
                                className="w-full h-full object-cover rounded-lg shadow-xl"
                                style={{
                                  boxShadow: hoveredIdx === i
                                    ? '0 8px 30px rgba(232,197,80,0.4)'
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                                }}
                                draggable={false}
                                onError={(e) => {
                                  const fallback = story.characterImg;
                                  if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                                    (e.target as HTMLImageElement).src = fallback;
                                  }
                                }}
                              />
                            ) : story.characterImg ? (
                              <img
                                src={story.characterImg}
                                alt={story.character}
                                className="w-full h-full object-contain rounded-lg"
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  boxShadow: hoveredIdx === i
                                    ? '0 8px 30px rgba(232,197,80,0.4)'
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                                }}
                                draggable={false}
                              />
                            ) : (
                              <div
                                className="w-full h-full rounded-lg flex items-center justify-center text-3xl"
                                style={{ background: 'rgba(255,255,255,0.1)' }}
                              >
                                📖
                              </div>
                            )}
                          </div>
                          <p
                            className="text-center mt-1.5 text-base font-bold w-full leading-tight"
                            style={{
                              color: '#e8c550',
                              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                              fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
                            }}
                          >
                            {story.title}
                          </p>
                        </div>
                      );
                    })}

                    {/* 不足5个时占位保持布局 */}
                    {Array.from({ length: CARDS_PER_PAGE - currentCards.length }).map((_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className="flex-shrink-0 flex flex-col items-center"
                        style={{ width: '16%', visibility: 'hidden' }}
                      >
                        <div className="w-full" style={{ aspectRatio: '2/3' }} />
                        <p className="mt-1.5 text-xs">&nbsp;</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 页码指示器 */}
                {totalPages > 1 && (
                  <div className="page-dots flex gap-2 mt-3" style={{ transform: 'translateY(455%)' }}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: i === page ? 16 : 8,
                          height: 8,
                          background: i === page ? 'rgba(232,197,80,0.5)' : 'rgba(255,255,255,0.15)',
                        }}
                      />
                    ))}
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px), (orientation: landscape) and (max-height: 500px) {
          .story-cards-container {
            width: 94% !important;
            gap: 0.6rem !important;
            transform: translateX(0%) translateY(5%) !important;
            padding-left: 2px !important;
            padding-right: 2px !important;
          }
          .story-cards-container > div[style] {
            width: 28% !important;
          }
          .story-cards-container img[alt="上一页"],
          .story-cards-container img[alt="下一页"] {
            width: 56px !important;
            height: 56px !important;
          }
          .panel-bg-img { transform: scale(1.6) translateY(5%) !important; }
          .saved-return-btn img {
            width: 72px !important;
            height: 72px !important;
          }
          .saved-tab-capsule span {
            font-size: 0.95rem !important;
          }
          .saved-tab-capsule {
            padding: 6px !important;
          }
          .saved-empty-text {
            font-size: 1rem !important;
          }
          .saved-title {
            font-size: 1.2rem !important;
            transform: translateY(-30%) !important;
          }
          .page-dots {
            transform: translateY(300%) !important;
          }
        }
      `}</style>

      {/* 底部胶囊切换 */}
      <div className="flex justify-center pb-4 md:pb-8 pt-2">
        <button
          onClick={() => setMode(m => m === 'mine' ? 'baby' : 'mine')}
          className="saved-tab-capsule relative flex items-center rounded-full transition-colors duration-300"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            padding: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* 滑块背景 */}
          <div
            className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out"
            style={{
              background: 'rgba(232,197,80,0.3)',
              width: 'calc(50% - 4px)',
              left: mode === 'mine' ? '4px' : '50%',
              boxShadow: '0 0 12px rgba(232,197,80,0.3)',
            }}
          />
          {/* 我的故事集 */}
          <span
            className="relative z-10 px-6 py-2 text-base font-bold rounded-full transition-colors duration-300"
            style={{
              color: mode === 'mine' ? '#e8c550' : 'rgba(255,255,255,0.75)',
              fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
              textShadow: mode === 'mine' ? '0 0 8px rgba(232,197,80,0.4)' : 'none',
            }}
          >
            我的故事集
          </span>
          {/* 宝贝故事集 */}
          <span
            className="relative z-10 px-6 py-2 text-base font-bold rounded-full transition-colors duration-300"
            style={{
              color: mode === 'baby' ? '#e8c550' : 'rgba(255,255,255,0.75)',
              fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
              textShadow: mode === 'baby' ? '0 0 8px rgba(232,197,80,0.4)' : 'none',
            }}
          >
            宝贝故事集
          </span>
        </button>
      </div>

    </div>
  );
}
