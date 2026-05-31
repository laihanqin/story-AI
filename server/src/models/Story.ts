// ===== Mongoose 数据模型 =====
import mongoose, { Schema, Document } from 'mongoose';

export type StoryType = 'ai_create' | 'co_create' | 'parent_create';
export type StoryStatus = 'draft' | 'generating' | 'ready';

export interface IStoryPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  audioUrl: string;
}

export interface IStory extends Document {
  title: string;
  coverUrl: string;
  type: StoryType;
  character: string;
  scene: string;
  description: string;
  pages: IStoryPage[];
  status: StoryStatus;
  targetChildId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoryPageSchema = new Schema<IStoryPage>(
  {
    pageNumber: { type: Number, required: true },
    text: { type: String, required: true },
    illustrationUrl: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
  },
  { _id: false },
);

const StorySchema = new Schema<IStory>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    coverUrl: { type: String, default: '' },
    type: {
      type: String,
      required: true,
      enum: ['ai_create', 'co_create', 'parent_create'],
    },
    character: { type: String, default: '' },
    scene: { type: String, default: '' },
    description: { type: String, default: '' },
    pages: { type: [StoryPageSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'generating', 'ready'],
      default: 'draft',
    },
    targetChildId: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
  },
);

StorySchema.index({ type: 1, status: 1 });
StorySchema.index({ targetChildId: 1 });
StorySchema.index({ createdBy: 1 });

export const Story = mongoose.model<IStory>('Story', StorySchema);