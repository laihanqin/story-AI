import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import Layout from '@shared/components/Layout';
import Home from '@pages/Home';
import Login from '@pages/Login';
import Features from '@pages/Features';
import AiCreate from '@pages/AiCreate';
import StoryPlayer from '@pages/StoryPlayer';
import StoryBox from '@pages/StoryBox';
import CoCreate from '@pages/CoCreate';
import ParentCenter from '@pages/ParentCenter';
import ParentChat from '@pages/ParentChat';
import ParentStories from '@pages/ParentStories';
import CharacterSelect from '@pages/CharacterSelect';
import SavedStories from '@pages/SavedStories';
import Profile from '@pages/Profile';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/ai-create" element={<AiCreate />} />
        <Route path="/story/:id" element={<StoryPlayer />} />
        <Route path="/co-create" element={<CoCreate />} />
        <Route path="/parent-center" element={<ParentCenter />} />
        <Route path="/parent-create" element={<ParentChat />} />
        <Route path="/parent-stories" element={<ParentStories />} />
        <Route path="/character-select" element={<AuthGuard><CharacterSelect /></AuthGuard>} />
        <Route path="/stories" element={<SavedStories />} />
        <Route path="/story-box" element={<StoryBox />} />
        <Route path="/saved" element={<SavedStories />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}