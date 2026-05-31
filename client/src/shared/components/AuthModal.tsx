import { useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import type { UserRole } from '@shared/types';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register, loginError, clearLoginError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('child');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setName('');
    setPassword('');
    setError('');
    setLoading(false);
    clearLoginError();
  };

  const switchMode = () => {
    reset();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    if (password.trim().length < 4) {
      setError('密码至少4位');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await register(name.trim(), password.trim(), role);
      } else {
        await login(name.trim(), role, password.trim());
      }
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-3xl shadow-2xl overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundImage: 'url(/auth-modal-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          aspectRatio: '3/4',
          maxHeight: '90vh',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {(error || loginError) && (
          <div className="absolute top-4 inset-x-4 px-4 py-2 bg-red-500/20 backdrop-blur border border-red-400/30 rounded-xl text-red-200 text-sm text-center z-10">
            {error || loginError}
          </div>
        )}

        {/* 用户名 */}
        <div className="absolute inset-x-0 bottom-[49.8%] px-6 z-10 flex flex-col justify-end">
          <input
            className="w-4/5 mx-auto px-4 py-[14px] rounded-xl bg-transparent border border-transparent text-white placeholder:text-gray-400 placeholder:text-xl text-center outline-none hover:border-white/25 focus:border-white/50 transition-all"
            placeholder="用户名"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            maxLength={12}
            autoFocus
          />
        </div>

        {/* 密码 + 登录 —— 底部 */}
        <div className="absolute inset-x-0 bottom-0 p-6 z-[5]" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.85))' }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full px-4 py-3 rounded-xl bg-black/40 backdrop-blur border border-white/30 text-white placeholder-white/60 text-center outline-none focus:border-white/60 transition-colors shadow-lg"
              type="password"
              placeholder="密码（至少4位）"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              maxLength={20}
            />

            {mode === 'register' && (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setRole('child')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    role === 'child'
                      ? 'bg-pink-500 text-white shadow-lg scale-105'
                      : 'bg-white/15 text-white/70'
                  }`}
                >
                  小朋友
                </button>
                <button
                  type="button"
                  onClick={() => setRole('parent')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    role === 'parent'
                      ? 'bg-purple-500 text-white shadow-lg scale-105'
                      : 'bg-white/15 text-white/70'
                  }`}
                >
                  家长
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-white/25 backdrop-blur border border-white/30 text-white font-semibold text-lg hover:bg-white/35 transition-colors disabled:opacity-50">
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-3">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button onClick={switchMode} className="text-white/80 font-medium hover:text-white hover:underline ml-1">
              {mode === 'login' ? '去注册' : '去登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
