import { useReducer } from 'react';

// ===== 状态类型 =====
export type FlowPhase = 'character' | 'scene' | 'plot' | 'generating' | 'ready';

export interface CharacterInfo {
  id: number;
  role: string;
  img: string;
}

export interface DialogItem {
  role: 'user' | 'system';
  text: string;
}

export interface FlowState {
  phase: FlowPhase;
  character: CharacterInfo | null;
  scene: string;
  plot: string;
  dialogHistory: DialogItem[];
  dialogMode: 'idle' | 'waiting' | 'confirmed';
  voiceText: string;
  isListening: boolean;
  showSceneImages: boolean;
  storyId: string | null;
  waitingProgress: number;
  waitingMessage: string;
  errorCount: number;
  reminderPulse: boolean;
}

// ===== Action 类型 =====
export type FlowAction =
  | { type: 'SCENE_SELECTED'; scene: string }
  | { type: 'SCENE_CONFIRMED' }
  | { type: 'SCENE_API_RESPONSE'; scene: string; reply: string }
  | { type: 'GO_TO_PLOT' }
  | { type: 'PLOT_API_RESPONSE'; reply: string; plot: string }
  | { type: 'VOICE_TEXT'; text: string }
  | { type: 'VOICE_START' }
  | { type: 'VOICE_ERROR'; message: string }
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_PROGRESS'; progress: number; message: string }
  | { type: 'GENERATION_DONE'; storyId: string }
  | { type: 'GENERATION_FAIL' }
  | { type: 'RESET_TO_SCENE' }
  | { type: 'RESET_TO_IDLE' };

// ===== 初始状态 =====
const initialFlowState: FlowState = {
  phase: 'character',
  character: null,
  scene: '',
  plot: '',
  dialogHistory: [],
  dialogMode: 'idle',
  voiceText: '',
  isListening: false,
  showSceneImages: true,
  storyId: null,
  waitingProgress: 0,
  waitingMessage: '',
  errorCount: 0,
  reminderPulse: false,
};

// ===== Reducer =====
function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SCENE_SELECTED':
      return {
        ...state,
        scene: action.scene,
        dialogMode: 'waiting',
        showSceneImages: false,
        voiceText: '',
      };

    case 'SCENE_CONFIRMED':
      return {
        ...state,
        dialogMode: 'confirmed',
        dialogHistory: [
          { role: 'user', text: state.scene },
          { role: 'system', text: `好的！我们去${state.scene}冒险吧！` },
        ],
      };

    case 'GO_TO_PLOT':
      return {
        ...state,
        phase: 'plot',
        dialogHistory: [
          ...state.dialogHistory,
          { role: 'system', text: '那里发生了什么事情呢？' },
        ],
        showSceneImages: false,
        voiceText: '',
        dialogMode: 'idle',
        errorCount: 0,
        reminderPulse: false,
      };

    case 'SCENE_API_RESPONSE':
      return {
        ...state,
        scene: action.scene,
        showSceneImages: false,
        voiceText: action.scene,
        errorCount: 0,
        dialogHistory: [
          ...state.dialogHistory,
          { role: 'user', text: state.voiceText },
          { role: 'system', text: action.reply },
        ],
      };

    case 'PLOT_API_RESPONSE':
      return {
        ...state,
        plot: action.plot,
        errorCount: 0,
        dialogHistory: [
          ...state.dialogHistory,
          { role: 'user', text: action.plot },
          { role: 'system', text: action.reply },
        ],
      };

    case 'VOICE_TEXT':
      return { ...state, voiceText: action.text };

    case 'VOICE_START':
      return {
        ...state,
        isListening: true,
        voiceText: '',
        showSceneImages: false,
      };

    case 'VOICE_ERROR': {
      const newCount = state.errorCount + 1;
      if (newCount === 1) {
        return {
          ...state,
          errorCount: newCount,
          dialogHistory: [...state.dialogHistory, { role: 'system', text: action.message }],
        };
      }
      if (newCount === 2) {
        return { ...state, errorCount: newCount, reminderPulse: true };
      }
      // 第3次：静默恢复
      return {
        ...state,
        errorCount: 0,
        reminderPulse: false,
        showSceneImages: true,
        dialogMode: 'idle',
        scene: '',
        dialogHistory: [],
      };
    }

    case 'GENERATION_START':
      if (state.phase === 'generating') return state;
      return { ...state, phase: 'generating', waitingProgress: 0, waitingMessage: '正在准备...' };

    case 'GENERATION_PROGRESS':
      return {
        ...state,
        waitingProgress: action.progress,
        waitingMessage: action.message,
      };

    case 'GENERATION_DONE':
      return {
        ...state,
        phase: 'ready',
        storyId: action.storyId,
        waitingProgress: 100,
      };

    case 'GENERATION_FAIL':
      return {
        ...state,
        phase: 'plot',
        waitingProgress: 0,
        waitingMessage: '',
        dialogHistory: [
          ...state.dialogHistory,
          { role: 'system', text: '哎呀，故事生成失败了，我们再试一次吧！' },
        ],
      };

    case 'RESET_TO_SCENE':
      return {
        ...state,
        phase: 'scene',
        scene: '',
        dialogHistory: [],
        dialogMode: 'idle',
        voiceText: '',
        showSceneImages: true,
        errorCount: 0,
        reminderPulse: false,
      };

    case 'RESET_TO_IDLE':
      return {
        ...state,
        dialogMode: 'idle',
        voiceText: '',
        errorCount: 0,
        reminderPulse: false,
      };

    default:
      return state;
  }
}

export function useFlowReducer(initialCharacter?: CharacterInfo) {
  const init = initialCharacter
    ? { ...initialFlowState, phase: 'scene' as FlowPhase, character: initialCharacter }
    : initialFlowState;
  return useReducer(flowReducer, init);
}
