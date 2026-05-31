import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const handleNavClick = (btn: string, path: string) => {
    if (location.pathname === path) return;
    setActiveBtn(btn);
    setTimeout(() => setActiveBtn(null), 500);
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path || activeBtn === getBtnFromPath(path);

  return (
    <nav className="relative z-10 px-0 pb-2 safe-area-pb" role="navigation" aria-label="主导航">
      <div className="flex items-center justify-between w-full px-4 md:px-16">
        {/* AI 按钮 */}
        <button
          onClick={() => handleNavClick('ai', '/features')}
          aria-label="AI故事创作"
          className={`bottomnav-btn bottomnav-btn-ai flex flex-col items-center gap-1 px-2 md:px-4 py-2 md:py-3 h-16 md:h-24 rounded-xl transition-all duration-300 ${
            isActive('/features')
              ? 'text-purple-200 drop-shadow-[0_0_20px_rgba(168,85,247,1)] scale-110'
              : 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] hover:scale-110 hover:drop-shadow-[0_0_15px_rgba(168,85,247,1)]'
          } focus:outline-none md:translate-x-64 -translate-y-6 md:-translate-y-12`}
        >
          <img src="/icons/AI.png" alt="AI" className="w-12 h-12 md:w-20 md:h-20" />
          <span className={`text-xs md:text-sm font-bold ${isActive('/features') ? 'text-purple-200' : 'text-purple-400'}`}>AI</span>
          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full drop-shadow-[0_0_6px_rgba(168,85,247,1)] ${isActive('/features') ? 'bg-purple-200' : 'bg-purple-400'}`} />
        </button>

        {/* 故事按钮 */}
        <button
          onClick={() => handleNavClick('story', '/stories')}
          aria-label="我的故事集"
          className={`bottomnav-btn bottomnav-btn-story flex flex-col items-center gap-1 px-2 md:px-4 py-2 md:py-3 h-16 md:h-24 rounded-xl transition-all duration-300 ${
            isActive('/stories')
              ? 'text-yellow-200 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)] scale-110'
              : 'text-yellow-300 hover:text-yellow-200 hover:scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] hover:drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]'
          } focus:outline-none -translate-y-6 md:-translate-y-12`}
        >
          <img src="/icons/故事.png" alt="故事" className="w-14 h-14 md:w-24 md:h-24" />
          <span className={`text-xs md:text-sm font-bold ${isActive('/stories') ? 'text-yellow-200' : 'text-yellow-300'}`}>故事</span>
        </button>

        {/* 我的按钮 */}
        <button
          onClick={() => handleNavClick('profile', '/profile')}
          aria-label="个人中心"
          className={`bottomnav-btn bottomnav-btn-profile flex flex-col items-center gap-1 px-2 md:px-4 py-2 md:py-3 h-16 md:h-24 rounded-xl transition-all duration-300 ${
            isActive('/profile')
              ? 'text-pink-200 drop-shadow-[0_0_15px_rgba(244,114,182,0.9)] scale-110'
              : 'text-pink-300 hover:text-pink-200 hover:scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)] hover:drop-shadow-[0_0_12px_rgba(244,114,182,0.9)]'
          } focus:outline-none md:-translate-x-64 -translate-y-6 md:-translate-y-12`}
        >
          <img src="/icons/我的.png" alt="我的" className="w-14 h-14 md:w-24 md:h-24" />
          <span className={`text-xs md:text-sm font-bold ${isActive('/profile') ? 'text-pink-200' : 'text-pink-300'}`}>我的</span>
        </button>
      </div>
    </nav>
  );
}

function getBtnFromPath(path: string): string | null {
  if (path === '/features') return 'ai';
  if (path === '/stories' || path === '/saved') return 'story';
  if (path === '/profile') return 'profile';
  return null;
}
