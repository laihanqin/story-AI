import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTER_LIST } from '@shared/constants/characters';

export default function CharacterSelect() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [confirmHidden, setConfirmHidden] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => audioRef.current?.play().catch(() => {}), 500);
    return () => {
      clearTimeout(timer);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };
  }, []);

  const selectedCharacter = selectedCard ? CHARACTER_LIST.find(c => c.id === selectedCard) : null;

  const handleConfirm = () => {
    if (!selectedCharacter) return;
    setConfirmHidden(true);
    setTimeout(() => setIsTransitioning(true), 150);
    setTimeout(() => {
      navigate(`/ai-create?character=${encodeURIComponent(selectedCharacter.role)}`);
    }, 800);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{
        backgroundImage: `url('/角色选择界面.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
      }}
    >
      {/* 老虎 */}
      <div className="absolute top-[1%] left-[10%] landscape:!top-[1%] landscape:!left-[10%] md:top-[4%] md:left-[40%] w-[120px] h-[120px] landscape:!w-[80px] landscape:!h-[80px] md:w-[286px] md:h-[286px]" style={{ animation: 'dance 1.2s ease-in-out infinite' }}>
        <img src="/小老虎.png" alt="小老虎" className="w-full h-full object-contain" style={{ filter: 'brightness(1.05)' }} />
      </div>

      {/* 思考气泡 */}
      <div className="absolute top-[0%] left-[35%] md:top-[1%] md:left-[53%]">
        <div className="thought-cloud-mobile md:thought-cloud landscape-shrink-cloud">
          <p className="thought-text-mobile md:thought-text landscape-text">选择你的小伙伴<br />开始去冒险吧！</p>
        </div>
      </div>

      {/* 角色半透明面板 */}
      <div
        className="absolute bottom-[1%] left-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out landscape-panel"
        style={{
          zIndex: 0,
          width: '94%',
          maxWidth: '2550px',
          height: '62%',
          transform: isTransitioning ? 'translateX(-120%) scale(0.95)' : 'translateX(-50%) scale(1)',
          opacity: isTransitioning ? 0 : 1,
        }}
      >
        <div className="absolute inset-0" style={{
          borderRadius: '40px',
          background: 'rgba(80, 80, 80, 0.1)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
        }} />

        {/* 角色卡片网格 */}
        <div className="absolute inset-[4%] md:inset-[8%] grid grid-cols-2 grid-rows-4 md:grid-cols-4 md:grid-rows-2 landscape:!grid-cols-2 landscape:!grid-rows-4 gap-2 md:gap-4 landscape:!gap-1">
          {CHARACTER_LIST.map(card => {
            const isHovered = hoveredCard === card.id;
            const isSelected = selectedCard === card.id;
            return (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                style={{
                  transform: (isHovered || isSelected) ? 'scale(1.12)' : 'scale(1)',
                  filter: isSelected
                    ? 'drop-shadow(0 0 8px rgba(255,215,0,0.35)) drop-shadow(0 0 15px rgba(255,200,0,0.15))'
                    : isHovered
                      ? 'drop-shadow(0 0 5px rgba(255,255,255,0.2))'
                      : 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                  zIndex: (isHovered || isSelected) ? 10 : 1,
                }}
              >
                <img src="/角色卡片.png" alt={`角色卡位${card.id}`} className="w-full h-full object-contain" />
                <img src={card.img} alt={card.role} className="absolute object-contain" style={{ width: '70%', height: '70%', top: '5%' }} />
                <span className="absolute bottom-[-2%] text-center select-none" style={{
                  fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
                  fontSize: 'clamp(12px, 1.4vw, 20px)',
                  color: '#fff',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(255,200,0,0.3)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}>
                  {card.role}
                </span>
              </div>
            );
          })}
        </div>

        {/* 确定按键 */}
        <div
          className="absolute right-[-2%] md:right-[0%] top-1/2 transition-all duration-400"
          style={{
            opacity: (selectedCard && !confirmHidden) ? 1 : 0,
            transform: (selectedCard && !confirmHidden) ? 'translateY(-50%) scale(1)' : 'translateY(calc(-50% + 20px)) scale(0.8)',
            pointerEvents: (selectedCard && !confirmHidden) ? 'auto' : 'none',
          }}
        >
          <img src="/确定按键.png" alt="确定" className="confirm-btn w-[80px] md:w-[156px] h-auto object-contain cursor-pointer landscape-btn" onClick={handleConfirm} />
        </div>
      </div>

      <audio ref={audioRef} src="/角色选择.mp3" preload="auto" />

      <style>{`
        /* 仅保留本页独有的样式，共享部分在 @shared/styles/landscape.css */
        @keyframes confirmPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255,215,0,0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); }
        }
        .confirm-btn {
          animation: confirmPulse 2s ease-in-out infinite;
          transition: transform 0.2s ease;
        }
        .confirm-btn:hover {
          transform: scale(1.2) !important;
          animation-play-state: paused;
          filter: drop-shadow(0 0 22px rgba(255,215,0,0.85)) drop-shadow(0 0 45px rgba(255,180,0,0.55)) !important;
        }
        @media (orientation: landscape) and (max-height: 500px) {
          .landscape-btn { width: 56px !important; }
        }
      `}</style>
    </div>
  );
}
