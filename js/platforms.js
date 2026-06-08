/**
 * 横版无尽跑酷 — 滚动高低平台（v0.7.1）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  const platforms = [];

  function yForType(type) {
    if (type === "HIGH") return CONFIG.platformHighY;
    if (type === "PIT") return CONFIG.platformPitY;
    return CONFIG.groundY;
  }

  function isSolid(type) {
    return type !== "PIT";
  }

  function pickNextType(prevType) {
    const g = SideRunner.game;
    let pitChance = CONFIG.platformPitChance;
    let highChance = CONFIG.platformHighChance;
    if (g && SideRunner.difficulty) {
      const params = SideRunner.difficulty.getSpawnParams(g.score || 0);
      if (params.inWarmUp) {
        pitChance = 0;
        highChance = 0;
      }
    }
    const r = Math.random();

    if (prevType === "PIT") {
      return r < 0.12 ? "HIGH" : "NORMAL";
    }
    if (prevType === "HIGH") {
      pitChance *= 0.55;
      highChance *= 0.35;
    }

    if (r < pitChance) return "PIT";
    if (r < pitChance + highChance) return "HIGH";
    return "NORMAL";
  }

  function randomWidth() {
    return (
      CONFIG.platformMinWidth +
      Math.floor(Math.random() * (CONFIG.platformMaxWidth - CONFIG.platformMinWidth))
    );
  }

  function rightmostEdge() {
    let max = 0;
    for (const p of platforms) {
      max = Math.max(max, p.x + p.width);
    }
    return max;
  }

  function appendSegment(prevType) {
    const type = pickNextType(prevType);
    const last = platforms[platforms.length - 1];
    const x = last ? last.x + last.width : 0;
    platforms.push({
      x,
      width: randomWidth(),
      y: yForType(type),
      type,
    });
    return type;
  }

  function ensureCoverage(minRight) {
    let prev = platforms.length ? platforms[platforms.length - 1].type : "NORMAL";
    while (rightmostEdge() < minRight) {
      prev = appendSegment(prev);
    }
  }

  function initStrip() {
    platforms.length = 0;
    const flatEnd =
      CONFIG.platformFlatStartPx != null
        ? CONFIG.platformFlatStartPx
        : CONFIG.canvasWidth + 60;
    let x = 0;
    while (x < flatEnd) {
      const w = randomWidth();
      platforms.push({
        x,
        width: w,
        y: CONFIG.groundY,
        type: "NORMAL",
      });
      x += w;
    }
    let prev = "NORMAL";
    while (rightmostEdge() < CONFIG.canvasWidth + CONFIG.platformBufferPx) {
      prev = appendSegment(prev);
    }
  }

  /** 该世界坐标附近是否存在高台或坑（用于收集物生成避让） */
  function isNearHazardTerrain(worldX, margin) {
    const m = margin != null ? margin : CONFIG.collectibleHazardMarginPx || 50;
    for (const p of platforms) {
      if (p.type !== "HIGH" && p.type !== "PIT") continue;
      if (worldX >= p.x - m && worldX <= p.x + p.width + m) return true;
    }
    return false;
  }

  SideRunner.platforms = {
    list: platforms,

    yForType,
    isSolid,

    reset() {
      initStrip();
    },

    update(dt) {
      const g = SideRunner.game;
      if (g.state !== SideRunner.State.PLAYING) return;

      const move = g.speed * 60 * dt;
      for (let i = platforms.length - 1; i >= 0; i--) {
        platforms[i].x -= move;
        if (platforms[i].x + platforms[i].width < -80) {
          platforms.splice(i, 1);
        }
      }

      ensureCoverage(CONFIG.canvasWidth + CONFIG.platformBufferPx);

      let prev = platforms.length ? platforms[platforms.length - 1].type : "NORMAL";
      while (rightmostEdge() < CONFIG.canvasWidth + CONFIG.platformBufferPx * 2) {
        prev = appendSegment(prev);
      }
    },

    /** 脚底中心 X 所在平台（实心） */
    getPlatformAt(feetX) {
      for (const p of platforms) {
        if (feetX >= p.x && feetX < p.x + p.width) return p;
      }
      return null;
    },

    /** 脚底 X 处：实心返回台面 y，坑/无平台返回 null */
    getSurfaceYAt(feetX) {
      const p = SideRunner.platforms.getPlatformAt(feetX);
      if (!p || !isSolid(p.type)) return null;
      return p.y;
    },

    /** 生成点 X 处的平台（可含 PIT，用于跳过生成） */
    getPlatformAtSpawn(x) {
      return SideRunner.platforms.getPlatformAt(x);
    },

    /** 实心台面 y；无实心则 null */
    getSolidSurfaceYAt(x) {
      return SideRunner.platforms.getSurfaceYAt(x);
    },

    getFeetX() {
      const px = SideRunner.player.getDrawX();
      const w = SideRunner.player.data.ducking
        ? CONFIG.duckWidth
        : CONFIG.standWidth;
      return px + w * 0.5;
    },

    /** 玩家当前脚下平台 */
    getSupportUnderPlayer() {
      return SideRunner.platforms.getPlatformAt(SideRunner.platforms.getFeetX());
    },

    isNearHazardTerrain,
  };
})(window);
