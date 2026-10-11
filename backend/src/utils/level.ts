// 等级与经验值：阈值制，升级只增不降
export const LEVEL_EXP = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5600, 7500] as const;

export const EXP_GAIN = {
  POST: 10,
  COMMENT: 5,
  LIKE_RECEIVED: 1,
  ACCEPTED: 30,
} as const;

/** 由经验值换算等级（1 起） */
export function levelFor(exp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_EXP.length; i++) {
    if (exp >= LEVEL_EXP[i]) level = i + 1;
  }
  return level;
}

/** 加经验并按新经验刷新等级，返回增量信息 */
export function expDelta(currentExp: number, gain: number): { exp: number; level: number; leveledUp: boolean } {
  const exp = Math.max(0, currentExp + gain);
  const level = levelFor(exp);
  return { exp, level, leveledUp: level > levelFor(currentExp) };
}
