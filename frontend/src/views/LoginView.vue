<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ApiError } from '@/api/client';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInstance>();
const form = reactive({ identifier: '', password: '' });
const rules: FormRules = {
  identifier: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const submitting = ref(false);
const errorMsg = ref('');

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  errorMsg.value = '';
  try {
    await session.login(form.identifier.trim(), form.password);
    ElMessage.success('欢迎回来！');
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '登录失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">登录同窗</h1>
      <p class="auth-sub">使用用户名或邮箱登录你的校园社区账号</p>

      <el-alert v-if="errorMsg" class="auth-error" type="error" :title="errorMsg" show-icon />

      <el-form
        ref="formRef"
        class="auth-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item label="用户名或邮箱" prop="identifier">
          <el-input v-model="form.identifier" placeholder="用户名或邮箱" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="密码"
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button class="submit-btn" type="primary" native-type="submit" :loading="submitting">登录</el-button>
      </el-form>

      <div class="auth-links">
        <RouterLink to="/forgot-password">忘记密码？</RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/register">没有账号？去注册</RouterLink>
      </div>
    </section>
  </main>
</template>
