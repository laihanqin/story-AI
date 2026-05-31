import { useState, useEffect, type ReactNode } from 'react';

const ACCESS_KEY = 'story-ai-access';

function getStoredToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY);
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 5 秒超时保护：弱网下不卡加载
    const timeout = setTimeout(() => {
      setLoading(false);
      setUnlocked(true);
    }, 5000);

    const token = getStoredToken();
    if (token) {
      fetch('/api/auth/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
      }).then(r => r.json()).then(d => {
        clearTimeout(timeout);
        if (d.success) {
          setUnlocked(true);
        } else {
          sessionStorage.removeItem(ACCESS_KEY);
        }
        setLoading(false);
      }).catch(() => {
        clearTimeout(timeout);
        setUnlocked(true);
        setLoading(false);
      });
    } else {
      fetch('/api/auth/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(r => r.json()).then(d => {
        clearTimeout(timeout);
        if (d.token) {
          sessionStorage.setItem(ACCESS_KEY, d.token);
          setUnlocked(true);
        }
        setLoading(false);
      }).catch(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
    }
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem(ACCESS_KEY, data.token);
        setUnlocked(true);
      } else {
        setError(data.message || '密码错误');
      }
    } catch {
      setError('网络连接失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <p className="text-white/40 text-lg" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}>加载中...</p>
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div
        className="flex flex-col items-center gap-6 p-10 rounded-3xl mx-4"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <h1
          className="text-2xl font-bold tracking-wider"
          style={{
            color: '#e8c550',
            fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
            textShadow: '0 2px 12px rgba(232,197,80,0.3)',
          }}
        >
          故事 AI
        </h1>

        <p className="text-white/50 text-sm text-center" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}>
          请输入访问密码
        </p>

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="输入密码"
          autoFocus
          className="w-full px-5 py-3 text-lg rounded-xl text-center outline-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: error ? '2px solid rgba(255,100,100,0.5)' : '2px solid rgba(255,255,255,0.15)',
            color: '#e8c550',
            fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
          }}
        />

        {error && (
          <p className="text-red-300 text-sm -mt-3" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !password.trim()}
          className="w-full py-3 rounded-xl text-white font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, rgba(232,197,80,0.6), rgba(232,197,80,0.3))',
            fontFamily: '"Comic Sans MS", "Chalkboard SE", "STKaiti", "楷体", cursive',
          }}
        >
          {submitting ? '验证中...' : '进入'}
        </button>
      </div>
    </div>
  );
}
