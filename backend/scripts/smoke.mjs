/**
 * 冒烟测试：覆盖第 1-3 步验收核心链路。
 * 前置：后端已启动（node src/server.ts）、Redis 已运行、已执行迁移与种子。
 * 运行：npm run smoke
 */
import Redis from 'ioredis';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
const stamp = String(Date.now()).slice(-8);

let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name} ${extra}`);
  }
}

async function call(path, { method = 'GET', body, token, cookie } = {}) {
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await resp.json();
  } catch {
    /* 空响应 */
  }
  const setCookie = resp.headers.getSetCookie?.() ?? [];
  const rt = setCookie.find((c) => c.startsWith('rt='));
  return { status: resp.status, body: json, rtCookie: rt ? rt.split(';')[0] : null };
}

async function main() {
  console.log(`冒烟测试 → ${BASE}`);

  // 清理限流键，避免重复运行被限流干扰
  for (const key of await redis.keys('rl:*')) await redis.del(key);
  for (const key of await redis.keys('act:*')) await redis.del(key);

  // ---- 基础 ----
  const health = await call('/health');
  check('health 接口可用', health.body?.code === 0);
  const boards = await call('/boards');
  check('板块列表返回 7 个板块', Array.isArray(boards.body?.data) && boards.body.data.length === 7);

  // ---- 超管登录（第 1 步验收） ----
  const adminLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'guo', password: '123456' } });
  check('guo/123456 登录成功', adminLogin.body?.code === 0, JSON.stringify(adminLogin.body));
  check('超管邮箱已认证', adminLogin.body?.data?.user?.emailVerified === true);
  check('超管角色为 SUPER_ADMIN', adminLogin.body?.data?.user?.role === 'SUPER_ADMIN');
  const adminToken = adminLogin.body?.data?.accessToken;
  const adminId = adminLogin.body?.data?.user?.id;
  const adminMe = await call('/auth/me', { token: adminToken });
  check('/auth/me 返回当前用户', adminMe.body?.data?.username === 'guo');

  // ---- 校验规则 ----
  const badName = await call('/auth/register', {
    method: 'POST',
    body: { username: 'ab', displayName: '测试', email: `a${stamp}@stu.campus.edu.cn`, password: 'abc12345' },
  });
  check('过短用户名被拒(20002)', badName.body?.code === 20002, JSON.stringify(badName.body));
  const badPwd = await call('/auth/register', {
    method: 'POST',
    body: { username: `smoke${stamp}`, displayName: '测试', email: `a${stamp}@stu.campus.edu.cn`, password: 'a b!456' },
  });
  check('含非法符号密码被拒(20003)', badPwd.body?.code === 20003, JSON.stringify(badPwd.body));
  const underscoreName = await call('/auth/register', {
    method: 'POST',
    body: { username: `smoke_${stamp}`, displayName: '测试', email: `u${stamp}@stu.campus.edu.cn`, password: 'smoke@123' },
  });
  check('用户名含下划线被拒(20002)', underscoreName.body?.code === 20002, JSON.stringify(underscoreName.body));

  // ---- 邮箱白名单 ----
  const noInvite = await call('/auth/register', {
    method: 'POST',
    body: { username: `smoke${stamp}`, displayName: '测试', email: `smoke${stamp}@qq.com`, password: 'smoke123456' },
  });
  check('非校园邮箱且无邀请码被拒(20006)', noInvite.body?.code === 20006, JSON.stringify(noInvite.body));

  // ---- 验证码注册流程 ----
  const email1 = `smoke${stamp}@stu.campus.edu.cn`;
  await call('/auth/email/code', { method: 'POST', body: { email: email1, scene: 'REGISTER' } });
  const reg1 = await call('/auth/register', {
    method: 'POST',
    body: { username: `smoke${stamp}`, displayName: '冒烟测试员', email: email1, password: 'smoke123456' },
  });
  check('校园邮箱注册成功', reg1.body?.code === 0, JSON.stringify(reg1.body));
  const code1 = await redis.get(`vcode:REGISTER:${email1}`);
  check('验证码已写入 Redis', Boolean(code1));
  const verify = await call('/auth/verify-email', { method: 'POST', body: { email: email1, code: code1 } });
  check('邮箱验证成功并自动登录', verify.body?.code === 0 && verify.body?.data?.user?.emailVerified === true, JSON.stringify(verify.body));
  let smokeToken = verify.body?.data?.accessToken;
  const smokeUserId = verify.body?.data?.user?.id;

  // ---- 邀请码注册流程 ----
  for (const key of await redis.keys('rl:register-ip:*')) await redis.del(key);
  const email2 = `smoke2${stamp}@qq.com`;
  await call('/auth/email/code', { method: 'POST', body: { email: email2, scene: 'REGISTER' } });
  const reg2 = await call('/auth/register', {
    method: 'POST',
    body: {
      username: `smokeb${stamp}`.slice(0, 20),
      displayName: '邀请码用户',
      email: email2,
      password: 'smoke@123456', // 新规则下 @ 为合法密码字符
      inviteCode: 'CAMPUS2026',
    },
  });
  check('邀请码注册成功', reg2.body?.code === 0, JSON.stringify(reg2.body));

  // ---- 资料 ----
  const upd = await call('/users/me', { method: 'PATCH', token: smokeToken, body: { displayName: '冒烟改的名', bio: 'smoke' } });
  check('昵称更新成功', upd.body?.data?.displayName === '冒烟改的名', JSON.stringify(upd.body));

  // ---- 头像上传 ----
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 't.png');
  const avatar = await call('/uploads/avatar', { method: 'POST', token: smokeToken, body: fd });
  check('头像上传成功', avatar.body?.code === 0 && String(avatar.body?.data?.avatarUrl ?? '').startsWith('/uploads/avatars/'), JSON.stringify(avatar.body));

  // ---- 登录失败锁定 ----
  for (let i = 0; i < 5; i++) {
    await call('/auth/login', { method: 'POST', body: { identifier: `nobody${stamp}`, password: 'wrong66' } });
  }
  const locked = await call('/auth/login', { method: 'POST', body: { identifier: `nobody${stamp}`, password: 'wrong66' } });
  check('连续失败触发登录锁定(20009)', locked.body?.code === 20009, JSON.stringify(locked.body));

  // ---- 忘记密码 ----
  await call('/auth/email/code', { method: 'POST', body: { email: email1, scene: 'RESET' } });
  const rcode = await redis.get(`vcode:RESET:${email1}`);
  check('重置验证码已写入 Redis', Boolean(rcode));
  const reset = await call('/auth/password/reset', {
    method: 'POST',
    body: { email: email1, code: rcode, password: 'smoke987654' },
  });
  check('重置密码成功', reset.body?.code === 0, JSON.stringify(reset.body));
  const relogin = await call('/auth/login', { method: 'POST', body: { identifier: `smoke${stamp}`, password: 'smoke987654' } });
  check('新密码可登录', relogin.body?.code === 0, JSON.stringify(relogin.body));
  smokeToken = relogin.body?.data?.accessToken;

  // ---- 刷新与登出 ----
  const adminCookie = adminLogin.rtCookie;
  check('登录下发 refresh Cookie', Boolean(adminCookie));
  const refreshed = await call('/auth/refresh', { method: 'POST', cookie: adminCookie });
  check('refresh 轮换出新 accessToken', refreshed.body?.code === 0 && Boolean(refreshed.body?.data?.accessToken), JSON.stringify(refreshed.body));
  const oldRefresh = await call('/auth/refresh', { method: 'POST', cookie: adminCookie });
  check('旧 refresh 已作废（轮换）', oldRefresh.body?.code !== 0);
  await call('/auth/logout', { method: 'POST', cookie: refreshed.rtCookie });
  const afterLogout = await call('/auth/refresh', { method: 'POST', cookie: refreshed.rtCookie });
  check('登出后 refresh 失效', afterLogout.body?.code !== 0);
  const anonMe = await call('/auth/me');
  check('未登录访问 /me 返回 401', anonMe.status === 401);

  // ========== 第 2 步：内容闭环 ==========
  const boardList = boards.body.data;
  const helpBoard = boardList.find((b) => b.slug === 'help');
  const treeholeBoard = boardList.find((b) => b.slug === 'treehole');
  const tagList = await call('/tags');
  const tagML = tagList.body?.data?.find((t) => t.slug === 'machine-learning');

  // 新账号沙箱：注册 <24h 的账号发帖进入审核队列（第 3 步验收）
  const sandboxPost = await call('/posts', {
    method: 'POST',
    token: smokeToken,
    body: { boardId: helpBoard.id, title: '沙箱测试帖：新账号首帖', content: '新账号发帖内容', isAnonymous: false, tagIds: [] },
  });
  check(
    '新账号发帖进入审核队列（沙箱）',
    sandboxPost.body?.code === 0 && sandboxPost.body?.data?.pending === true && sandboxPost.body?.data?.reason === 'SANDBOX',
    JSON.stringify(sandboxPost.body),
  );

  // 超管（老账号）发帖不受沙箱影响
  const created = await call('/posts', {
    method: 'POST',
    token: adminToken,
    body: {
      boardId: helpBoard.id,
      title: '冒烟测试帖：自动化测试怎么写',
      content: '这是冒烟测试帖子的正文。\n\n![配图](/uploads/seed/ml-lecture-hall.jpg)',
      isAnonymous: false,
      tagIds: tagML ? [tagML.id] : [],
    },
  });
  check('发帖成功且未进审核', created.body?.code === 0 && created.body?.data?.pending === false, JSON.stringify(created.body));
  const postId = created.body?.data?.id;

  const createdAnon = await call('/posts', {
    method: 'POST',
    token: adminToken,
    body: { boardId: treeholeBoard.id, title: '冒烟匿名帖', content: '匿名内容', isAnonymous: true, tagIds: [] },
  });
  check('匿名帖创建成功', createdAnon.body?.code === 0);
  const anonId = createdAnon.body?.data?.id;

  const feed = await call('/posts?sort=latest&limit=5');
  check('信息流置顶帖排最前', feed.body?.data?.items?.[0]?.isPinned === true);
  check('信息流条目含互动标志', typeof feed.body?.data?.items?.[0]?.viewerLiked === 'boolean');
  const feedAll = await call('/posts?sort=latest&limit=50');
  const anonItem = feedAll.body?.data?.items?.find((i) => i.id === anonId);
  check('信息流中匿名帖作者为空', anonItem && anonItem.author === null && anonItem.isAnonymous === true);
  check('信息流不含待审核帖', !feedAll.body?.data?.items?.some((i) => i.id === sandboxPost.body?.data?.id));

  const anonDetailAdmin = await call(`/posts/${anonId}`, { token: adminToken });
  check('管理视角可见匿名帖真实作者', anonDetailAdmin.body?.data?.realAuthorVisible === true);
  const anonDetailAnon = await call(`/posts/${anonId}`);
  check('匿名视角不可见真实作者', anonDetailAnon.body?.data?.realAuthorVisible === false && anonDetailAnon.body?.data?.author === null);

  const detail = await call(`/posts/${postId}`, { token: adminToken });
  check('详情返回正文与标签', String(detail.body?.data?.content ?? '').includes('冒烟测试帖') && detail.body?.data?.tags?.length === 1);
  check('详情缩略图提取成功', detail.body?.data?.thumbnailUrl === '/uploads/seed/ml-lecture-hall.jpg');

  const c1 = await call(`/posts/${postId}/comments`, { method: 'POST', token: smokeToken, body: { content: '冒烟一楼评论', isAnonymous: false } });
  check('一级评论创建成功', c1.body?.code === 0);
  const commentId = c1.body?.data?.id;
  const c2 = await call(`/posts/${postId}/comments`, {
    method: 'POST',
    token: adminToken,
    body: { content: '冒烟楼中楼回复', parentId: commentId, replyToUserId: smokeUserId },
  });
  check('楼中楼回复创建成功', c2.body?.code === 0, JSON.stringify(c2.body));
  const ctree = await call(`/posts/${postId}/comments`);
  check('评论树两级结构正确', ctree.body?.data?.[0]?.id === commentId && ctree.body?.data?.[0]?.replies?.length === 1);

  const acc = await call(`/posts/${postId}/accept`, { method: 'POST', token: adminToken, body: { commentId } });
  check('采纳答案成功', acc.body?.code === 0, JSON.stringify(acc.body));
  const detail2 = await call(`/posts/${postId}`);
  check('采纳后帖子转为已解决且含答案块', detail2.body?.data?.status === 'SOLVED' && detail2.body?.data?.acceptedComment?.id === commentId);

  const like = await call('/likes', { method: 'POST', token: smokeToken, body: { targetType: 'POST', targetId: postId } });
  check('点赞成功', like.body?.code === 0 && like.body?.data?.liked === true);
  const likeDup = await call('/likes', { method: 'POST', token: smokeToken, body: { targetType: 'POST', targetId: postId } });
  check('重复点赞被拒(40001)', likeDup.body?.code === 40001);
  const unlike = await call(`/likes/POST/${postId}`, { method: 'DELETE', token: smokeToken });
  check('取消点赞成功', unlike.body?.code === 0 && unlike.body?.data?.liked === false);

  const bm = await call('/bookmarks', { method: 'POST', token: smokeToken, body: { postId } });
  check('收藏成功', bm.body?.code === 0);
  const bmlist = await call('/bookmarks', { token: smokeToken });
  check('收藏列表包含该帖', bmlist.body?.data?.items?.some((i) => i.post.id === postId));

  const postUpd = await call(`/posts/${postId}`, { method: 'PATCH', token: adminToken, body: { title: '冒烟测试帖：自动化测试怎么写（改）' } });
  check('帖子编辑成功（30 分钟内免历史）', postUpd.body?.code === 0 && postUpd.body?.data?.revisionSaved === false);

  await call('/draft', { method: 'PUT', token: smokeToken, body: { title: '冒烟草稿', content: '草稿内容', boardId: helpBoard.id } });
  const dget = await call('/draft', { token: smokeToken });
  check('草稿保存并读回', dget.body?.data?.title === '冒烟草稿');

  const delPost = await call(`/posts/${anonId}`, { method: 'DELETE', token: adminToken });
  check('帖子软删除成功', delPost.body?.code === 0);
  const gone = await call(`/posts/${anonId}`);
  check('已删帖子详情 404', gone.status === 404);

  const stats = await call('/stats');
  check('社区数据接口可用', typeof stats.body?.data?.totalPosts === 'number');

  // ========== 第 3 步：发现与治理 ==========
  // 敏感词
  const blockedPost = await call('/posts', {
    method: 'POST',
    token: adminToken,
    body: { boardId: helpBoard.id, title: '正常标题', content: '提供代刷服务，价格美丽', isAnonymous: false, tagIds: [] },
  });
  check('敏感词 BLOCK 拦截发帖(30004)', blockedPost.body?.code === 30004, JSON.stringify(blockedPost.body));
  const blockedComment = await call(`/posts/${postId}/comments`, {
    method: 'POST',
    token: smokeToken,
    body: { content: '有兼职日结的活吗', isAnonymous: false },
  });
  check('敏感词 BLOCK 拦截评论(30004)', blockedComment.body?.code === 30004, JSON.stringify(blockedComment.body));

  // 新账号发帖频率限制（3/天）
  await call('/posts', { method: 'POST', token: smokeToken, body: { boardId: helpBoard.id, title: '限流测试帖二', content: '内容二', isAnonymous: false, tagIds: [] } });
  await call('/posts', { method: 'POST', token: smokeToken, body: { boardId: helpBoard.id, title: '限流测试帖三', content: '内容三', isAnonymous: false, tagIds: [] } });
  const limited = await call('/posts', {
    method: 'POST',
    token: smokeToken,
    body: { boardId: helpBoard.id, title: '限流测试帖四', content: '内容四', isAnonymous: false, tagIds: [] },
  });
  check('新账号发帖超限返回 10005 并提示等待', limited.body?.code === 10005 && /小时|秒/.test(limited.body?.message ?? ''), JSON.stringify(limited.body));

  // 搜索
  const search = await call('/search?q=机器学习');
  check('搜索「机器学习」命中标题与正文', (search.body?.data?.items ?? []).some((i) => i.title.includes('机器学习')), JSON.stringify(search.body?.data?.items?.slice(0, 2)));
  const searchBoard = await call('/search?q=机器学习&board=course');
  check('搜索可按板块过滤', (searchBoard.body?.data?.items ?? []).length > 0 && (searchBoard.body?.data?.items ?? []).every((i) => i.board.slug === 'course'));

  // 热榜
  const hot = await call('/hot');
  check('热榜接口返回非空 Top 榜', Array.isArray(hot.body?.data) && hot.body.data.length > 0);

  // 举报闭环
  const rep1 = await call('/reports', { method: 'POST', token: smokeToken, body: { targetType: 'POST', targetId: postId, reason: '垃圾广告', detail: '冒烟举报测试' } });
  check('举报提交成功', rep1.body?.code === 0, JSON.stringify(rep1.body));
  const repDup = await call('/reports', { method: 'POST', token: smokeToken, body: { targetType: 'POST', targetId: postId, reason: '垃圾广告' } });
  check('重复举报被拒(40004)', repDup.body?.code === 40004);
  const repSelf = await call('/reports', { method: 'POST', token: adminToken, body: { targetType: 'POST', targetId: postId, reason: '垃圾广告' } });
  check('举报自己被拒(40003)', repSelf.body?.code === 40003);

  // 管理后台
  const forbidden = await call('/admin/stats', { token: smokeToken });
  check('非管理员访问后台被拒(403)', forbidden.status === 403);
  const adminStats = await call('/admin/stats', { token: adminToken });
  check('管理员看板数据返回', adminStats.body?.code === 0 && typeof adminStats.body?.data?.pendingReports === 'number');

  const repList = await call('/admin/reports?status=PENDING', { token: adminToken });
  check('管理端举报队列包含新举报', (repList.body?.data?.items ?? []).some((r) => r.id === rep1.body?.data?.id));
  const handled = await call(`/admin/reports/${rep1.body?.data?.id}/handle`, {
    method: 'POST',
    token: adminToken,
    body: { action: 'REJECTED', handleNote: '内容无违规' },
  });
  check('举报处理成功并产生回执通知', handled.body?.code === 0 && handled.body?.data?.status === 'REJECTED', JSON.stringify(handled.body));

  // 用户管理：禁言/解禁
  const userList = await call(`/admin/users?q=${`smokeb${stamp}`.slice(0, 20)}`, { token: adminToken });
  const targetUser = userList.body?.data?.items?.[0];
  check('管理端用户检索可用', Boolean(targetUser));
  if (targetUser) {
    const mute = await call(`/admin/users/${targetUser.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'MUTED', mutedUntil: new Date(Date.now() + 3600 * 1000).toISOString() },
    });
    check('禁言操作成功', mute.body?.data?.status === 'MUTED', JSON.stringify(mute.body));
    const unmute = await call(`/admin/users/${targetUser.id}`, { method: 'PATCH', token: adminToken, body: { status: 'ACTIVE', mutedUntil: null } });
    check('解除禁言成功', unmute.body?.data?.status === 'ACTIVE');
  }

  // 内容管理：加精 / 取消加精 / 下架恢复
  const feat = await call(`/admin/posts/${postId}/action`, { method: 'POST', token: adminToken, body: { action: 'FEATURE' } });
  check('加精操作成功', feat.body?.data?.isFeatured === true, JSON.stringify(feat.body));
  await call(`/admin/posts/${postId}/action`, { method: 'POST', token: adminToken, body: { action: 'UNFEATURE' } });
  const removed = await call(`/admin/posts/${postId}/action`, { method: 'POST', token: adminToken, body: { action: 'REMOVE' } });
  check('下架操作成功', removed.body?.data?.status === 'REMOVED');
  const removedDetail = await call(`/posts/${postId}`);
  check('下架后前台不可见', removedDetail.status === 404);
  const restored = await call(`/admin/posts/${postId}/action`, { method: 'POST', token: adminToken, body: { action: 'RESTORE' } });
  check('恢复操作成功', restored.body?.data?.status === 'SOLVED' || restored.body?.data?.status === 'NORMAL', JSON.stringify(restored.body));

  // 审计日志
  const audit = await call('/admin/audit-logs', { token: adminToken });
  check('审计日志已记录管理操作', (audit.body?.data?.items ?? []).length > 0);

  // 敏感词 CRUD
  const wadd = await call('/admin/sensitive-words', { method: 'POST', token: adminToken, body: { word: '冒烟敏感词', level: 'BLOCK' } });
  check('敏感词新增成功', wadd.body?.code === 0, JSON.stringify(wadd.body));
  const wdel = await call(`/admin/sensitive-words/${wadd.body?.data?.id}`, { method: 'DELETE', token: adminToken });
  check('敏感词删除成功', wdel.body?.code === 0);

  // 用户主页
  const profile = await call('/users/shenzhiwei');
  check('用户主页资料返回', profile.body?.data?.displayName === '沈知微' && profile.body?.data?.stats?.acceptedCount >= 1, JSON.stringify(profile.body?.data?.stats));
  const uposts = await call('/users/shenzhiwei/posts');
  check('用户帖子 Tab 可用', typeof uposts.body?.data?.total === 'number');
  const ucomments = await call('/users/shenzhiwei/comments');
  check('用户评论 Tab 可用', typeof ucomments.body?.data?.total === 'number');
  const ulikes = await call('/users/me/likes', { token: smokeToken });
  check('我的点赞列表可用', typeof ulikes.body?.data?.total === 'number');

  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error('冒烟测试异常:', err);
    process.exitCode = 1;
  })
  .finally(() => redis.quit());
