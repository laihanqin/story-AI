// ===== 共享类型定义 =====

export type StoryType = 'ai_create' | 'co_create' | 'parent_create';
export type StoryStatus = 'draft' | 'generating' | 'ready';
export type UserRole = 'parent' | 'child';

export interface User {
  _id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  audioUrl: string;
}

export interface Story {
  _id: string;
  title: string;
  coverUrl: string;
  type: StoryType;
  pages: StoryPage[];
  status: StoryStatus;
  progress: number;
  progressMessage: string;
  lesson: string;
  pipelineStep: string;
  targetChildId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  character?: string;
  scene?: string;
  description?: string;
}

// AI 创作流程
export interface AiCreateState {
  step: 'select-character' | 'select-scene' | 'story-input' | 'generating' | 'ready';
  character: string;
  scene: string;
  description: string;
  storyId: string | null;
}

// 亲子共创
export interface CoCreateTurn {
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface CoCreateState {
  storyId: string;
  title: string;
  parentStarted: boolean;
  turns: CoCreateTurn[];
  currentTurn: 'parent' | 'child';
  status: StoryStatus;
}

// API 响应格式
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}