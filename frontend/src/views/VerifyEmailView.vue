<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ApiError, post } from '@/api/client';
import { useSessionStore } from '@/stores/session';
import type { LoginResult } from '@/types/api';

const session = useSessionStore();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInstance>();
const form = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  code: '',
});

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
};

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
    const result = await post<LoginResult>('/auth/verify-email', {
      email: form.email.trim().toLowerCase(),
      code: form.code.trim(),
    });
    session.setSession(result.user, result.accessToken);
    ElMessage.success('邮箱验证成功，欢迎加入同窗！');
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '验证失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">验证邮箱</h1>
      <p class="auth-sub">注册时已向你填写的邮箱发送了 6 位验证码，10 分钟内有效</p>

      <el-alert v-if="errorMsg" class="auth-error" type="error" :title="errorMsg" show-icon :closable="true" />

      <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="注册时使用的邮箱" autocomplete="email" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="6 位数字验证码" inputmode="numeric" maxlength="6" />
            <el-button class="code-btn" :disabled="countdown > 0 || sending" :loading="sending" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s 后重发` : '重新发送' }}
            </el-button>
          </div>
        </el-form-item>
        <el-button class="submit-btn" type="primary" native-type="submit" :loading="submitting">验证并登录</el-button>
      </el-form>

      <div class="auth-links">
        <RouterLink to="/login">返回登录</RouterLink>
      </div>
    </section>
  </main>
</template>
