// ===== 用户数据模型 =====
import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'parent' | 'child';

export interface IUser extends Document {
  name: string;
  role: UserRole;
  avatar: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 20 },
    role: {
      type: String,
      required: true,
      enum: ['parent', 'child'],
    },
    avatar: { type: String, default: '' },
    password: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>('User', UserSchema);