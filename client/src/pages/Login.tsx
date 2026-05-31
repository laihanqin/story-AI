// ===== 登录页面 =====
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import type { UserRole } from '@shared/types';

export default function Login() {
  const { user, login, loginError, clearLoginError } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('child');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/features', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) await login(name.trim(), role);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (loginError) clearLoginError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 50%, #fce7f3 100%)' }}>
      <div className="card-kid w-full max-w-md text-center">
        <div className="text-6xl mb-4">🌟</div>
        <h1 className="text-3xl font-bold text-primary-600 mb-2">AI 故事共创</h1>
        <p className="text-gray-500 mb-8">和 AI 一起创造奇妙的故事世界</p>

        {loginError && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-name" className="sr-only">你的名字</label>
            <input
              id="login-name"
              className="input-kid text-center"
              placeholder="输入你的名字"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={12}
              autoFocus
            />
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setRole('child')}
              className={`chip text-lg px-6 py-3 ${
                role === 'child'
                  ? 'bg-kid-pink text-white shadow-lg scale-105'
                  : 'bg-pink-100 text-pink-500'
              }`}
            >
              🧒 我是小朋友
            </button>
            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`chip text-lg px-6 py-3 ${
                role === 'parent'
                  ? 'bg-kid-purple text-white shadow-lg scale-105'
                  : 'bg-purple-100 text-purple-500'
              }`}
            >
              👨‍👩‍👧 我是家长
            </button>
          </div>

          <button type="submit" disabled={!name.trim()} className="btn-primary w-full text-lg">
            开始冒险 🚀
          </button>
        </form>
      </div>
    </div>
  );
}