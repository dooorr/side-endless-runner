/**
 * 横版无尽跑酷 — 难度曲线（阶梯速度、障碍节奏）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  SideRunner.difficulty = {
    /** 每 100 分一档 */
    getTier(score) {
      return Math.floor(score / CONFIG.speedTierInterval);
    },

    /** 阶梯速度：base + floor(score/100) * speedPerTier */
    getSpeed(score) {
      const tier = SideRunner.difficulty.getTier(score);
      return Math.min(
        CONFIG.maxSpeed,
        CONFIG.baseSpeed + tier * CONFIG.speedPerTier
      );
    },

    /** 游玩秒数（由分数反推） */
    getPlaySeconds(score) {
      return score / CONFIG.scoreRate;
    },

    /**
     * 障碍生成参数
     * @returns {{ tier, intervalScale, minGapPx, comboChance, airChance }}
     */
    getSpawnParams(score) {
      const tier = SideRunner.difficulty.getTier(score);
      const playSec = SideRunner.difficulty.getPlaySeconds(score);
      const inWarmUp = playSec < CONFIG.warmUpSeconds;

      const intervalScale = Math.max(
        0.48,
        (1 - tier * CONFIG.spawnIntervalShrinkPerTier) *
          (inWarmUp ? CONFIG.warmUpSpawnMult : 1)
      );

      const minGapPx = Math.max(
        CONFIG.minGapPxMin,
        CONFIG.minGapPx - tier * CONFIG.minGapShrinkPerTier
      );

      const comboChance = Math.min(
        CONFIG.comboChanceMax,
        CONFIG.comboChanceBase + tier * CONFIG.comboChancePerTier
      );

      const airChance = Math.min(
        0.88,
        CONFIG.airSpawnChanceBase + tier * 0.04
      );

      const trapChance = Math.min(
        CONFIG.trapChanceMax,
        CONFIG.trapChanceBase + tier * CONFIG.trapChancePerTier
      );

      return {
        tier,
        intervalScale,
        minGapPx,
        comboChance,
        airChance,
        trapChance,
        inWarmUp,
      };
    },

    randomInterval(min, max, scale) {
      return (min + Math.random() * (max - min)) * scale;
    },
  };
})(window);
