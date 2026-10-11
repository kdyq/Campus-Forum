import { Router } from 'express';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as authController from '../controllers/auth.controller.ts';
import * as userController from '../controllers/user.controller.ts';
import * as boardController from '../controllers/board.controller.ts';
import * as postController from '../controllers/post.controller.ts';
import * as commentController from '../controllers/comment.controller.ts';
import * as interactController from '../controllers/interact.controller.ts';
import * as draftController from '../controllers/draft.controller.ts';
import * as miscController from '../controllers/misc.controller.ts';
import { requireAuth, requireVerified, optionalAuth } from '../middlewares/auth.ts';
import { rateLimit } from '../middlewares/rateLimit.ts';
import { avatarUpload, postImageUpload } from '../middlewares/upload.ts';
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

// ---- 板块 / 标签 / 社区数据 ----
apiRouter.get('/boards', asyncHandler(boardController.listBoardsHandler));
apiRouter.get('/tags', asyncHandler(miscController.listTagsHandler));
apiRouter.get('/stats', asyncHandler(miscController.statsHandler));

// ---- 帖子 ----
apiRouter.get('/posts', optionalAuth, asyncHandler(postController.listHandler));
apiRouter.post('/posts', requireVerified, asyncHandler(postController.createHandler));
apiRouter.get('/posts/:id(\\d+)', optionalAuth, asyncHandler(postController.detailHandler));
apiRouter.patch('/posts/:id(\\d+)', requireAuth, asyncHandler(postController.updateHandler));
apiRouter.delete('/posts/:id(\\d+)', requireAuth, asyncHandler(postController.deleteHandler));
apiRouter.post('/posts/:id(\\d+)/accept', requireVerified, asyncHandler(postController.acceptHandler));
apiRouter.get('/posts/:id(\\d+)/comments', optionalAuth, asyncHandler(commentController.listHandler));
apiRouter.post('/posts/:id(\\d+)/comments', requireVerified, asyncHandler(commentController.createHandler));
apiRouter.delete('/comments/:id(\\d+)', requireAuth, asyncHandler(commentController.deleteHandler));

// ---- 互动 ----
apiRouter.post('/likes', requireVerified, asyncHandler(interactController.likeHandler));
apiRouter.delete('/likes/:targetType/:targetId(\\d+)', requireVerified, asyncHandler(interactController.unlikeHandler));
apiRouter.post('/bookmarks', requireVerified, asyncHandler(interactController.bookmarkHandler));
apiRouter.delete('/bookmarks/:postId(\\d+)', requireVerified, asyncHandler(interactController.unbookmarkHandler));
apiRouter.get('/bookmarks', requireAuth, asyncHandler(interactController.listBookmarksHandler));
apiRouter.post('/bookmark-folders', requireVerified, asyncHandler(interactController.createFolderHandler));

// ---- 草稿 ----
apiRouter.get('/draft', requireAuth, asyncHandler(draftController.getHandler));
apiRouter.put('/draft', requireAuth, asyncHandler(draftController.saveHandler));
apiRouter.delete('/draft', requireAuth, asyncHandler(draftController.clearHandler));

// ---- 上传 ----
apiRouter.post('/uploads/image', requireVerified, postImageUpload.single('file'), asyncHandler(uploadImageHandler));

// ---- 路由兜底 ----
apiRouter.use((_req, res) => {
  res.status(200).json({ code: 10004, message: '接口不存在', data: null });
});

async function uploadImageHandler(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(200).json({ code: 10001, message: '请选择图片文件', data: null });
    return;
  }
  ok(res, { url: `/uploads/posts/${file.filename}` });
}
