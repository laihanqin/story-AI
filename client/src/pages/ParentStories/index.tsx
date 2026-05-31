import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getAccessHeaders } from '@shared/services/access';

interface ParentStory {
  _id: string;
  title: string;
  character: string;
  scene: string;
  description: string;
  lesson: string;
  status: string;
  progress: number;
  progressMessage: string;
  coverUrl: string;
  createdAt: string;
}

export default function ParentStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<ParentStory[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem('story-ai-token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAccessHeaders() };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/stories?type=parent_create', { headers });
      const data = await res.json();
      if (data.success) {
        setStories(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchStories();
    // 有生成中的故事时每3秒刷新
    pollRef.current = setInterval(() => {
      fetchStories();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // 当没有生成中的故事时停止轮询
  useEffect(() => {
    const hasGenerating = stories.some(s => s.status === 'generating');
    if (!hasGenerating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  }, [stories]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('story-ai-token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAccessHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/stories/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) {
      setStories(prev => prev.filter(s => s._id !== id));
    }
  };

  const generatingStories = stories.filter(s => s.status === 'generating');
  const readyStories = stories.filter(s => s.status === 'ready');

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        backgroundImage: `url('/家长创作中心背景.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {/* 导航栏 */}
      <header
        className="relative z-10 flex items-center px-3 py-3"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)' }}
      >
        <button
          onClick={() => navigate('/parent-center')}
          className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm">返回</span>
        </button>
        <span className="flex-1 text-center text-white font-semibold text-lg tracking-wide">
          我的故事
        </span>
        <div className="w-16" />
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-600 text-lg">加载中...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-600 text-lg mb-4">还没有创作故事</p>
            <button
              onClick={() => navigate('/parent-create')}
              className="px-6 py-2 rounded-full text-white font-semibold"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              去创作故事
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto flex flex-col gap-5">
            {/* 生成中的故事 */}
            {generatingStories.length > 0 && (
              <section>
                <h2 className="text-gray-800 text-sm font-semibold mb-3 px-1">生成中</h2>
                <div className="flex flex-col gap-3">
                  {generatingStories.map(story => (
                    <div
                      key={story._id}
                      className="p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                    >
                      <p className="text-black font-semibold truncate">{story.title}</p>
                      <p className="text-gray-700 text-xs mt-1">
                        {story.character} · {story.lesson}
                      </p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{story.progressMessage}</span>
                          <span>{story.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{
                              width: `${story.progress}%`,
                              background: 'linear-gradient(90deg, #81c784, #e8c550)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 已完成的故事 */}
            {readyStories.length > 0 && (
              <section>
                <h2 className="text-gray-800 text-sm font-semibold mb-3 px-1">
                  已完成 ({readyStories.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {readyStories.map(story => (
                    <div
                      key={story._id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}
                      onClick={() => navigate(`/story/${story._id}`)}
                    >
                      {/* 封面缩略图 */}
                      <div
                        className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.2)' }}
                      >
                        {story.coverUrl ? (
                          <img src={story.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            📖
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-black font-semibold truncate">{story.title}</p>
                        <p className="text-gray-700 text-xs mt-0.5 truncate">
                          {story.character} · {story.lesson}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(story.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>

                      <button
                        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        onClick={(e) => handleDelete(story._id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
