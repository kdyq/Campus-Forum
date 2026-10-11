<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ApiError, post } from '@/api/client';
import { passwordValidator } from '@/utils/validators';

const router = useRouter();

const formRef = ref<FormInstance>();
const form = reactive({ email: '', code: '', password: '', confirmPassword: '' });

const confirmPasswordValidator = (_rule: unknown, value: string | undefined, callback: (error?: Error) => void): void => {
  if (!value) return callback(new Error('请再次输入密码'));
  if (value !== form.password) return callback(new Error('两次输入的密码不一致'));
  callback();
};

const rules: FormRules = {
  email: [
    { required: true, message: '请输入注册邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
  password: [{ required: true, validator: passwordValidator, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: confirmPasswordValidator, trigger: 'blur' }],
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
    await post('/auth/email/code', { email: form.email.trim().toLowerCase(), scene: 'RESET' });
    ElMessage.success(`重置验证码已发送至 ${form.email.trim()}，10 分钟内有效`);
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
    await post('/auth/password/reset', {
      email: form.email.trim().toLowerCase(),
      code: form.code.trim(),
      password: form.password,
    });
    ElMessage.success('密码已重置，请使用新密码登录');
    router.push({ name: 'login' });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '重置失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">忘记密码</h1>
      <p class="auth-sub">输入注册邮箱获取验证码，验证后设置新密码</p>

      <el-alert v-if="errorMsg" class="auth-error" type="error" :title="errorMsg" show-icon :closable="true" />

      <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="注册邮箱" prop="email">
          <el-input v-model="form.email" placeholder="注册时使用的邮箱" autocomplete="email" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="6 位数字验证码" inputmode="numeric" maxlength="6" />
            <el-button class="code-btn" :disabled="countdown > 0 || sending" :loading="sending" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" autocomplete="new-password" />
          <div class="field-help">密码只能使用英文字母、数字、@ 和 _</div>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入新密码" autocomplete="new-password" @keyup.enter="submit" />
        </el-form-item>
        <el-button class="submit-btn" type="primary" native-type="submit" :loading="submitting">重置密码</el-button>
      </el-form>

      <div class="auth-links">
        <RouterLink to="/login">返回登录</RouterLink>
      </div>
    </section>
  </main>
</template>
