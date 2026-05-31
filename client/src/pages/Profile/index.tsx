import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{
        backgroundImage: `url('/故事宝盒界面背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      <button
        onClick={() => navigate('/features')}
        className="absolute top-6 left-6 z-20 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
        aria-label="返回功能选择"
      >
        <img src="/返回键.png" alt="返回" className="w-28 h-28 object-contain" />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <p
          className="text-white/60 text-xl"
          style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}
        >
          即将上线，敬请期待
        </p>
      </div>

    </div>
  );
}
