/**
 * 横版无尽跑酷 — 屏幕特效（震动、跳跃尾迹、碰撞闪光）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  let shakeTime = 0;
  let shakeIntensity = 0;

  const jumpTrails = [];
  const dashTrails = [];
  let flashTime = 0;
  let flashX = 0;
  let flashY = 0;
  let dashFlashTime = 0;

  SideRunner.effects = {
    triggerDeathShake() {
      shakeTime = CONFIG.deathShakeDuration;
      shakeIntensity = CONFIG.deathShakeIntensity;
    },

    triggerCollisionFlash(x, y) {
      flashX = x;
      flashY = y;
      flashTime = CONFIG.collisionFlashDuration;
    },

    triggerDashFlash() {
      dashFlashTime = 0.15;
    },

    spawnDashTrail(x, y, w) {
      for (let i = 0; i < 14; i++) {
        dashTrails.push({
          x: x - i * 6 + Math.random() * w,
          y: y + 10 + Math.random() * 35,
          life: 0.28,
          maxLife: 0.28,
          size: 5 + Math.random() * 8,
        });
      }
    },

    spawnJumpTrail(x, y, w, h) {
      const count = CONFIG.jumpTrailCount;
      for (let i = 0; i < count; i++) {
        jumpTrails.push({
          x: x + w * 0.2 + Math.random() * w * 0.5,
          y: y + h - 4 + Math.random() * 6,
          life: CONFIG.jumpTrailLife,
          maxLife: CONFIG.jumpTrailLife,
          size: 4 + Math.random() * 5,
        });
      }
    },

    updateEffects(dt) {
      SideRunner.effects.updateShake(dt);

      for (let i = jumpTrails.length - 1; i >= 0; i--) {
        jumpTrails[i].life -= dt;
        jumpTrails[i].x -= dt * 40;
        if (jumpTrails[i].life <= 0) jumpTrails.splice(i, 1);
      }
      for (let i = dashTrails.length - 1; i >= 0; i--) {
        dashTrails[i].life -= dt;
        dashTrails[i].x -= dt * 120;
        if (dashTrails[i].life <= 0) dashTrails.splice(i, 1);
      }

      if (flashTime > 0) {
        flashTime -= dt;
        if (flashTime < 0) flashTime = 0;
      }
      if (dashFlashTime > 0) {
        dashFlashTime -= dt;
        if (dashFlashTime < 0) dashFlashTime = 0;
      }
    },

    updateShake(dt) {
      if (shakeTime <= 0) return;
      shakeTime -= dt;
      if (shakeTime < 0) shakeTime = 0;
    },

    getShakeOffset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const t = shakeTime / CONFIG.deathShakeDuration;
      const intensity = shakeIntensity * t;
      return {
        x: (Math.random() * 2 - 1) * intensity,
        y: (Math.random() * 2 - 1) * intensity,
      };
    },

    resetShake() {
      shakeTime = 0;
      shakeIntensity = 0;
    },

    resetVisualEffects() {
      jumpTrails.length = 0;
      dashTrails.length = 0;
      flashTime = 0;
      dashFlashTime = 0;
    },

    isShaking() {
      return shakeTime > 0;
    },

    drawJumpTrails(ctx, theme) {
      for (const t of jumpTrails) {
        const a = (t.life / t.maxLife) * 0.55;
        ctx.fillStyle = `rgba(139, 122, 168, ${a})`;
        ctx.fillRect(t.x, t.y, t.size, t.size * 0.6);
      }
      for (const t of dashTrails) {
        const a = (t.life / t.maxLife) * 0.85;
        ctx.fillStyle = `rgba(232, 224, 200, ${a})`;
        ctx.fillRect(t.x, t.y, t.size, t.size * 0.5);
      }
    },

    drawDashFlash(ctx) {
      if (dashFlashTime <= 0) return;
      const p = dashFlashTime / 0.15;
      const px = SideRunner.player.getDrawX() + CONFIG.standWidth * 0.5;
      const py = SideRunner.player.data.y + CONFIG.standHeight * 0.4;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 80);
      grad.addColorStop(0, `rgba(232, 224, 200, ${0.35 * p})`);
      grad.addColorStop(1, "rgba(139, 122, 168, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(px - 55, py - 30, 110, 60);
    },

    drawCollisionFlash(ctx) {
      if (flashTime <= 0) return;
      const p = flashTime / CONFIG.collisionFlashDuration;
      const radius = 45 + (1 - p) * 58;
      const alpha = p * 0.55;

      const grad = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, radius);
      grad.addColorStop(0, `rgba(232, 224, 200, ${alpha})`);
      grad.addColorStop(0.4, `rgba(180, 80, 100, ${alpha * 0.6})`);
      grad.addColorStop(1, "rgba(80, 40, 90, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(flashX, flashY, radius, 0, Math.PI * 2);
      ctx.fill();
    },
  };
})(window);
