// ===== API 服务层 =====
import type { ApiResponse } from '../types';
import { getAccessHeaders } from './access';

const BASE_URL = '/api';
const REQUEST_TIMEOUT_MS = 15_000;

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...getAccessHeaders() };
  const token = localStorage.getItem('story-ai-token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timer);

    if (!res.ok) {
      let message = `请求失败 (${res.status})`;
      try {
        const body = await res.json();
        if (body.message) message = body.message;
      } catch { /* 无法解析错误响应体 */ }
      return { success: false, data: null as unknown as T, message };
    }

    return res.json();
  } catch (err: any) {
    clearTimeout(timer);
    const message = err?.name === 'AbortError'
      ? '请求超时，请检查网络'
      : `网络异常：${err?.message || '未知错误'}`;
    return { success: false, data: null as unknown as T, message };
  }
}

// 家长 API
export const parentApi = {
  generate: (data: { lesson: string; character: string; scene?: string; plot?: string }) =>
    request<{ _id: string }>('/parent/generate', { method: 'POST', body: JSON.stringify(data) }),
};