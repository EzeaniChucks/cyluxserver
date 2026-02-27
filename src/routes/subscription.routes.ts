import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { protectParent } from '../middlewares/auth';

const router = Router();

// Public — no auth required
router.get('/plans', subscriptionController.getPlans);

// Parent-authenticated routes
router.get('/', protectParent, subscriptionController.getSubscription);
router.post('/checkout', protectParent, subscriptionController.createCheckout);
router.post('/portal', protectParent, subscriptionController.createPortal);
router.post('/cancel', protectParent, subscriptionController.cancelSubscription);

// Note: POST /webhook is registered directly in index.ts (before express.json())
// so Stripe's signature verification can access the raw body.

export default router;
