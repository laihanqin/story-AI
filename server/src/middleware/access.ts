// ===== 入口密码门中间件 =====
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const validTokens = new Set<string>();

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;

// 每 12 小时清理一次过期 token
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const tokenTimestamps = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [token, ts] of tokenTimestamps) {
    if (now - ts > TOKEN_TTL_MS) {
      validTokens.delete(token);
      tokenTimestamps.delete(token);
    }
  }
}, 60 * 60 * 1000);

// 验证入口密码，返回访问令牌
export function verifyAccess(req: Request, res: Response) {
  if (!ACCESS_PASSWORD) {
    return res.json({ success: true, token: 'dev-bypass', message: '开发模式，无需密码' });
  }

  const { password } = req.body;
  if (!password || password !== ACCESS_PASSWORD) {
    return res.status(403).json({ success: false, message: '密码错误' });
  }

  const token = crypto.randomUUID();
  validTokens.add(token);
  tokenTimestamps.set(token, Date.now());

  res.json({ success: true, token, message: '验证通过' });
}

// 入口门禁中间件：仅对 /api/* 路由检查访问令牌
export function accessGate(req: Request, res: Response, next: NextFunction) {
  // 仅拦截 API 请求，放过静态文件（页面、JS、CSS 等）
  if (!req.path.startsWith('/api/')) return next();

  // 未配置密码则跳过
  if (!ACCESS_PASSWORD) return next();

  // 验证密码的端点本身不需要令牌
  if (req.path === '/api/auth/verify-access') return next();

  const token = req.headers['x-access-token'] as string;
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ success: false, message: '请先输入访问密码' });
  }

  next();
}
