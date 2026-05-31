import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessHeaders } from '@shared/services/access';

interface StoryBoxStory {
  _id: string;
  title: string;
  coverUrl: string;
  category: string;
}

const CATEGORIES = ['全部', '品格成长', '奇幻冒险', '动物朋友', '睡前故事'];

const STORY_CATEGORY_MAP: Record<string, string> = {
  '勇敢的小兔子': '品格成长', '分享的快乐': '品格成长', '诚实的小熊': '品格成长',
  '新朋友的微笑': '品格成长', '坚持到山顶': '品格成长', '谢谢你，小蚂蚁': '品格成长',
  '云朵上的城堡': '奇幻冒险', '海底奇遇记': '奇幻冒险', '星星守护者': '奇幻冒险',
  '会走路的树': '奇幻冒险', '时间的沙漏': '奇幻冒险', '画里的世界': '奇幻冒险',
  '小熊的蜂蜜罐': '动物朋友', '小企鹅的游泳课': '动物朋友',
  '长颈鹿的围巾': '动物朋友', '小海龟的旅程': '动物朋友', '猫头鹰的夜班': '动物朋友',
  '月亮船': '睡前故事', '晚安，小星星': '睡前故事', '梦的守护者': '睡前故事',
  '软软的云被子': '睡前故事', '小闹钟休息了': '睡前故事', '妈妈的声音': '睡前故事',
};

const BOOKS_PER_PAGE = 8;
const WHEEL_THRESHOLD = 80;
const SWIPE_THRESHOLD = 50;
const FADE_DURATION = 250;

const spineColors = [
  ['#5c4033', '#3e2723'], ['#6b4226', '#4e342e'], ['#7a5230', '#5d4037'],
  ['#8b6914', '#6d4c41'], ['#4a3728', '#3e2f1c'], ['#6b5b3a', '#4e3f2a'],
];

function BookCard({ story, colorIdx, onClick }: {
  story: StoryBoxStory;
  colorIdx: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [bg1, bg2] = spineColors[colorIdx % spineColors.length];

  return (
    <div
      className="storybox-card flex-shrink-0 cursor-pointer transition-all duration-300 ease-out flex flex-col items-center"
      style={{
        width: '12.1%',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className="w-full rounded-lg overflow-hidden transition-shadow duration-300"
        style={{
          aspectRatio: '2/3',
          boxShadow: hovered
            ? '0 10px 28px rgba(232,197,80,0.35)'
            : '0 3px 10px rgba(0,0,0,0.3)',
        }}
      >
        {story.coverUrl ? (
          <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` }}
          >
            <span className="text-2xl opacity-50" style={{ filter: 'grayscale(0.3)' }}>📖</span>
          </div>
        )}
      </div>
      <p
        className="text-center mt-1.5 text-xs font-bold w-full leading-tight truncate"
        style={{
          color: '#e8c550',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
        }}
      >
        {story.title}
      </p>
    </div>
  );
}

export default function StoryBox() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryBoxStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [page, setPage] = useState(0);
  const [fadePhase, setFadePhase] = useState<'visible' | 'fading'>('visible');

  const wheelAccRef = useRef(0);
  const touchStartY = useRef(0);
  const isAnimating = useRef(false);
  const fadeTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/stories?tag=showcase', { headers: getAccessHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const mapped = (data.data || [])
            .filter((s: any) => s.status === 'ready')
            .map((s: any) => ({
            _id: s._id,
            title: s.title || '未命名故事',
            coverUrl: s.coverUrl || s.pages?.[0]?.illustrationUrl || '',
            category: STORY_CATEGORY_MAP[s.title] || '全部',
          }));
          setStories(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredStories = useMemo(() => {
    if (activeCategory === '全部') return stories;
    return stories.filter(s => s.category === activeCategory);
  }, [stories, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / BOOKS_PER_PAGE));
  const currentBooks = useMemo(
    () => filteredStories.slice(page * BOOKS_PER_PAGE, (page + 1) * BOOKS_PER_PAGE),
    [filteredStories, page],
  );

  const topRow = currentBooks.slice(0, 4);
  const bottomRow = currentBooks.slice(4, 8);

  useEffect(() => { setPage(0); setFadePhase('visible'); }, [activeCategory]);
  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  const goToPage = useCallback((newPage: number) => {
    if (isAnimating.current || totalPages <= 1) return;
    isAnimating.current = true;
    setFadePhase('fading');
    fadeTimer.current = window.setTimeout(() => {
      setPage(newPage);
      setFadePhase('visible');
      isAnimating.current = false;
    }, FADE_DURATION);
  }, [totalPages]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (totalPages <= 1) return;
    wheelAccRef.current += e.deltaY;
    if (wheelAccRef.current > WHEEL_THRESHOLD) {
      wheelAccRef.current = 0;
      goToPage((page + 1) % totalPages);
    } else if (wheelAccRef.current < -WHEEL_THRESHOLD) {
      wheelAccRef.current = 0;
      goToPage((page - 1 + totalPages) % totalPages);
    }
  }, [page, totalPages, goToPage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (totalPages <= 1) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      goToPage(diff > 0 ? (page + 1) % totalPages : (page - 1 + totalPages) % totalPages);
    }
  }, [page, totalPages, goToPage]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        backgroundImage: `url('/故事宝盒界面背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 阳光聚光层 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 32%, rgba(255,240,210,0.14) 0%, rgba(255,220,160,0.05) 38%, transparent 68%)',
        }}
      />

      {/* 顶部栏：返回键 + 分类筛选 同一排 */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center gap-3">
        <button
          onClick={() => navigate('/features')}
          className="flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
          aria-label="返回功能选择"
        >
          <img src="/返回键.png" alt="返回" className="w-28 h-28 object-contain" />
        </button>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="storybox-cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300"
              style={{
                background: activeCategory === cat ? 'rgba(232,197,80,0.35)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                color: activeCategory === cat ? '#2a1f0a' : 'rgba(255,255,255,0.85)',
                border: `1px solid ${activeCategory === cat ? 'rgba(232,197,80,0.5)' : 'rgba(255,255,255,0.2)'}`,
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
                textShadow: activeCategory === cat ? '0 0 8px rgba(232,197,80,0.3)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex items-center justify-center" style={{ transform: 'translateY(5%)' }}>
        {loading ? (
          <p
            className="text-white/50 text-xl"
            style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
          >
            正在整理书架...
          </p>
        ) : filteredStories.length === 0 ? (
          <p
            className="text-white/50 text-xl"
            style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
          >
            该分类暂无故事
          </p>
        ) : (
          <div className="relative flex items-center justify-center" style={{ width: '86%', height: '88%' }}>
            {/* 梯形光柱背景 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: 'polygon(50% 0%, 88% 10%, 96% 50%, 88% 90%, 50% 100%, 12% 90%, 4% 50%, 12% 10%)',
                background: 'linear-gradient(180deg, rgba(255,240,200,0.08) 0%, rgba(255,225,170,0.04) 40%, rgba(255,210,150,0.06) 100%)',
              }}
            />

            {/* 光柱边缘柔光线 */}
            <div
              className="absolute pointer-events-none"
              style={{
                inset: '-4px',
                clipPath: 'polygon(50% 0%, 88% 10%, 96% 50%, 88% 90%, 50% 100%, 12% 90%, 4% 50%, 12% 10%)',
                boxShadow: 'inset 0 0 60px rgba(255,220,140,0.06)',
              }}
            />

            {/* 书架内容 */}
            <div
              className="relative flex flex-col items-center justify-center gap-0 w-full h-full"
              style={{
                opacity: fadePhase === 'visible' ? 1 : 0,
                transition: `opacity ${FADE_DURATION}ms ease`,
              }}
            >
              {/* 上排 4 本 */}
              <div className="storybox-book-row flex justify-center w-full" style={{ gap: '5rem' }}>
                {topRow.map((story, i) => (
                  <BookCard key={story._id} story={story} colorIdx={i} onClick={() => navigate(`/story/${story._id}?from=storybox`)} />
                ))}
                {Array.from({ length: 4 - topRow.length }).map((_, i) => (
                  <div key={`top-ph-${i}`} style={{ width: '11%', visibility: 'hidden' }}>
                    <div style={{ aspectRatio: '2/3' }} />
                  </div>
                ))}
              </div>

              {/* 木质隔板 */}
              <div
                className="w-full flex-shrink-0 my-1.5"
                style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent 8%, rgba(120,80,40,0.5) 15%, rgba(160,110,55,0.7) 50%, rgba(120,80,40,0.5) 85%, transparent 92%)',
                  borderRadius: '2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              />

              {/* 下排 4 本 */}
              <div className="storybox-book-row flex justify-center w-full" style={{ gap: '5rem' }}>
                {bottomRow.map((story, i) => (
                  <BookCard key={story._id} story={story} colorIdx={i + 4} onClick={() => navigate(`/story/${story._id}?from=storybox`)} />
                ))}
                {Array.from({ length: 4 - bottomRow.length }).map((_, i) => (
                  <div key={`bottom-ph-${i}`} style={{ width: '11%', visibility: 'hidden' }}>
                    <div style={{ aspectRatio: '2/3' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (orientation: landscape) and (max-height: 500px) {
          .storybox-book-row { gap: 1.5rem !important; }
          .storybox-card { width: 11% !important; }
          .storybox-cat-btn { font-size: 0.7rem !important; padding: 2px 8px !important; }
        }
      `}</style>
    </div>
  );
}
