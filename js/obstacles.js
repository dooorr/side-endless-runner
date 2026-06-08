/**
 * 横版无尽跑酷 — 障碍生成、移动、碰撞（v0.7 随平台高度）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;
  const State = SideRunner.State;

  const obstacles = [];
  let groundSpawnTimer = 0.8;
  let airSpawnTimer = 2.0;
  let spawnParams = null;

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function canSpawnAt(right, minGapPx) {
    let maxRight = 0;
    for (const o of obstacles) {
      maxRight = Math.max(maxRight, o.x + o.w);
    }
    return maxRight <= CONFIG.canvasWidth - minGapPx;
  }

  function platformAt(x) {
    return SideRunner.platforms
      ? SideRunner.platforms.getPlatformAtSpawn(x)
      : null;
  }

  function solidSurfaceAt(x) {
    return SideRunner.platforms
      ? SideRunner.platforms.getSolidSurfaceYAt(x)
      : CONFIG.groundY;
  }

  function pushGround(right) {
    const centerX = right + 20;
    const plat = platformAt(centerX);
    if (!plat || plat.type === "PIT") return null;

    const roll = Math.random();
    let subtype = "tombstone";
    if (roll < 0.35) subtype = "fence";
    else if (roll < 0.55) subtype = "spike";

    const itemS = CONFIG.itemScale || 1;
    const w =
      subtype === "spike"
        ? Math.round((41 + Math.floor(Math.random() * 15)) * itemS)
        : Math.round((33 + Math.floor(Math.random() * 26)) * itemS);
    const h =
      subtype === "spike"
        ? Math.round((41 + Math.floor(Math.random() * 10)) * itemS)
        : Math.round((52 + Math.floor(Math.random() * 22)) * itemS);

    const obs = {
      type: "ground",
      subtype,
      x: right,
      y: plat.y - h,
      w,
      h,
      platformY: plat.y,
      batFrame: 0,
    };
    obstacles.push(obs);
    return obs;
  }

  function pushAir(x) {
    const centerX = x + 22;
    const plat = platformAt(centerX);
    if (!plat || plat.type === "PIT") return;

    const surface = plat.y;
    const h = CONFIG.batHeight;
    const w = CONFIG.batWidth;
    const clearance = CONFIG.batFlyClearancePx;
    // 蝙蝠在站立猫头顶前方悬空；下蹲后头顶低于蝙蝠底边
    const batY = surface - CONFIG.duckHeight - h - clearance;

    obstacles.push({
      type: "air",
      subtype: "bat",
      x,
      y: batY,
      w,
      h,
      platformY: surface,
      batFrame: 0,
    });
  }

  SideRunner.obstacles = {
    list: obstacles,

    resetObstacles() {
      obstacles.length = 0;
      groundSpawnTimer = 0.6;
      airSpawnTimer = 1.8;
      spawnParams = null;
    },

    spawnObstacle(type, opts) {
      opts = opts || {};
      const params = spawnParams || SideRunner.difficulty.getSpawnParams(SideRunner.game.score);
      const right = opts.x != null ? opts.x : CONFIG.canvasWidth + 32;
      const minGap = opts.minGapPx != null ? opts.minGapPx : params.minGapPx;

      if (!canSpawnAt(right, minGap)) return null;

      if (type === "ground") {
        return pushGround(right);
      }
      const plat = platformAt(right + 22);
      if (!plat || plat.type === "PIT") return null;
      pushAir(right);
      return obstacles[obstacles.length - 1];
    },

    trySpawnCombo(groundObs, params) {
      if (!groundObs || params.tier < 1) return;
      if (Math.random() >= params.comboChance) return;

      const airX = groundObs.x + groundObs.w + CONFIG.comboAirOffsetPx;
      if (!canSpawnAt(airX, params.minGapPx * 0.85)) return;
      pushAir(airX);
    },

    updateObstacles(dt) {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;

      spawnParams = SideRunner.difficulty.getSpawnParams(g.score);
      const move = g.speed * 60 * dt;
      const scale = spawnParams.intervalScale;

      groundSpawnTimer -= dt;
      airSpawnTimer -= dt;

      if (groundSpawnTimer <= 0) {
        const groundObs = SideRunner.obstacles.spawnObstacle("ground");
        if (groundObs) {
          SideRunner.obstacles.trySpawnCombo(groundObs, spawnParams);
        }
        groundSpawnTimer = SideRunner.difficulty.randomInterval(
          CONFIG.groundSpawnMin,
          CONFIG.groundSpawnMax,
          scale
        );
      }

      if (airSpawnTimer <= 0) {
        if (Math.random() < spawnParams.airChance) {
          SideRunner.obstacles.spawnObstacle("air");
        }
        airSpawnTimer = SideRunner.difficulty.randomInterval(
          CONFIG.airSpawnMin,
          CONFIG.airSpawnMax,
          scale
        );
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= move;
        if (o.type === "air") o.batFrame += dt * 12;
        if (o.x + o.w < -10) obstacles.splice(i, 1);
      }
    },

    checkCollisions() {
      const g = SideRunner.game;
      const player = SideRunner.player.data;
      const box = SideRunner.player.getPlayerHitbox();

      if (SideRunner.player.isInvulnerable()) return;

      for (const o of obstacles) {
        const obsBox = { x: o.x + 2, y: o.y + 2, w: o.w - 4, h: o.h - 4 };
        if (!rectsOverlap(box, obsBox)) continue;

        const surface = solidSurfaceAt(SideRunner.player.feetX());
        let duckClear = false;
        if (
          o.type === "air" &&
          player.ducking &&
          player.onGround &&
          surface != null &&
          Math.abs(o.platformY - surface) < 3
        ) {
          const batBottom = o.y + o.h - 2;
          duckClear = box.y + 2 >= batBottom - 2;
        }

        if (duckClear) continue;

        SideRunner.effects.triggerCollisionFlash(
          box.x + box.w * 0.5,
          box.y + box.h * 0.5
        );
        SideRunner.effects.triggerDeathShake();

        let reason = SideRunner.CONFIG.DeathReason.UNKNOWN;
        if (o.type === "air") {
          reason = SideRunner.CONFIG.DeathReason.BAT;
        } else if (o.subtype === "spike") {
          reason = SideRunner.CONFIG.DeathReason.SPIKE;
        } else {
          reason = SideRunner.CONFIG.DeathReason.TOMBSTONE;
        }
        g.triggerGameOver(reason);
        return;
      }
    },
  };
})(window);

/**
 * 障碍 — 高密度 16-bit 像素（CELL=1，碰撞盒不变）
 */
(function (global) {
  const SideRunner = global.SideRunner;

  const CELL = 1;
  const W = 28;

  function row(w, ...cells) {
    const r = new Array(w).fill(0);
    for (let i = 0; i < cells.length && i < w; i++) r[i] = cells[i];
    return r;
  }

  const TOMBSTONE_PX = [
    row(W, 0, 0, 0, 0, 1, 1, 1, 1, 5, 6, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 6, 6, 1, 1, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 1, 1, 1, 1, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 6, 6, 5, 1, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 1, 1, 6, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 6, 2, 1, 1, 1, 1, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 5, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 1, 1, 1, 1, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 1, 1, 1, 1, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0),
    row(W, 0, 0, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0),
    row(W, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0),
    row(W, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0),
  ];

  const SPIKE_PX = [
    [0, 0, 0, 0, 4, 0, 0, 0, 0],
    [0, 0, 0, 4, 1, 4, 0, 0, 0],
    [0, 0, 4, 1, 1, 1, 4, 0, 0],
    [0, 4, 1, 1, 2, 1, 1, 4, 0],
    [4, 1, 1, 2, 2, 2, 1, 1, 4],
    [2, 2, 2, 3, 3, 3, 2, 2, 2],
  ];

  const BASE_PALETTES = {
    tomb: { 1: "#A9A9A9", 2: "#696969", 4: "#555555", 5: "#2E8B57", 6: "#505050" },
    spike: { 1: "#9CA3AF", 2: "#6B7280", 3: "#4B5563", 4: "#D1D5DB" },
  };

  const THEME_MOD = {
    redmoon: {
      tomb: { 1: "#B8A0A8", 2: "#786068", 4: "#4A3038", 5: "#3A7050" },
      spike: { 1: "#A08088", 2: "#684850" },
    },
    midnight: {
      tomb: { 1: "#A8B8D0", 2: "#607090", 4: "#384858", 5: "#2A6878" },
      spike: { 1: "#B0C0D8", 2: "#6880A0" },
    },
  };

  function getPalette(kind) {
    const base = { ...BASE_PALETTES[kind] };
    const id = SideRunner.themes ? SideRunner.themes.getCurrentId() : "dusk";
    const mod = THEME_MOD[id] && THEME_MOD[id][kind];
    if (mod) Object.assign(base, mod);
    return base;
  }

  function drawGrid(ctx, grid, ox, oy, palette) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const v = grid[y][x];
        if (!v) continue;
        ctx.fillStyle = palette[v] || palette[1];
        ctx.fillRect(
          Math.floor(ox + x * CELL),
          Math.floor(oy + y * CELL),
          CELL,
          CELL
        );
      }
    }
  }

  function alignGrid(grid, o) {
    const gw = grid[0].length * CELL;
    const gh = grid.length * CELL;
    return {
      ox: o.x + (o.w - gw) / 2,
      oy: o.y + (o.h - gh),
      gw,
      gh,
    };
  }

  SideRunner.obstacleSprites = {
    CELL,
    TOMBSTONE_PX,
    SPIKE_PX,

    drawBat(ctx, o) {
      if (SideRunner.batSprites && SideRunner.batSprites.draw) {
        SideRunner.batSprites.draw(ctx, o);
      }
    },

    drawTombstone(ctx, o) {
      const { ox, oy, gw } = alignGrid(TOMBSTONE_PX, o);
      const footY = o.platformY != null ? o.platformY : o.y + o.h;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(ox + 2, footY - 3, gw + 2, 4);
      drawGrid(ctx, TOMBSTONE_PX, ox, oy, getPalette("tomb"));
    },

    drawSpike(ctx, o) {
      const { ox, oy } = alignGrid(SPIKE_PX, o);
      drawGrid(ctx, SPIKE_PX, ox, oy, getPalette("spike"));
    },
  };
})(window);
