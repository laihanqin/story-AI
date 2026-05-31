import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: '为宝贝写故事', img: '/家长中心-为宝贝写故事.png', path: '/parent-create' },
  { name: '我的故事', img: '/家长中心-我的故事.png', path: '/parent-stories' },
  { name: '时间设置', img: '/家长中心-时间沙漏.png', path: '' },
];

export default function ParentCenter() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{
        backgroundImage: `url('/家长中心背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {/* 返回键 */}
      <button
        onClick={() => navigate('/features')}
        className="absolute top-6 left-6 z-20 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
        aria-label="返回功能选择"
      >
        <img src="/返回键.png" alt="返回" className="w-28 h-28 object-contain" />
      </button>

      {/* 功能卡片区域 */}
      <div className="parentcenter-cards flex-1 flex flex-col items-center justify-center gap-5 px-6 py-16">
        {features.map((feature, index) => (
          <FeatureCard key={feature.name} feature={feature} index={index} navigate={navigate} />
        ))}
      </div>

      <style>{`
        @media (orientation: landscape) and (max-height: 500px) {
          .parentcenter-cards {
            flex-direction: row !important;
            gap: 0.5rem !important;
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          .parentcenter-card {
            max-width: 270px !important;
          }
          .parentcenter-card img {
            max-height: 150px !important;
          }
          .parentcenter-card p {
            font-size: 1.2rem !important;
            margin-top: 0.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ feature, index, navigate }: {
  feature: typeof features[number];
  index: number;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const scale = pressed ? 0.95 : hovered ? 1.1 : 1;
  const hasImg = !!feature.img;

  return (
    <div
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.15}s both`,
      }}
    >
      <div
        className="parentcenter-card w-full max-w-xs cursor-pointer flex flex-col items-center"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 300ms',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onClick={() => feature.path && navigate(feature.path)}
      >
        {hasImg ? (
          <img
            src={feature.img}
            alt={feature.name}
            className="w-full h-auto object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <div
            className="w-full aspect-[4/3] rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
              border: '2px dashed rgba(232,197,80,0.4)',
            }}
          >
            <span
              className="text-5xl opacity-30 select-none"
              style={{ color: '#e8c550' }}
            >
              📚
            </span>
          </div>
        )}
        <p
          className="text-xl font-bold mt-2 drop-shadow text-center"
          style={{
            fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
            color: '#e8c550',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          {feature.name}
        </p>
      </div>
    </div>
  );
}
