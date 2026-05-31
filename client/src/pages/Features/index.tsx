import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import AuthModal from '@shared/components/AuthModal';
import BottomNav from '@shared/components/BottomNav';

export default function Features() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [showTeleport, setShowTeleport] = useState(false);
  const [showFog, setShowFog] = useState(false);
  const [targetPath, setTargetPath] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const centerVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const teleportTimerRef = useRef<number | null>(null);
  const navigatedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (teleportTimerRef.current) {
        clearTimeout(teleportTimerRef.current);
      }
    };
  }, []);

  // 手机横屏：自动循环静音播放三门视频
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const videos = [leftVideoRef, centerVideoRef, rightVideoRef];

    const handleMatch = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        videos.forEach(ref => {
          if (ref.current) {
            ref.current.muted = true;
            ref.current.play().catch(() => {});
          }
        });
      }
    };

    handleMatch(mql);
    mql.addEventListener('change', handleMatch);
    return () => mql.removeEventListener('change', handleMatch);
  }, []);

  const handleDoorClick = (e: React.MouseEvent, door: string) => {
    if (!containerRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    navigatedRef.current = false;
    if (teleportTimerRef.current) {
      clearTimeout(teleportTimerRef.current);
      teleportTimerRef.current = null;
    }

    // 获取点击位置相对于容器的百分比
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomOrigin({ x: `${x}%`, y: `${y}%` });
    setIsExpanded(true);
    
    // 根据门设置目标路径
    switch(door) {
      case 'left':
        setTargetPath('/character-select');
        break;
      case 'center':
        setTargetPath('/story-box');
        break;
      case 'right':
        setTargetPath('/co-create');
        break;
    }
    
    // 0.8秒放大后 → 传送视频 + 迷雾
    setTimeout(() => {
      setIsExpanded(false);
      setShowTeleport(true);
      setShowFog(true);
      // 兜底：5秒后视频还没播完也强制跳转
      teleportTimerRef.current = window.setTimeout(() => {
        handleTeleportEnd();
      }, 5000);
    }, 800);
  };

  const handleTeleportEnd = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    isAnimatingRef.current = false;
    if (teleportTimerRef.current) {
      clearTimeout(teleportTimerRef.current);
      teleportTimerRef.current = null;
    }
    setShowTeleport(false);
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div
      ref={containerRef}
      className="features-container min-h-screen w-full flex flex-col relative"
      style={{
        backgroundImage: `url('/功能界面.jpeg')`,
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f0f4ff',
        minHeight: '100vh',
        transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}`,
        transition: isExpanded ? 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.3s ease',
        transform: isExpanded ? 'scale(2.5)' : 'scale(1)',
        overflow: isExpanded ? 'hidden' : 'visible',
      }}
    >
      {/* 顶部状态栏 */}
      <header className="features-header relative z-10 px-4 py-3">
        <div className="flex items-center justify-between w-full px-6">
          {/* 算力值 - 带 aria-label */}
          <div
            className="flex items-center gap-1 md:gap-3"
            role="img"
            aria-label="剩余金币100"
          >
            <img src="/icons/金币.png" alt="金币" className="w-16 h-16 md:w-24 md:h-24" />
            <span className="gold-text text-lg md:text-2xl font-bold text-white drop-shadow-md">100</span>
          </div>

          {/* 右侧按钮组：用户头像 + 家长中心 */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={logout}
                className="invisible flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-all shadow-lg"
                aria-label="退出登录"
                title={user.name}
              >
                <span className="text-2xl">{user.avatar}</span>
                <span className="text-white text-sm font-medium hidden sm:block">{user.name}</span>
                <LogOut className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="invisible flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-all shadow-lg"
                aria-label="登录/注册"
              >
                <User className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-medium hidden sm:block">登录</span>
              </button>
            )}

            <button
              onClick={() => navigate('/parent-center')}
              aria-label="进入家长中心"
              className="drop-shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 rounded-full"
            >
              <img src="/icons/家长中心.png" alt="家长中心" className="w-20 h-20 md:w-28 md:h-28" />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="features-main relative z-10 flex-1 flex flex-col px-6 py-8 gap-5">
        {/* 标题 */}
        <div className="features-title text-center pt-2 md:pt-4 pb-2">
          <h1 className="text-xl md:text-3xl font-black flex items-center justify-center gap-2 md:gap-3 drop-shadow-xl">
            <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-yellow-400 animate-bounce" />
            <span className="text-yellow-300">选一扇门进入吧！</span>
            <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-yellow-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </h1>
        </div>

        {/* 三扇门区域 */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* 左门 - AI创作 */}
          <div
            className="door-circle door-left absolute w-[120px] h-[120px] md:w-[200px] md:h-[200px] rounded-full overflow-hidden shadow-2xl cursor-pointer transition-transform duration-300"
            style={{
              left: '8%',
              top: '50%',
              transform: `translateY(-50%) scale(${hoveredDoor === 'left' ? 1.2 : 1})`,
            }}
            onMouseEnter={() => {
              setHoveredDoor('left');
              if (leftVideoRef.current) { leftVideoRef.current.muted = false; leftVideoRef.current.play().catch(()=>{}); }
            }}
            onMouseLeave={() => {
              setHoveredDoor(null);
              if (leftVideoRef.current) leftVideoRef.current.muted = true;
            }}
            onClick={(e) => {
              if (leftVideoRef.current) leftVideoRef.current.muted = true;
              handleDoorClick(e, 'left');
            }}
          >
            {/* 视频层 - 圆形裁剪 */}
            <video
              ref={leftVideoRef}
              src="/icons/我的故事.mp4"
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              style={{
                mixBlendMode: 'lighten',
                maskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                filter: 'blur(0.5px) brightness(1.3) saturate(1.2)',
              }}
            />
          </div>

          {/* 中门 - 故事宝盒视频 */}
          <div
            className="door-circle absolute left-1/2 top-[50%] -translate-x-1/2 w-[120px] h-[120px] md:w-[200px] md:h-[200px] rounded-full overflow-hidden shadow-2xl cursor-pointer transition-transform duration-300"
            style={{
              transform: `translateX(-50%) translateY(-50%) scale(${hoveredDoor === 'center' ? 1.2 : 1})`,
            }}
            onMouseEnter={() => {
              setHoveredDoor('center');
              if (centerVideoRef.current) centerVideoRef.current.muted = false;
            }}
            onMouseLeave={() => {
              setHoveredDoor(null);
              if (centerVideoRef.current) centerVideoRef.current.muted = true;
            }}
            onClick={(e) => {
              if (centerVideoRef.current) centerVideoRef.current.muted = true;
              handleDoorClick(e, 'center');
            }}
          >
            <video
              ref={centerVideoRef}
              src="/icons/故事宝盒.mp4"
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              style={{
                mixBlendMode: 'lighten',
                maskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                filter: 'blur(0.5px) brightness(1.3) saturate(1.2)',
              }}
            />
          </div>

          {/* 右门 - 亲子共创 视频 */}
          <div
            className="door-circle door-right absolute w-[120px] h-[120px] md:w-[200px] md:h-[200px] rounded-full overflow-hidden shadow-2xl cursor-pointer transition-transform duration-300"
            style={{
              right: '8%',
              top: '50%',
              transform: `translateY(-50%) scale(${hoveredDoor === 'right' ? 1.2 : 1})`,
            }}
            onMouseEnter={() => {
              setHoveredDoor('right');
              if (rightVideoRef.current) rightVideoRef.current.muted = false;
            }}
            onMouseLeave={() => {
              setHoveredDoor(null);
              if (rightVideoRef.current) rightVideoRef.current.muted = true;
            }}
            onClick={(e) => {
              if (rightVideoRef.current) rightVideoRef.current.muted = true;
              handleDoorClick(e, 'right');
            }}
          >
            <video
              ref={rightVideoRef}
              src="/icons/故事手拉手.mp4"
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              style={{
                mixBlendMode: 'lighten',
                maskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 55%, transparent 70%)',
                filter: 'blur(0.5px) brightness(1.3) saturate(1.2)',
              }}
            />
          </div>
        </div>
      </main>

      {/* 底部导航栏 */}
      <BottomNav />

      {/* 传送效果遮罩层 */}
      {showTeleport && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={handleTeleportEnd}
        >
          <video
            ref={videoRef}
            src="/icons/传送效果.mp4"
            autoPlay
            className="w-full h-full object-cover"
            onCanPlay={(e) => {
              (e.target as HTMLVideoElement).playbackRate = 1.2;
            }}
            onEnded={handleTeleportEnd}
          />
          {/* 迷雾效果遮罩 - 边缘模糊过渡 */}
          {showFog && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255,255,255,0.15) 60%, rgba(255,255,255,0.4) 85%, rgba(255,255,255,0.8) 100%)',
                filter: 'blur(20px)',
                animation: 'fogPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
      )}

      {/* CSS 动画定义 */}
      <style>{`
        @keyframes fogPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        /* 手机横屏：缩小三扇门 + 调整位置 */
        @media (orientation: landscape) and (max-height: 500px) {
          /* 背景图填满屏幕 */
          .features-container {
            background-size: cover !important;
          }
          .door-circle {
            width: 104px !important;
            height: 104px !important;
          }
          .door-left {
            left: 20% !important;
          }
          .door-right {
            right: 20% !important;
          }
          .features-header img {
            width: 56px !important;
            height: 56px !important;
          }
          .features-header .gold-text {
            font-size: 1.25rem !important;
          }
          .features-main {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            gap: 0 !important;
          }
          .features-title {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .features-title h1 {
            font-size: 0.9rem !important;
            gap: 0.25rem !important;
          }
          .features-title svg {
            width: 14px !important;
            height: 14px !important;
          }
        }
      `}</style>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}