// ===== 错误处理中间件 =====
import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('❌ 服务器错误:', err.message);

  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
    data: null,
  });
}