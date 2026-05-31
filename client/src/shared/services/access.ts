const ACCESS_KEY = 'story-ai-access';

export function getAccessHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(ACCESS_KEY);
  if (token) return { 'x-access-token': token };
  return {};
}
