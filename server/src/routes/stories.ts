// ===== 故事路由 =====
import { Router } from 'express';
import { listStories, getStory, createStory, generateStory, pushStory } from '../controllers/storiesController';
import { requireAuth as authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listStories);
router.get('/:id', getStory);
router.post('/', createStory);
router.post('/:id/generate', generateStory);
router.post('/:id/push', pushStory);

export { router as storyRoutes };