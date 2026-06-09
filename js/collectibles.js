/**
 * 横版无尽跑酷 — 收集物与诅咒陷阱（v0.5）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;
  const State = SideRunner.State;

  const items = [];
  let spawnTimer = 2.5;

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function pickType(tier, trapChance) {
    const r = Math.random();
    if (r < trapChance) return "curse";
    if (r < 0.55) return "coin";
    if (r < 0.82) return "paw";
    return "magic";
  }

  /** 平地/高台中段可生成；避开坑、段边缘及与高台/坑相邻的交界 */
  function isSafeCollectibleSpot(centerX, plat) {
    const edgePad = CONFIG.collectibleEdgePadPx || 40;
    const transitionMargin = CONFIG.collectibleHazardMarginPx || 56;

    if (!plat || plat.type === "PIT") return false;
    if (plat.type !== "NORMAL" && plat.type !== "HIGH") return false;
    if (centerX < plat.x + edgePad || centerX > plat.x + plat.width - edgePad) {
      return false;
    }

    const list = SideRunner.platforms.list;
    for (const p of list) {
      if (p.type === "PIT") {
        if (
          centerX >= p.x - transitionMargin &&
          centerX <= p.x + p.width + transitionMargin
        ) {
          return false;
        }
      }
    }

    for (const p of list) {
      if (p === plat) continue;
      if (p.y === plat.y && p.type === plat.type) continue;
      const touchLeft = Math.abs(p.x + p.width - plat.x) < 5;
      const touchRight = Math.abs(p.x - (plat.x + plat.width)) < 5;
      if (!touchLeft && !touchRight) continue;
      if (
        centerX < plat.x + transitionMargin ||
        centerX > plat.x + plat.width - transitionMargin
      ) {
        return false;
      }
    }
    return true;
  }

  function findSpawnSlot() {
    if (!SideRunner.platforms) return null;

    const baseRight = CONFIG.canvasWidth + 48;

    for (let attempt = 0; attempt < 10; attempt++) {
      const centerX = baseRight + 14 - attempt * 58;
      const plat = SideRunner.platforms.getPlatformAtSpawn(centerX);
      if (!isSafeCollectibleSpot(centerX, plat)) continue;
      return {
        plat,
        centerX,
        right: centerX - 14,
      };
    }
    return null;
  }

  SideRunner.collectibles = {
    list: items,

    reset() {
      items.length = 0;
      spawnTimer = 2.8;
    },

    spawn() {
      const g = SideRunner.game;
      const params = SideRunner.difficulty.getSpawnParams(g.score);
      const slot = findSpawnSlot();
      if (!slot) return;

      const { plat, right } = slot;
      const subtype = pickType(params.tier, params.trapChance);
      const itemS = CONFIG.itemScale || 1;
      const size =
        subtype === "coin"
          ? Math.round(26 * itemS)
          : subtype === "paw"
            ? Math.round(26 * itemS)
            : subtype === "magic"
              ? Math.round(26 * itemS)
              : Math.round(19 * itemS);
      const floatY =
        plat.y -
        size -
        Math.round(15 * itemS) -
        (subtype === "magic" ? Math.round(19 * itemS) : 0);

      items.push({
        subtype,
        x: right,
        y: floatY + (Math.random() * 6 - 3),
        w: size,
        h: size,
        platformY: plat.y,
        spin: Math.random() * Math.PI * 2,
      });
    },

    drawAll(ctx, theme) {
      if (SideRunner.collectibleSprites) {
        SideRunner.collectibleSprites.drawAll(ctx, theme);
      }
    },

    applyPickup(item) {
      const g = SideRunner.game;
      if (g.incrementCollect) g.incrementCollect(item.subtype);
      switch (item.subtype) {
        case "coin":
          if (g.registerComboPickup) g.registerComboPickup();
          if (g.applyScoreBonus) g.applyScoreBonus(CONFIG.coinScore);
          else {
            g.score += CONFIG.coinScore;
            g.scorePopTimer = CONFIG.scorePopDuration;
          }
          break;
        case "paw":
          if (g.registerComboPickup) g.registerComboPickup();
          if (g.applyScoreBonus) g.applyScoreBonus(CONFIG.pawScore, 1.2);
          else {
            g.score += CONFIG.pawScore;
            g.scorePopTimer = CONFIG.scorePopDuration * 1.2;
          }
          break;
        case "magic":
          if (g.registerComboPickup) g.registerComboPickup();
          if (g.applyScoreBonus) g.applyScoreBonus(CONFIG.magicScore);
          else g.score += CONFIG.magicScore;
          SideRunner.player.grantMagicBuff();
          break;
        case "curse":
          if (g.breakCombo) g.breakCombo();
          g.score = Math.max(0, g.score - CONFIG.trapScorePenalty);
          g.curseTimer = CONFIG.curseDuration;
          SideRunner.effects.triggerCollisionFlash(
            SideRunner.player.data.x + 41,
            SideRunner.player.data.y + 19
          );
          if (SideRunner.audio && SideRunner.audio.playCurse) {
            SideRunner.audio.playCurse();
          }
          break;
        default:
          break;
      }
      if (item.subtype !== "curse" && SideRunner.audio && SideRunner.audio.playCollect) {
        SideRunner.audio.playCollect(item.subtype);
      }
    },

    update(dt) {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;

      const params = SideRunner.difficulty.getSpawnParams(g.score);
      const move = g.speed * 60 * dt;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        SideRunner.collectibles.spawn();
        spawnTimer = SideRunner.difficulty.randomInterval(
          CONFIG.collectibleSpawnMin,
          CONFIG.collectibleSpawnMax,
          params.intervalScale * 1.1
        );
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.x -= move;
        it.spin += dt * 4;
        if (it.x + it.w < -20) items.splice(i, 1);
      }

      SideRunner.collectibles.checkPickups();
    },

    checkPickups() {
      const box = SideRunner.player.getPlayerHitbox();
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const hit = {
          x: it.x + 2,
          y: it.y + 2,
          w: it.w - 4,
          h: it.h - 4,
        };
        if (!rectsOverlap(box, hit)) continue;
        SideRunner.collectibles.applyPickup(it);
        items.splice(i, 1);
      }
    },
  };
})(window);

/**
 * 收集物 — 高密度 16-bit 像素（矩阵 2× / 绘制 scale 0.5，拾取碰撞不变）
 */
(function (global) {
  const SideRunner = global.SideRunner;

  const CELL = 1;
  const COIN_DRAW_SCALE = 0.5;

  const COIN_GOLD = "#FFD700";
  const COIN_RIM = "#DAA520";
  const COIN_PAW = "#8B6508";
  const COIN_SHINE = "#FFF4B8";

  /** 24×24 齿边币面：1 亮金 2 压边 3 暗金阴影 4 高光 */
  const COIN_FACE_PX = [
    [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 2, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  /** 24×24 中心猫爪肉垫（圆润趾垫 + 主掌） */
  const COIN_PAW_PX = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  /** 14x12 金边肉垫：1 粉 2 金边 3 高光 */
  const PAW_PX = [
    [0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 1, 1, 1, 2, 2, 0, 0, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [0, 2, 1, 3, 1, 0, 0, 0, 1, 3, 1, 2, 0, 0],
    [0, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 0, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 1, 3, 1, 1, 1, 3, 1, 2, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  /** 14x14 中空魔法球 */
  const MAGIC_PX = [
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 3, 3, 3, 3, 2, 0, 0, 0, 0, 0],
    [0, 0, 2, 3, 1, 1, 1, 1, 3, 2, 0, 0, 0, 0],
    [0, 2, 3, 1, 0, 0, 0, 0, 1, 3, 2, 0, 0, 0],
    [0, 2, 1, 0, 0, 4, 4, 0, 0, 1, 2, 0, 0, 0],
    [2, 3, 1, 0, 4, 4, 4, 4, 0, 1, 3, 2, 0, 0],
    [2, 3, 1, 0, 4, 4, 4, 4, 0, 1, 3, 2, 0, 0],
    [0, 2, 1, 0, 0, 4, 4, 0, 0, 1, 2, 0, 0, 0],
    [0, 2, 3, 1, 0, 0, 0, 0, 1, 3, 2, 0, 0, 0],
    [0, 0, 2, 3, 1, 1, 1, 1, 3, 2, 0, 0, 0, 0],
    [0, 0, 0, 2, 3, 3, 3, 3, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  /** 10x10 发光红叉，无框 */
  const CURSE_PX = [
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 2, 0, 1, 0, 0, 1, 0, 2, 0],
    [1, 0, 2, 0, 1, 1, 0, 2, 0, 1],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [1, 0, 2, 0, 1, 1, 0, 2, 0, 1],
    [0, 2, 0, 1, 0, 0, 1, 0, 2, 0],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  const SPRITES = { paw: PAW_PX, magic: MAGIC_PX, curse: CURSE_PX };

  const BASE_PALETTES = {
    coin: { 1: COIN_GOLD, 2: COIN_RIM, 3: COIN_PAW, 4: COIN_SHINE, paw: COIN_PAW },
    paw: { 1: "#FFB6C1", 2: "#FFE4B5", 3: "#FF8FA8" },
    magic: { 1: "#BA55D3", 2: "#9370DB", 3: "#E6E6FA", 4: "#D8BFD8" },
    curse: { 1: "#FF3333", 2: "#FF6666" },
  };

  const THEME_MOD = {
    dusk: {},
    redmoon: {
      coin: { 1: "#FFC870" },
      paw: { 1: "#FFA8B8" },
      magic: { 1: "#D060A0", 2: "#C080A8", 3: "#FFD8F0" },
    },
    midnight: {
      coin: { 1: "#FFE680", 2: "#C8A030" },
      paw: { 1: "#C8E0FF", 2: "#E8F4C8" },
      magic: { 1: "#88B8F0", 2: "#6898D8", 3: "#F0F8FF" },
    },
  };

  function gridSize(grid) {
    return { w: grid[0].length * CELL, h: grid.length * CELL };
  }

  function getPalette(subtype, theme) {
    const base = { ...BASE_PALETTES[subtype] };
    const id = SideRunner.themes ? SideRunner.themes.getCurrentId() : "dusk";
    const mod = THEME_MOD[id] && THEME_MOD[id][subtype];
    if (mod) Object.assign(base, mod);
    if (subtype === "coin") base._glow = "rgba(255, 215, 0, 0.6)";
    if (subtype === "magic") base._glow = (theme && theme.glow) || "rgba(186, 85, 211, 0.55)";
    if (subtype === "curse") base._glow = "rgba(255, 51, 51, 0.65)";
    return base;
  }

  function drawGrid(ctx, grid, ox, oy, palette) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const v = grid[y][x];
        if (!v) continue;
        ctx.fillStyle = palette[v] || palette[1];
        ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
      }
    }
  }

  function drawGildedCoin(ctx, palette, spin) {
    const r = 6;
    const glowR = Math.round(26 * (CONFIG.itemScale || 1));

    const outerGlow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, glowR);
    outerGlow.addColorStop(0, "rgba(255, 215, 0, 0.55)");
    outerGlow.addColorStop(0.45, "rgba(218, 165, 32, 0.28)");
    outerGlow.addColorStop(1, "rgba(218, 165, 32, 0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    const coinGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, r);
    coinGrad.addColorStop(0, palette[1] || COIN_GOLD);
    coinGrad.addColorStop(0.55, palette[1] || COIN_GOLD);
    coinGrad.addColorStop(0.85, palette[2] || COIN_RIM);
    coinGrad.addColorStop(1, palette[2] || COIN_RIM);
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette[2] || COIN_RIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const faceW = COIN_FACE_PX[0].length;
    const faceH = COIN_FACE_PX.length;
    ctx.save();
    ctx.scale(COIN_DRAW_SCALE, COIN_DRAW_SCALE);
    drawGrid(ctx, COIN_FACE_PX, -faceW / 2, -faceH / 2, palette);
    const pawPal = { 1: palette.paw || COIN_PAW };
    drawGrid(ctx, COIN_PAW_PX, -faceW / 2, -faceH / 2, pawPal);
    ctx.restore();
  }

  SideRunner.collectibleSprites = {
    CELL,
    SPRITES,

    draw(ctx, subtype, centerX, centerY, theme, spin) {
      const palette = getPalette(subtype, theme);
      ctx.save();
      try {
        ctx.translate(centerX, centerY);
        if (spin) ctx.rotate(spin);

        if (subtype === "coin") {
          drawGildedCoin(ctx, palette, spin);
          return;
        }

        const grid = SPRITES[subtype];
        if (!grid) return;

        const { w, h } = gridSize(grid);
        if (palette._glow) {
          ctx.shadowColor = palette._glow;
          ctx.shadowBlur = subtype === "curse" ? 12 : subtype === "magic" ? 16 : 10;
        }
        drawGrid(ctx, grid, -w / 2, -h / 2, palette);
      } finally {
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    },

    drawAll(ctx, theme) {
      for (const it of SideRunner.collectibles.list) {
        SideRunner.collectibleSprites.draw(
          ctx,
          it.subtype,
          it.x + it.w / 2,
          it.y + it.h / 2,
          theme,
          it.spin
        );
      }
    },
  };
})(window);
