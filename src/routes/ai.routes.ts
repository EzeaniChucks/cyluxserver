import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { protectParent } from '../middlewares/auth';

const router = Router();

router.post('/insights', protectParent, aiController.getInsights);
router.get('/safety-pulse', protectParent, aiController.getSafetyPulse);

export default router;
