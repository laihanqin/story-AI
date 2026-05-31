import { useSearchParams, Navigate } from 'react-router-dom';
import { useFlowReducer } from '@shared/hooks/useFlowReducer';
import { CHARACTER_LIST } from '@shared/constants/characters';
import SceneInput from './SceneInput';
import PlotInput from './PlotInput';
import StoryWaiting from './StoryWaiting';

export default function AiCreate() {
  const [searchParams] = useSearchParams();
  const characterParam = searchParams.get('character');

  const initialCharacter = characterParam
    ? CHARACTER_LIST.find(c => c.role === characterParam) || undefined
    : undefined;

  const [state, dispatch] = useFlowReducer(initialCharacter);

  if (state.phase === 'ready' && state.storyId) {
    return <Navigate to={`/story/${state.storyId}`} replace />;
  }

  if (state.phase === 'generating') {
    return <StoryWaiting state={state} dispatch={dispatch} />;
  }

  if (state.phase === 'plot') {
    if (!state.character) return <Navigate to="/ai-create" replace />;
    return <PlotInput state={state} dispatch={dispatch} character={state.character} />;
  }

  if (state.phase === 'scene') {
    if (!state.character) return <Navigate to="/ai-create" replace />;
    return <SceneInput state={state} dispatch={dispatch} character={state.character} />;
  }

  // phase === 'character' — redirect to character-select page
  return <Navigate to="/character-select" replace />;
}
