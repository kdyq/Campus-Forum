// SMTP 握手验证：只做连接与鉴权，不发送任何邮件
import { createTransport } from 'nodemailer';
import '../src/config/env.ts';
import { env } from '../src/config/env.ts';

const transporter = createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: { user: env.smtp.user, pass: env.smtp.pass },
});

try {
  await transporter.verify();
  console.log('SMTP 连接与鉴权成功（未发送任何邮件）:', env.smtp.host, env.smtp.user);
} catch (err) {
  console.error('SMTP 验证失败:', err.message);
  process.exitCode = 1;
}
