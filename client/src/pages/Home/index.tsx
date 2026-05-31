// ===== 首页 - 引导页版本 =====
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import AuthModal from '@shared/components/AuthModal';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: `url('/首页.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 顶部导航栏 - 贴边 */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* 左上角 Logo - 贴左 */}
          <div className="text-white">
            <h1 className="home-logo text-2xl md:text-3xl font-black tracking-tight drop-shadow-lg">
              Story AI
            </h1>
          </div>

          {/* 右上角头像按钮 - 贴右 */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-medium drop-shadow-md hidden sm:block">{user.name}</span>
              <button
                onClick={logout}
                className="home-avatar w-14 h-14 bg-gradient-to-br from-purple-400/30 to-pink-400/30 backdrop-blur-md rounded-full flex items-center justify-center text-2xl hover:from-purple-400/50 hover:to-pink-400/50 transition-all duration-300 hover:scale-110 shadow-xl border border-white/40"
                aria-label="退出登录"
                title={user.name}
              >
                <span>{user.avatar}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="home-avatar w-14 h-14 bg-gradient-to-br from-purple-400/30 to-pink-400/30 backdrop-blur-md rounded-full flex items-center justify-center text-2xl hover:from-purple-400/50 hover:to-pink-400/50 transition-all duration-300 hover:scale-110 shadow-xl border border-white/40"
              aria-label="用户头像"
            >
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* 左侧宣传文字区域 - 中间偏下 */}
      <div className="home-text-area absolute left-4 md:left-[calc(4rem-2vw)] lg:left-[calc(8rem-2vw)] right-4 md:right-auto top-[40%] md:top-[45%] -translate-y-1/2 z-10 text-center md:text-left">
          {/* 大写标题 - 两行，带文字阴影 */}
          <h2
            className="home-title text-2xl md:text-4xl lg:text-7xl font-black text-gray-900 leading-tight mb-3 md:mb-6 tracking-wide md:whitespace-nowrap"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)' }}
          >
            释放你的想象力<br/>
            创作属于你的故事
          </h2>

          {/* 小写介绍文字 - 缩小字号，加深颜色，拉开间距，居中于标题和按钮之间 */}
          <div className="home-desc text-gray-800 text-xs md:text-sm lg:text-lg leading-relaxed space-y-2 md:space-y-3 font-medium md:translate-y-8 max-w-xs md:max-w-none mx-auto md:mx-0">
            <p>你心中有什么奇妙的故事？让AI帮你把它变成绘本！</p>
            <p>开启你的创作之旅，在这里一切都有可能！</p>
          </div>

          {/* Let's Go 按钮 - 发光脉冲动画 */}
          <div className="mt-4 md:mt-8 md:translate-x-12 md:translate-y-16 flex justify-center md:justify-start">
            <div className="home-letsgo-wrap" style={{ transform: 'scale(0.6) translateX(-30px)', transformOrigin: 'center center' }}>
            <button
              onClick={() => navigate('/features')}
              className="px-8 md:px-12 py-3 md:py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg md:text-xl lg:text-2xl rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2 md:gap-3 animate-pulse hover:animate-none"
              style={{ boxShadow: '0 4px 20px rgba(234, 179, 8, 0.5), 0 0 40px rgba(234, 179, 8, 0.25)' }}
            >
              Let's Go
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            </div>
          </div>
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <style>{`
        @media (orientation: landscape) and (max-height: 500px) {
          .home-logo { font-size: 1.2rem !important; }
          .home-avatar { width: 40px !important; height: 40px !important; }
          .home-avatar svg { width: 20px !important; height: 20px !important; }
          .home-title { font-size: 1.3rem !important; margin-bottom: 0.25rem !important; }
          .home-desc { font-size: 0.7rem !important; }
          .home-desc p { margin: 0 !important; }
          .home-text-area {
            top: 35% !important;
            left: 1rem !important;
          }
          .home-letsgo-wrap {
            transform: scale(0.5) translateX(-20px) !important;
          }
        }
      `}</style>
    </div>
  );
}