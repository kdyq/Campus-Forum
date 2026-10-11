<script setup lang="ts">
// 课程主页（差异化核心）：课程信息卡 + 结构化评分 + 该课全部讨论
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { fetchCourse, submitCourseReview, type CourseDetail } from '@/api/course';
import { timeAgo } from '@/utils/format';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();
const code = computed(() => String(route.params.code ?? ''));

const course = ref<CourseDetail | null>(null);
const loading = ref(true);
const loadError = ref(false);
const reviewVisible = ref(false);
const submitting = ref(false);
const reviewForm = ref({ rating: 4, workload: 3, attendance: 2, recommend: 4, content: '', isAnonymous: true });

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    course.value = await fetchCourse(code.value);
    document.title = `${course.value.name}（${course.value.code}）· 同窗`;
    if (course.value.myReview) {
      reviewForm.value = { ...course.value.myReview, content: course.value.myReview.content ?? '', isAnonymous: true };
    }
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function openReview() {
  if (!session.user) {
    ElMessage.warning('登录并完成验证后即可评分');
    return;
  }
  reviewVisible.value = true;
}

async function submitReview() {
  submitting.value = true;
  try {
    await submitCourseReview(course.value!.id, { ...reviewForm.value });
    ElMessage.success('评分已提交');
    reviewVisible.value = false;
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '评分提交失败');
  } finally {
    submitting.value = false;
  }
}

const SCORE_LABELS: { key: 'ratingScore' | 'workloadScore' | 'attendanceScore' | 'recommendScore'; label: string; hint: string }[] = [
  { key: 'ratingScore', label: '综合评分', hint: '越接近 5 分评价越好' },
  { key: 'workloadScore', label: '作业量', hint: '越接近 5 分作业越多' },
  { key: 'attendanceScore', label: '点名频率', hint: '越接近 5 分点名越勤' },
  { key: 'recommendScore', label: '推荐度', hint: '越接近 5 分越值得选' },
];

onMounted(load);
</script>

<template>
  <main class="page">
    <div v-if="loading" class="panel"><p class="loading-hint">加载中…</p></div>
    <div v-else-if="loadError || !course" class="panel">
      <p class="loading-hint">课程不存在</p>
      <RouterLink to="/"><el-button plain>返回首页</el-button></RouterLink>
    </div>
    <template v-else>
      <!-- 课程信息卡 -->
      <section class="panel course-head">
        <div class="course-info">
          <h1 class="course-name">{{ course.name }}</h1>
          <p class="course-code tw-meta">{{ course.code }}<template v-if="course.department"> · {{ course.department }}</template><template v-if="course.teacher"> · {{ course.teacher }}</template></p>
          <div class="course-actions">
            <RouterLink :to="{ name: 'post-new', query: { courseId: course.id } }">
              <el-button type="primary">发帖讨论</el-button>
            </RouterLink>
            <el-button @click="openReview">{{ course.myReview ? '修改我的评分' : '我要评分' }}</el-button>
          </div>
        </div>
        <div class="course-score-box">
          <p class="big-score">{{ course.ratingScore !== null ? course.ratingScore.toFixed(1) : '—' }}</p>
          <p class="score-sub tw-meta">{{ course.ratingCount }} 人评分</p>
        </div>
      </section>

      <!-- 结构化评分 -->
      <section class="panel">
        <h2 class="section-title">结构化评分</h2>
        <div class="score-grid">
          <div v-for="s in SCORE_LABELS" :key="s.key" class="score-item">
            <el-tooltip :content="s.hint"><span class="score-label">{{ s.label }}</span></el-tooltip>
            <div class="score-track"><div class="score-fill" :style="{ width: `${((course[s.key] ?? 0) / 5) * 100}%` }"></div></div>
            <span class="score-num">{{ course[s.key] !== null ? (course[s.key] as number).toFixed(1) : '—' }}</span>
          </div>
        </div>
        <ul v-if="course.reviews.length > 0" class="review-list tw-hairline-list">
          <li v-for="r in course.reviews" :key="r.id" class="review-item">
            <div class="review-head">
              <b class="review-author">{{ r.authorName }}</b>
              <span class="tw-meta">综合 {{ r.rating }} · 作业 {{ r.workload }} · 点名 {{ r.attendance }} · 推荐 {{ r.recommend }}</span>
              <span class="tw-meta review-time">{{ timeAgo(r.createdAt) }}</span>
            </div>
            <p v-if="r.content" class="review-content">{{ r.content }}</p>
          </li>
        </ul>
        <p v-else class="empty-hint">还没有评分，第一个来评的就是你</p>
      </section>

      <!-- 讨论聚合 -->
      <section class="panel">
        <h2 class="section-title">课程讨论 <span class="tw-meta">{{ course.postCount }}</span></h2>
        <ul v-if="course.discussions.length > 0" class="disc-list tw-hairline-list">
          <li v-for="d in course.discussions" :key="d.id">
            <RouterLink :to="{ name: 'post-detail', params: { id: d.id } }" class="disc-item">
              <span class="disc-title">{{ d.title }}</span>
              <span class="disc-meta tw-meta">{{ d.boardName }} · {{ d.authorName }} · {{ timeAgo(d.lastActivityAt) }} · 评论 {{ d.commentCount }} · 赞 {{ d.likeCount }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="empty-hint">这门课还没有讨论帖，去发第一帖</p>
      </section>
    </template>

    <!-- 评分弹窗 -->
    <el-dialog v-model="reviewVisible" title="课程评分" width="460px">
      <el-form label-position="top">
        <el-form-item v-for="(cfg, key) in { rating: '综合评分', workload: '作业量（1 少 - 5 多）', attendance: '点名频率（1 少 - 5 勤）', recommend: '推荐度' }" :key="key" :label="cfg">
          <el-rate v-model="(reviewForm as any)[key]" :max="5" />
        </el-form-item>
        <el-form-item label="补充说明（选填）">
          <el-input v-model="reviewForm.content" type="textarea" :rows="3" maxlength="2000" placeholder="给学弟学妹的选课建议…" />
        </el-form-item>
        <el-checkbox v-model="reviewForm.isAnonymous">匿名评分</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交评分</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 22px 26px;
}

.course-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
}

.course-name {
  margin: 0;
  font-size: var(--tw-fs-display);
  font-weight: 600;
  color: var(--tw-ink);
}

.course-code {
  margin: 6px 0 14px;
}

.course-actions {
  display: flex;
  gap: 10px;
}

.course-score-box {
  text-align: center;
  flex: none;
}

.big-score {
  margin: 0;
  font-family: var(--tw-font-mono);
  font-size: 44px;
  font-weight: 700;
  color: var(--tw-accent);
  line-height: 1.1;
}

.score-sub {
  margin: 4px 0 0;
}

.section-title {
  margin: 2px 0 14px;
  font-size: var(--tw-fs-title);
  font-weight: 600;
  color: var(--tw-ink);
}

.score-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-label {
  width: 72px;
  flex: none;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
}

.score-track {
  flex: 1;
  height: 8px;
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-pill);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: var(--tw-accent);
  border-radius: var(--tw-r-pill);
}

.score-num {
  width: 36px;
  text-align: right;
  font-family: var(--tw-font-mono);
  font-size: 13px;
  color: var(--tw-ink);
}

.review-item {
  padding: 12px 4px;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.review-author {
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
}

.review-time {
  margin-left: auto;
}

.review-content {
  margin: 6px 0 0;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
  line-height: var(--tw-lh-body-sm);
  white-space: pre-wrap;
}

.disc-item {
  display: block;
  padding: 12px 4px;
}

.disc-item:hover .disc-title {
  color: var(--tw-accent-ink);
}

.disc-title {
  display: block;
  font-size: var(--tw-fs-body);
  font-weight: 500;
  color: var(--tw-ink);
}

.disc-meta {
  display: block;
  margin-top: 4px;
}

.loading-hint,
.empty-hint {
  text-align: center;
  color: var(--tw-ink-3);
  padding: 20px 0;
  font-size: var(--tw-fs-body-sm);
}

@media (max-width: 640px) {
  .course-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
