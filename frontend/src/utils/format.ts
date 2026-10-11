export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
