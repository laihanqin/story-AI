// ===== 简易内存频率限制 =====
import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  // 每分钟清理一次过期桶
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (now > b.resetAt) buckets.delete(key);
    }
  }, 60_000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    if (bucket.count > maxRequests) {
      const remainingMs = bucket.resetAt - now;
      const remainingS = Math.ceil(remainingMs / 1000);
      return res.status(429).json({
        success: false,
        message: `请求太频繁，请 ${remainingS} 秒后再试`,
      });
    }

    next();
  };
}
