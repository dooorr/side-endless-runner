/**
 * 横版无尽跑酷 — 配置与状态枚举
 * 1280×400，viewScale 1.85（相对原 800×200）
 */
(function (global) {
  const SideRunner = (global.SideRunner = global.SideRunner || {});

  SideRunner.CONFIG = {
    viewScale: 1.85,
    canvasWidth: 1280,
    canvasHeight: 400,
    groundY: 340,
    platformHighY: 260,
    platformPitY: 999,

    platformMinWidth: 185,
    platformMaxWidth: 370,
    platformBufferPx: 222,
    platformHighChance: 0.12,
    platformPitChance: 0.08,
    /** 开局可见区域仅平地（像素，覆盖整屏宽） */
    platformFlatStartPx: 1591,
    /** 收集物距高台/坑交界、坑体的水平安全距离 */
    collectibleHazardMarginPx: 104,
    /** 收集物距所在平台段左右边缘的内边距 */
    collectibleEdgePadPx: 74,
    platformSupportSlack: 26,
    /** 跑步时允许抬脚登上的高台高度差（地面 340 − 高台 260 = 80） */
    platformStepUpPx: 96,
    ledgeSnapDownPx: 11,
    ledgeFallArcDuration: 0.42,
    ledgeFallArcPx: 41,
    ledgeFallInitialVy: 148,
    fallDeathY: 448,

    gravity: 3515,
    jumpVelocity: -925,
    fallGravityMult: 1.45,
    maxFallSpeed: 1702,

    playerX: 93,
    standWidth: 81,
    standHeight: 81,
    duckWidth: 96,
    duckHeight: 41,
    hitboxPadding: 12,
    /** 空中蝙蝠碰撞盒（下蹲从下方穿过） */
    batWidth: 61,
    batHeight: 34,
    /** 蝙蝠贴图绘制高度（略小于猫；猫约 round(44×viewScale)） */
    batDrawHeight: 72,
    /** 蝙蝠底边与下蹲头顶之间的空隙（越大飞得越高） */
    batFlyClearancePx: 15,

    jumpBufferDuration: 0.12,
    coyoteTimeDuration: 0.08,

    baseSpeed: 11,
    maxSpeed: 26,
    speedTierInterval: 100,
    speedPerTier: 0.88,

    groundSpawnMin: 1.0,
    groundSpawnMax: 2.2,
    airSpawnMin: 2.5,
    airSpawnMax: 4.5,
    minGapPx: 222,
    minGapPxMin: 163,
    minGapShrinkPerTier: 7,
    spawnIntervalShrinkPerTier: 0.04,

    warmUpSeconds: 30,
    warmUpSpawnMult: 1.22,
    airSpawnChanceBase: 0.72,
    comboChanceBase: 0.1,
    comboChancePerTier: 0.035,
    comboChanceMax: 0.38,
    comboAirOffsetPx: 89,

    scoreRate: 12,
    nightScoreThreshold: 300,
    scorePopDuration: 0.35,
    scorePopScaleMax: 1.45,

    groundMarkSpacing: 44,

    parallaxFar: 0.2,
    parallaxMid: 0.5,
    parallaxNear: 1.0,
    nearDecorSpacing: 333,

    blinkMinInterval: 2.2,
    blinkMaxInterval: 5.5,
    blinkDuration: 0.14,

    nightScoreBlendRange: 50,

    deathShakeDuration: 0.4,
    deathShakeIntensity: 15,

    jumpTrailCount: 6,
    jumpTrailLife: 0.28,
    collisionFlashDuration: 0.22,

    audioMasterVolume: 0.85,
    audioSfxVolume: 0.9,
    audioBgmVolume: 0.22,
    bgmStepIntervalMs: 1400,

    /** 死亡原因枚举（供 triggerGameOver 使用） */
    DeathReason: {
      PIT: "pit",
      TOMBSTONE: "tombstone",
      SPIKE: "spike",
      BAT: "bat",
      UNKNOWN: "unknown",
    },

    doubleJumpVelocity: -777,
    dashDuration: 0.38,
    dashCooldown: 2.0,
    dashLungePx: 48,

    invulnDurationMagic: 2.2,
    coinScore: 15,
    pawScore: 50,
    magicScore: 25,
    trapScorePenalty: 35,
    curseDuration: 3.5,
    curseSpeedMult: 1.28,

    collectibleSpawnMin: 2.2,
    collectibleSpawnMax: 4.8,
    trapChanceBase: 0.12,
    trapChancePerTier: 0.025,
    trapChanceMax: 0.32,

    /** 地面障碍 / 收集物相对 viewScale 的额外放大 */
    itemScale: 1.12,
  };

  SideRunner.State = {
    IDLE: "idle",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameOver",
  };

  SideRunner.PlatformType = {
    NORMAL: "NORMAL",
    HIGH: "HIGH",
    PIT: "PIT",
  };

  SideRunner.HIGH_SCORE_KEY = "sideRunnerHighScore";
  SideRunner.LEGACY_HIGH_SCORE_KEY = "nightCatHighScore";
})(window);
