// ===== Express 应用配置 =====
import express from 'express';
import cors from 'cors';
import { storyRoutes } from './routes/stories';
import { authRoutes } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/stories', storyRoutes);
app.use('/api/auth', authRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

export default app;