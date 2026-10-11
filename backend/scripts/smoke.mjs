/**
 * 冒烟测试：覆盖第 1 步验收的核心链路。
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
  const adminMe = await call('/auth/me', { token: adminLogin.body?.data?.accessToken });
  check('/auth/me 返回当前用户', adminMe.body?.data?.username === 'guo');

  // ---- 校验规则（验收：提示前后端一致） ----
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

  // ---- 邮箱白名单（验收：非白名单被拒并提示邀请码） ----
  const noInvite = await call('/auth/register', {
    method: 'POST',
    body: { username: `smoke${stamp}`, displayName: '测试', email: `smoke${stamp}@qq.com`, password: 'smoke123456' },
  });
  check('非校园邮箱且无邀请码被拒(20006)', noInvite.body?.code === 20006, JSON.stringify(noInvite.body));

  // ---- 验证码注册流程（校园邮箱） ----
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
  const smokeToken = verify.body?.data?.accessToken;
  const me2 = await call('/auth/me', { token: smokeToken });
  check('新用户 token 可访问 /me', me2.body?.data?.username === `smoke${stamp}`);

  // ---- 邀请码注册流程 ----
  // 本脚本的多个校验用例已用掉注册限流额度（5/小时/IP），此处清桶以免脚本自我触发限流
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

  // ---- 刷新与登出（Cookie 会话） ----
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

  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error('冒烟测试异常:', err);
    process.exitCode = 1;
  })
  .finally(() => redis.quit());
