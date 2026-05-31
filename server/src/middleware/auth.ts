// ===== 认证中间件 =====
import type { Request, Response, NextFunction } from 'express';
import { findUserByToken } from '../db';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// 从请求中提取用户 token（Bearer 或 x-user-token header）
function extractToken(req: Request): string | null {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  // 兼容过渡期：也支持 x-user-token header
  const legacy = req.headers['x-user-token'] as string;
  if (legacy) return legacy;
  return null;
}

// 强制认证：无有效 token 返回 401
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }
  const user = findUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
  req.userId = user.id;
  next();
}

// 可选认证：有 token 则附加用户信息，无 token 也放行
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const user = findUserByToken(token);
    if (user) req.userId = user.id;
  }
  next();
}
