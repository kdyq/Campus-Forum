/**
 * 种子数据（开发文档 §3.4）：内容与设计稿保持一致，README 截图可直接对照。
 * 包含：超管 guo（种子直建，弱密码 123456 仅限开发环境，上线前必须替换）、
 * 7 个板块、12 个标签、3 门课程、2 个邀请码、8 位演示用户、
 * 9 条演示帖子（置顶 1、已解决 1、精华 1、匿名 1、带图 2）与部分评论互动。
 * 重复执行会先清空业务数据再重建。
 *
 * 运行：npm run seed
 */
import '../src/config/env.ts';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';
import { prisma } from '../src/utils/prisma.ts';
import { ensureFulltextIndex } from '../src/utils/db.ts';
import { POST_STATUS, ROLES } from '../src/constants/enums.ts';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

async function wipe(): Promise<void> {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'View', 'Like', 'PostTag', 'TagSynonym', 'Comment', 'PostRevision', 'Bookmark', 'BookmarkFolder',
    'Follow', 'Notification', 'Report', 'Draft', 'CourseReview', 'AuditLog', 'Announcement',
    'SensitiveWord', '_BoardModerators', 'Post', 'Course', 'Tag', 'Board', 'InviteCode', 'User',
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

function excerptOf(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

async function main(): Promise<void> {
  console.log('清空旧数据…');
  await wipe();

  // ---- 超级管理员（硬性约束：种子直建，不走注册） ----
  const adminHash = await bcrypt.hash('123456', 10);
  const guo = await prisma.user.create({
    data: {
      username: 'guo',
      displayName: '郭老师',
      passwordHash: adminHash,
      email: 'guo@campus.edu.cn',
      emailVerified: true, // 默认邮箱已认证
      role: ROLES.SUPER_ADMIN,
      bio: '教务处 · 社区管理员',
    },
  });

  // ---- 邀请码（供无校园邮箱的新生与教职工注册） ----
  await prisma.inviteCode.createMany({
    data: [
      { code: 'CAMPUS2026', createdById: guo.id, maxUses: 100 },
      { code: 'XINSHENG88', createdById: guo.id, maxUses: 50 },
    ],
  });

  // ---- 板块 ----
  const boardDefs = [
    { name: '求助', slug: 'help', description: '提问、找人、找东西，问完记得采纳答案', order: 1 },
    { name: '课程', slug: 'course', description: '选课、复习、课程评价，经验的沉淀地', order: 2 },
    { name: '校园生活', slug: 'life', description: '食堂、宿舍、校园八卦与日常', order: 3 },
    { name: '社团', slug: 'club', description: '招新、活动、找队友', order: 4 },
    { name: '二手', slug: 'market', description: '闲置流转，毕业带不走就留给学弟学妹', order: 5 },
    { name: '树洞', slug: 'treehole', description: '匿名说点心里话', order: 6 },
    { name: '公告', slug: 'notice', description: '社区公告与规范', order: 7 },
  ];
  const boards: Record<string, { id: number }> = {};
  for (const b of boardDefs) {
    boards[b.slug] = await prisma.board.create({ data: b });
  }

  // ---- 标签 ----
  const tagDefs = [
    { name: '机器学习', slug: 'machine-learning', isOfficial: true },
    { name: '选课', slug: 'xuanke' },
    { name: '期末考试', slug: 'final-exam' },
    { name: '数据结构', slug: 'data-structure', isOfficial: true },
    { name: '图书馆', slug: 'library' },
    { name: '食堂', slug: 'canteen' },
    { name: '社团招新', slug: 'club-recruit' },
    { name: '失物招领', slug: 'lost-found' },
    { name: '校园卡', slug: 'campus-card' },
    { name: '宿舍', slug: 'dormitory' },
    { name: '考研', slug: 'postgraduate-exam' },
    { name: '社团', slug: 'club' },
  ];
  const tags: Record<string, { id: number }> = {};
  for (const t of tagDefs) {
    tags[t.slug] = await prisma.tag.create({ data: t });
  }

  // ---- 课程 ----
  const courses: Record<string, { id: number }> = {};
  for (const c of [
    { name: '机器学习', code: 'CS3012', department: '计算机学院', teacher: '王一舟' },
    { name: '数据结构', code: 'CS2011', department: '计算机学院', teacher: '李慧兰' },
    { name: '概率论与数理统计', code: 'MA2003', department: '数学学院', teacher: '张明远' },
  ]) {
    courses[c.code] = await prisma.course.create({ data: c });
  }

  // ---- 演示用户（密码统一 demo123456，邮箱已认证） ----
  const demoHash = await bcrypt.hash('demo123456', 10);
  const userDefs = [
    { username: 'linxiaomeng', displayName: '林晓萌', college: '计算机学院', grade: '2024级', major: '软件工程', level: 3, exp: 280, bio: '大二软工，图书馆常驻选手' },
    { username: 'chenziang', displayName: '陈子昂', college: '文学院', grade: '2023级', major: '汉语言文学', level: 2, exp: 130, bio: '读书，写字，偶尔发呆' },
    { username: 'zhouyuan', displayName: '周予安', college: '计算机学院', grade: '2022级', major: '计算机科学与技术', level: 5, exp: 640, bio: '保研边缘人，爱答技术题' },
    { username: 'suyining', displayName: '苏亦宁', college: '经济管理学院', grade: '2024级', major: '会计学', level: 2, exp: 95, bio: '食堂测评爱好者' },
    { username: 'zhengnanzhi', displayName: '郑南栀', college: '美术学院', grade: '2023级', major: '视觉传达设计', level: 3, exp: 210, bio: '机器人队的美术担当' },
    { username: 'heyanqing', displayName: '何砚清', college: '物理学院', grade: '2022级', major: '应用物理学', level: 4, exp: 455, bio: '实验室与自习室两点一线' },
    { username: 'shenzhiwei', displayName: '沈知微', college: '计算机学院', grade: '2023级', major: '人工智能', level: 6, exp: 920, bio: '热心答疑，问题交给我' },
    { username: 'lumingchuan', displayName: '陆铭川', college: '机械工程学院', grade: '2024级', major: '机械设计制造及其自动化', level: 1, exp: 40, bio: '刚入学，一切都很新鲜' },
  ];
  const users: Record<string, { id: number }> = { guo: { id: guo.id } };
  for (const u of userDefs) {
    users[u.username] = await prisma.user.create({
      data: { ...u, passwordHash: demoHash, email: `${u.username}@stu.campus.edu.cn`, emailVerified: true },
    });
  }

  // ---- 种子图片（来自设计稿资产，落盘到 backend/uploads/seed 供帖子引用） ----
  const seedImgDir = path.resolve(import.meta.dirname, '../uploads/seed');
  const designImgDir = path.resolve(import.meta.dirname, '../../design/assets/img');
  mkdirSync(seedImgDir, { recursive: true });
  for (const img of ['ml-lecture-hall.jpg', 'library-stacks.jpg']) {
    try {
      copyFileSync(path.join(designImgDir, img), path.join(seedImgDir, img));
    } catch {
      console.warn(`跳过种子图片 ${img}（设计稿资产缺失）`);
    }
  }

  // ---- 演示帖子（标题取自设计稿） ----
  interface PostDef {
    key: string;
    board: string;
    author: string;
    title: string;
    content: string;
    hoursAgo: number;
    isAnonymous?: boolean;
    isPinned?: boolean;
    isFeatured?: boolean;
    status?: string;
    course?: string;
    tags?: string[];
    viewCount: number;
    likeCount: number;
    bookmarkCount: number;
  }

  const postDefs: PostDef[] = [
    {
      key: 'p1', board: 'notice', author: 'guo',
      title: '关于社区使用规范与教育邮箱认证的说明',
      content: `欢迎大家来到「同窗」。为了维护讨论质量，请留意以下事项：

**1. 注册与认证**
- 使用校园邮箱（edu.cn 后缀）注册后，请及时完成邮箱验证，验证通过才能发帖与评论；
- 没有校园邮箱的新生与教职工，可以联系管理员获取邀请码。

**2. 发帖规范**
- 求助类帖子请描述清楚背景与已尝试的方法，问题解决后记得采纳最佳答案；
- 禁止发布广告、刷屏与站外引流内容；
- 尊重他人，理性讨论，违者将按社区规范处理。

祝大家在同窗聊得开心、问有所答。`,
      hoursAgo: 240, isPinned: true, viewCount: 862, likeCount: 12, bookmarkCount: 4,
    },
    {
      key: 'p2', board: 'course', author: 'linxiaomeng',
      title: '有人选过机器学习这门课吗？作业量怎么样',
      content: `下学期想选 CS 3012 机器学习，想请修过的同学说说真实情况：

- 作业量到底怎么样？听说每周都有编程作业？
- 期末是闭卷还是大作业？
- 老师的给分风格如何？

附一张上周蹭课时拍的照片，教室挤到走道都坐满了。

![机器学习课堂](/uploads/seed/ml-lecture-hall.jpg)

先谢过各位学长学姐！`,
      hoursAgo: 72, course: 'CS3012', tags: ['machine-learning', 'xuanke'], viewCount: 1240, likeCount: 56, bookmarkCount: 31,
    },
    {
      key: 'p3', board: 'course', author: 'zhouyuan',
      title: '整理了一份《数据结构》期末复习提纲，自取',
      content: `期末临近，把李慧兰老师班上三年的考点整理成了一份提纲，覆盖：

1. 线性表与顺序存储的易错点
2. 树与二叉树的遍历推导题套路
3. 图算法（Dijkstra、Prim、拓扑排序）的常见出题角度
4. 排序算法的稳定性与复杂度对照表

复习建议：先过提纲再刷往年题，提纲第 4 节的对照表建议默写一遍。祝大家期末顺利，评论区可以交流答疑。`,
      hoursAgo: 96, isFeatured: true, course: 'CS2011', tags: ['data-structure', 'final-exam'], viewCount: 983, likeCount: 73, bookmarkCount: 52,
    },
    {
      key: 'p4', board: 'help', author: 'heyanqing',
      title: '三教 305 的投影仪这周坏了三次，有人管吗',
      content: `这周在三教 305 上课，投影仪坏了三次，每次都是中途突然黑屏，重启要十分钟，严重影响进度。

已经跟任课老师反映过，老师说报修了但一直没人来处理。想问一下有没有同学知道设备报修的跟进渠道？或者哪个部门管这个事比较管用？`,
      hoursAgo: 30, viewCount: 431, likeCount: 9, bookmarkCount: 0,
    },
    {
      key: 'p5', board: 'help', author: 'linxiaomeng',
      title: '图书馆四楼靠窗的座位为什么永远抢不到',
      content: `如题。开学以来就想找个靠窗有插座的座位，结果每次去四楼都排到走廊了。

想问问经常泡图书馆的同学：

1. 四楼靠窗的座位是不是只有期末才抢得到？
2. 有没有相对固定的人少的时段？

附上今天下午三点的「战况」，一眼望过去全是书。

![图书馆四楼](/uploads/seed/library-stacks.jpg)`,
      hoursAgo: 48, status: POST_STATUS.SOLVED, tags: ['library'], viewCount: 1521, likeCount: 64, bookmarkCount: 8,
    },
    {
      key: 'p6', board: 'life', author: 'chenziang',
      title: '关于宿舍十一点断网，我把意见整理成了一封信',
      content: `断网政策实行以来，不少同学反映赶 due 时非常受影响。我把大家的意见整理成了一封信，准备通过学代会渠道提交，主要内容：

- 请求将断网时间延后至零点（至少考试周试行）；
- 请求对毕业班与有科研需求的同学开放申请制豁免；
- 建议同步公示断网政策的依据与评估方式。

如果你也同意，或者有补充意见，请在评论区留言，我会一并整理进信里。`,
      hoursAgo: 120, tags: ['dormitory'], viewCount: 612, likeCount: 38, bookmarkCount: 3,
    },
    {
      key: 'p7', board: 'club', author: 'zhengnanzhi',
      title: '机器人队招新，缺一个做视觉的同学',
      content: `校机器人队备战下赛季 RoboMaster，目前机械和电控都齐了，视觉组还缺人！

要求：会一点 Python 或 C++，对 OpenCV 感兴趣，愿意每周投入两个晚上。有深度学习基础更好，没有也没关系，队里有完整的培训。

报名方式：评论区留言或私聊我，本周日在工训中心 204 有宣讲，欢迎来玩。`,
      hoursAgo: 60, tags: ['club-recruit', 'club'], viewCount: 352, likeCount: 21, bookmarkCount: 2,
    },
    {
      key: 'p8', board: 'treehole', author: 'suyining',
      title: '今天鼓起勇气说一句：其实我很想家',
      content: `来学校两个月了，表面上适应得挺好，室友都说我开朗。但昨晚吃到食堂的一道菜，突然特别想我妈做的味道，差点在座位上哭出来。

今天想说一句：其实我很想家。有没有人也是这样的？`,
      hoursAgo: 20, isAnonymous: true, viewCount: 243, likeCount: 15, bookmarkCount: 0,
    },
    {
      key: 'p9', board: 'market', author: 'lumingchuan',
      title: '出九成新 Kindle Paperwhite，毕业学长忍痛割爱',
      content: `学长毕业清理行李，出一台 Kindle Paperwhite 4：

- 8G 版本，墨水屏无划痕，电池健康
- 附原装磁吸保护套与数据线
- 情怀价 199，支持当面验货（可约图书馆门口或宿舍楼下）

有意向的同学评论区或私聊，先到先得。`,
      hoursAgo: 12, viewCount: 184, likeCount: 6, bookmarkCount: 1,
    },
  ];

  const posts: Record<string, { id: number }> = {};
  for (const p of postDefs) {
    const created = hoursAgo(p.hoursAgo);
    posts[p.key] = await prisma.post.create({
      data: {
        boardId: boards[p.board].id,
        authorId: users[p.author].id,
        isAnonymous: p.isAnonymous ?? false,
        title: p.title,
        content: p.content,
        excerpt: excerptOf(p.content),
        courseId: p.course ? courses[p.course].id : null,
        status: p.status ?? POST_STATUS.NORMAL,
        isPinned: p.isPinned ?? false,
        isFeatured: p.isFeatured ?? false,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        bookmarkCount: p.bookmarkCount,
        createdAt: created,
        lastActivityAt: created,
      },
    });
    for (const tagSlug of p.tags ?? []) {
      await prisma.postTag.create({ data: { postId: posts[p.key].id, tagId: tags[tagSlug].id } });
    }
  }

  // ---- 评论与互动 ----
  const c5a = await prisma.comment.create({
    data: {
      postId: posts.p5.id, authorId: users.shenzhiwei.id,
      content: '四楼东侧靠窗那排人最少，下午两点到四点是空窗期，亲测有效。当然，期末周除外——期末周神仙都抢不到。',
      likeCount: 12, createdAt: hoursAgo(44),
    },
  });
  const c5b = await prisma.comment.create({
    data: {
      postId: posts.p5.id, authorId: users.chenziang.id,
      content: '抢不到四楼就去三楼吧，三楼靠窗也是好位置，而且离饮水机近。',
      likeCount: 4, createdAt: hoursAgo(42),
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts.p5.id, authorId: users.linxiaomeng.id, parentId: c5a.id, replyToUserId: users.shenzhiwei.id,
      content: '谢谢！明天下午就去蹲点，蹲到了请你喝奶茶。',
      likeCount: 1, createdAt: hoursAgo(40),
    },
  });
  const c2a = await prisma.comment.create({
    data: {
      postId: posts.p2.id, authorId: users.zhouyuan.id,
      content: '上学期刚修完。作业量中等偏上，每周一次编程作业，用 Python 实现，认真写大概四五个小时。期末是大作业加闭卷，闭卷部分考概念和推导，老师会划重点。',
      likeCount: 8, createdAt: hoursAgo(70),
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts.p2.id, authorId: users.heyanqing.id, parentId: c2a.id, replyToUserId: users.zhouyuan.id,
      content: '闭卷是全靠理解还是背公式就行？我数学底子一般，有点慌。',
      likeCount: 2, createdAt: hoursAgo(68),
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts.p4.id, authorId: users.lumingchuan.id,
      content: '我们班也在那上课，任课老师已经报修了，说是投影仪灯泡停产在等配件，估计还得等一阵。',
      likeCount: 3, createdAt: hoursAgo(26),
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts.p8.id, authorId: users.zhengnanzhi.id,
      content: '抱抱，想家就每周给爸妈打个视频呀。我刚来的时候也这样，后来和室友约好每周日晚上一起给家里打电话，就好多了。',
      likeCount: 6, createdAt: hoursAgo(16),
    },
  });

  // 采纳最佳答案：p5 状态转「已解决」，答主获得经验值
  await prisma.post.update({
    where: { id: posts.p5.id },
    data: { acceptedCommentId: c5a.id, commentCount: 3 },
  });
  await prisma.comment.update({ where: { id: c5a.id }, data: { likeCount: 15 } });
  await prisma.user.update({ where: { id: users.shenzhiwei.id }, data: { exp: { increment: 30 } } });
  await prisma.post.update({ where: { id: posts.p2.id }, data: { commentCount: 2 } });
  await prisma.post.update({ where: { id: posts.p4.id }, data: { commentCount: 1 } });
  await prisma.post.update({ where: { id: posts.p8.id }, data: { commentCount: 1 } });

  // 点赞记录（计数器为演示数值，此处仅落互动明细供「已赞」判断）
  await prisma.like.createMany({
    data: [
      { userId: users.zhouyuan.id, targetType: 'POST', targetId: posts.p5.id },
      { userId: users.suyining.id, targetType: 'POST', targetId: posts.p5.id },
      { userId: users.lumingchuan.id, targetType: 'POST', targetId: posts.p5.id },
      { userId: users.linxiaomeng.id, targetType: 'POST', targetId: posts.p3.id },
      { userId: users.chenziang.id, targetType: 'POST', targetId: posts.p2.id },
      { userId: users.shenzhiwei.id, targetType: 'POST', targetId: posts.p2.id },
      { userId: users.suyining.id, targetType: 'POST', targetId: posts.p6.id },
      { userId: users.zhengnanzhi.id, targetType: 'POST', targetId: posts.p8.id },
      { userId: users.linxiaomeng.id, targetType: 'COMMENT', targetId: c5a.id },
      { userId: users.zhouyuan.id, targetType: 'COMMENT', targetId: c5a.id },
    ],
  });

  // 标签计数
  await prisma.tag.update({ where: { slug: 'machine-learning' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'xuanke' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'data-structure' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'final-exam' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'library' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'dormitory' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'club-recruit' }, data: { postCount: { increment: 1 } } });
  await prisma.tag.update({ where: { slug: 'club' }, data: { postCount: { increment: 1 } } });

  await ensureFulltextIndex();
  console.log('种子数据完成：超管 guo、7 板块、12 标签、3 课程、8 演示用户、9 帖子、7 评论、10 点赞');
  console.log('演示账号：guo/123456（超管）；演示用户统一密码 demo123456；邀请码 CAMPUS2026 / XINSHENG88');
}

main()
  .catch((err) => {
    console.error('种子执行失败:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
