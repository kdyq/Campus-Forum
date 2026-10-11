import { Router } from 'express';
import { ok } from '../utils/http.ts';
import * as authController from '../controllers/auth.controller.ts';
import * as userController from '../controllers/user.controller.ts';
import * as boardController from '../controllers/board.controller.ts';
import { requireAuth } from '../middlewares/auth.ts';
import { rateLimit } from '../middlewares/rateLimit.ts';
import { avatarUpload } from '../middlewares/upload.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => ok(res, { uptime: process.uptime() }));

// ---- 账号 ----
apiRouter.post('/auth/email/code', rateLimit('email-code-ip', 3600, 10), asyncHandler(authController.sendEmailCodeHandler));
apiRouter.post('/auth/register', rateLimit('register-ip', 3600, 5), asyncHandler(authController.registerHandler));
apiRouter.post('/auth/login', rateLimit('login-ip', 600, 10), asyncHandler(authController.loginHandler));
apiRouter.post('/auth/refresh', asyncHandler(authController.refreshHandler));
apiRouter.post('/auth/logout', asyncHandler(authController.logoutHandler));
apiRouter.post('/auth/verify-email', asyncHandler(authController.verifyEmailHandler));
apiRouter.post('/auth/password/reset', asyncHandler(authController.resetPasswordHandler));
apiRouter.get('/auth/me', requireAuth, asyncHandler(authController.meHandler));

// ---- 用户资料 ----
apiRouter.patch('/users/me', requireAuth, asyncHandler(userController.updateMeHandler));
apiRouter.post('/uploads/avatar', requireAuth, avatarUpload.single('file'), asyncHandler(userController.uploadAvatarHandler));

// ---- 板块 ----
apiRouter.get('/boards', asyncHandler(boardController.listBoardsHandler));
