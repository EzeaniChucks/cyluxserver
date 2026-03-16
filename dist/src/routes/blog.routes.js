"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// cyluxserver/src/routes/blog.routes.ts
const express_1 = require("express");
const blog_controller_1 = require("../controllers/blog.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// ── Public ──────────────────────────────────────────────────────────────────
router.get('/', blog_controller_1.blogController.getAllPublished);
router.get('/:slug', blog_controller_1.blogController.getBySlug);
// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/posts', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), blog_controller_1.blogController.getAllAdmin);
router.get('/admin/posts/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), blog_controller_1.blogController.getById);
router.post('/admin/posts', (0, auth_1.protectAdmin)(['superadmin', 'admin']), blog_controller_1.blogController.create);
router.put('/admin/posts/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin']), blog_controller_1.blogController.update);
router.delete('/admin/posts/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin']), blog_controller_1.blogController.delete);
router.post('/admin/upload-image', (0, auth_1.protectAdmin)(['superadmin', 'admin']), blog_controller_1.blogImageUpload, blog_controller_1.blogController.uploadImage);
exports.default = router;
//# sourceMappingURL=blog.routes.js.map