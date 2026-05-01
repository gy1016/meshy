export const MESHY_PANEL_TEXT = {
  idle: "请先上传并选中一张图片",
  preparing: "正在准备图片数据...",
  queued: "已提交到 Meshy，等待任务排队...",
  success: "转换成功，已拿到 GLB 链接。",
  buttonIdle: "将选中图片转换为3D",
  buttonLoading: "转换中...",
} as const;

export const MESHY_POLLING = {
  timeoutMs: 10 * 60_000,
  retryOnRateLimitMs: 5_000,
} as const;
