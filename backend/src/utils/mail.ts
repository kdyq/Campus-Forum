// QQ 邮箱 SMTP（Nodemailer）：仅负责发送验证码邮件
import nodemailer from 'nodemailer';
import { env } from '../config/env.ts';
import type { CodeScene } from '../services/email-code.service.ts';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: { user: env.smtp.user, pass: env.smtp.pass },
});

export async function sendVerificationCode(to: string, code: string, scene: CodeScene): Promise<void> {
  const purpose = scene === 'REGISTER' ? '注册验证' : '重置密码';
  await transporter.sendMail({
    from: env.mailFrom,
    to,
    subject: `【同窗】${purpose}验证码 ${code}`,
    text: `你的${purpose}验证码是：${code}（10 分钟内有效）。如果不是你本人操作，请忽略本邮件。`,
    html: `<div style="font-family:system-ui,'Microsoft YaHei',sans-serif;max-width:420px;margin:0 auto;padding:24px;">
  <p style="color:#5A6570;font-size:14px;">你在「同窗」进行${purpose}，验证码为：</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:8px;color:#1F6F78;margin:16px 0;">${code}</p>
  <p style="color:#6A7480;font-size:13px;">10 分钟内有效。如果不是你本人操作，请忽略本邮件。</p>
</div>`,
  });
}
