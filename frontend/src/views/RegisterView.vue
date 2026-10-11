<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ApiError, post } from '@/api/client';
import { MSG, displayNameValidator, isEduEmail, passwordValidator, usernameValidator } from '@/utils/validators';
import type { RegisterResult } from '@/types/api';

const router = useRouter();

const formRef = ref<FormInstance>();
const form = reactive({
  displayName: '',
  username: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
});

const confirmPasswordValidator = (_rule: unknown, value: string | undefined, callback: (error?: Error) => void): void => {
  if (!value) return callback(new Error('请再次输入密码'));
  if (value !== form.password) return callback(new Error('两次输入的密码不一致'));
  callback();
};

const emailRule = (rule: unknown, value: string | undefined, callback: (error?: Error) => void): void => {
  const v = (value ?? '').trim();
  if (!v) return callback(new Error('请输入邮箱'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return callback(new Error('邮箱格式不正确'));
  callback();
};

const rules: FormRules = {
  displayName: [{ required: true, validator: displayNameValidator, trigger: 'blur' }],
  username: [{ required: true, validator: usernameValidator, trigger: 'blur' }],
  email: [{ required: true, validator: emailRule, trigger: 'blur' }],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
  password: [{ required: true, validator: passwordValidator, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: confirmPasswordValidator, trigger: 'blur' }],
} satisfies FormRules;

const usernameHelp = '5-20 位，仅英文字母和数字，注册后不可修改';
const isEdu = computed(() => isEduEmail(form.email));
const inviteHelp = computed(() =>
  form.email && !isEdu.value ? '检测到非校园邮箱，注册需要有效的邀请码' : '没有校园邮箱？可在此填写邀请码',
);

const submitting = ref(false);
const sending = ref(false);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
onUnmounted(() => timer && clearInterval(timer));

function startCountdown(): void {
  countdown.value = 60;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
      timer = undefined;
    }
  }, 1000);
}

async function sendCode() {
  const valid = await formRef.value?.validateField(['email']).catch(() => false);
  if (valid === false) return;
  sending.value = true;
  try {
    await post('/auth/email/code', { email: form.email.trim().toLowerCase(), scene: 'REGISTER' });
    ElMessage.success(`验证码已发送至 ${form.email.trim()}，10 分钟内有效`);
    startCountdown();
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '验证码发送失败，请稍后重试');
  } finally {
    sending.value = false;
  }
}

const errorMsg = ref('');

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  errorMsg.value = '';
  try {
    const email = form.email.trim().toLowerCase();
    await post<RegisterResult>('/auth/register', {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      email,
      password: form.password,
      inviteCode: form.inviteCode.trim() || undefined,
    });
    ElMessage.success('注册成功！验证码已发送至邮箱，请完成验证');
    router.push({ name: 'verify-email', query: { email } });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '注册失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}

</script>

<template>
  <main class="auth-page">
    <section class="auth-card auth-card--wide">
      <h1 class="auth-title">注册同窗</h1>
      <p class="auth-sub">使用校园邮箱注册；没有校园邮箱可以使用邀请码</p>

      <el-alert v-if="errorMsg" class="auth-error" type="error" :title="errorMsg" show-icon :closable="true" />

      <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="昵称" prop="displayName">
          <el-input v-model="form.displayName" placeholder="社区中的显示名称，可用中文" maxlength="20" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用于登录" maxlength="20" autocomplete="username" />
          <div class="field-help">{{ usernameHelp }}</div>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <div class="code-row">
            <el-input v-model="form.email" placeholder="推荐使用校园邮箱" autocomplete="email" />
            <el-button class="code-btn" :disabled="countdown > 0 || sending" :loading="sending" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="邮箱验证码" prop="code">
          <el-input v-model="form.code" placeholder="6 位数字验证码" inputmode="numeric" maxlength="6" />
        </el-form-item>
        <el-form-item label="邀请码" prop="inviteCode">
          <el-input v-model="form.inviteCode" placeholder="选填" maxlength="32" />
          <div class="field-help">{{ inviteHelp }}</div>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" autocomplete="new-password" />
          <div class="field-help">{{ MSG.PASSWORD_CHARS }}</div>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入密码" autocomplete="new-password" @keyup.enter="submit" />
        </el-form-item>
        <el-button class="submit-btn" type="primary" native-type="submit" :loading="submitting">注册</el-button>
      </el-form>

      <div class="auth-links">
        <RouterLink to="/login">已有账号？去登录</RouterLink>
      </div>
    </section>
  </main>
</template>
