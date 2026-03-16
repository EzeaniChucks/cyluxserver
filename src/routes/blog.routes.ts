// cyluxserver/src/routes/blog.routes.ts
import { Router } from 'express';
import { blogController, blogImageUpload } from '../controllers/blog.controller';
import { protectAdmin } from '../middlewares/auth';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/',           blogController.getAllPublished);
router.get('/:slug',      blogController.getBySlug);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get(   '/admin/posts',          protectAdmin(['superadmin', 'admin', 'support']), blogController.getAllAdmin);
router.get(   '/admin/posts/:id',      protectAdmin(['superadmin', 'admin', 'support']), blogController.getById);
router.post(  '/admin/posts',          protectAdmin(['superadmin', 'admin']),            blogController.create);
router.put(   '/admin/posts/:id',      protectAdmin(['superadmin', 'admin']),            blogController.update);
router.delete('/admin/posts/:id',      protectAdmin(['superadmin', 'admin']),            blogController.delete);
router.post(  '/admin/upload-image',   protectAdmin(['superadmin', 'admin']),            blogImageUpload, blogController.uploadImage);

export default router;
