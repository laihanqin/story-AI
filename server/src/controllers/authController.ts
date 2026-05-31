// ===== 认证控制器 =====
import type { Request, Response } from 'express';
import { User } from '../models/User';

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { name, role, password } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: '用户名和角色不能为空',
        data: null,
      });
    }

    // 查找或创建用户
    let user = await User.findOne({ name, role });
    if (!user) {
      user = await User.create({
        name,
        role,
        avatar: role === 'parent' ? '👨‍👩‍👧' : '🧒',
        password: password || '',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        token: `mock_token_${user._id}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
}