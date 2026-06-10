/**
 * 横版无尽跑酷 — 背景、实体、HUD、界面（v0.3 视差/像素障碍/眨眼/面板）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;
  const State = SideRunner.State;
  const V = CONFIG.viewScale || 1.6;
  const VH = CONFIG.canvasHeight / 320;
  const S = (n) => Math.round(n * V);
  const SY = (n) => Math.round(n * V * VH);

  const PIXEL = S(3);

  const FENCE_PX = [
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
  ];

  const STAR_POSITIONS = [
    [120, 28], [200, 18], [340, 35], [480, 22], [560, 40], [700, 15],
    [90, 55], [250, 48], [410, 30], [620, 52], [750, 38],
  ].map(([x, y]) => [S(x), SY(y)]);

  function getTheme() {
    return SideRunner.themes.getPlayTheme(SideRunner.game.score);
  }

  function isDeepNight() {
    return SideRunner.themes.isDeepNight(SideRunner.game.score);
  }

  /** 防止子绘制抛错后 transform / alpha 污染整帧（表现为全屏空白） */
  function resetCtxState(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  /** 清掉历史帧未 restore 的 save（遇蝙蝠后白屏多为栈泄漏） */
  function drainCtxStack(ctx) {
    for (let i = 0; i < 64; i++) {
      try {
        ctx.restore();
      } catch {
        break;
      }
    }
    resetCtxState(ctx);
  }

  SideRunner.render = {
    drawPixels(ctx, grid, ox, oy, color, outline, px) {
      const cell = px || PIXEL;
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (!grid[row][col]) continue;
          const x = Math.floor(ox + col * cell);
          const y = Math.floor(oy + row * cell);
          if (outline) {
            ctx.fillStyle = outline;
            ctx.fillRect(x - 1, y - 1, cell + 2, cell + 2);
          }
          ctx.fillStyle = color;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    },

    drawGlowRect(ctx, x, y, w, h, radius, fill, stroke, glowColor) {
      ctx.save();
      ctx.shadowColor = glowColor || "rgba(139, 122, 168, 0.65)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radius);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    },

    draw() {
      const g = SideRunner.game;
      const ctx = g.ctx;
      const canvas = g.canvas;
      if (!ctx || !canvas) return;

      drainCtxStack(ctx);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const theme = getTheme();
      const offset = SideRunner.effects.getShakeOffset();

      ctx.save();
      try {
        ctx.translate(offset.x, offset.y);

        SideRunner.render.drawBackground(ctx, theme);
        SideRunner.render.drawCollectibles(ctx, theme);
        SideRunner.render.drawObstacles(ctx, theme);
        SideRunner.effects.drawJumpTrails(ctx, theme);
        SideRunner.render.drawPlayer(ctx, theme);
        SideRunner.effects.drawDashFlash(ctx);
        SideRunner.effects.drawCollisionFlash(ctx);
        SideRunner.render.drawHUD(ctx, theme);
        SideRunner.render.drawScreenOverlay(ctx, theme);
      } catch (err) {
        console.error("[SideRunner] render error:", err);
      } finally {
        try {
          ctx.restore();
        } catch {
          /* ignore */
        }
        drainCtxStack(ctx);
      }
    },

    drawBackground(ctx, theme) {
      const g = SideRunner.game;
      const parallax = g.parallaxOffset;
      const groundMarks = g.groundMarks;
      const nightBlend = SideRunner.themes.getNightBlend(g.score);
      const cw = CONFIG.canvasWidth;
      const ch = CONFIG.canvasHeight;
      const groundY = CONFIG.groundY;
      const skyBottom = groundY - Math.round(ch * 0.22);

      const gothicTop = theme.skyGothicTop || "#2E1A47";
      const gothicBot = theme.skyGothicBottom || "#120A21";

      // ① 天空底色（全屏最底）
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, gothicTop);
      grad.addColorStop(0.55, gothicTop);
      grad.addColorStop(1, gothicBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      // ② 远景城堡（仅天空带，在平台/角色之下）
      SideRunner.render.drawFarLayer(ctx, theme, parallax, nightBlend);

      const veil = ctx.createLinearGradient(0, 0, 0, skyBottom);
      veil.addColorStop(0, "rgba(46, 26, 71, 0.28)");
      veil.addColorStop(1, "rgba(18, 10, 33, 0)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, cw, skyBottom);

      // ③ 中景雾 → 近景 → ④ 地面平台（不透明，盖住远景下沿）
      SideRunner.render.drawMidLayer(ctx, theme, parallax);
      SideRunner.render.drawNearLayer(ctx, theme, g.nearDecor);
      SideRunner.render.drawPlatforms(ctx, theme, g.groundMarks);
    },

    drawPlatforms(ctx, theme, groundMarks) {
      if (!SideRunner.platforms) return;

      const sorted = SideRunner.platforms.list
        .slice()
        .sort((a, b) => a.x - b.x);

      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (p.type === "PIT") continue;

        const top = p.y;
        ctx.fillStyle = theme.ground;
        ctx.fillRect(p.x, top, p.width, CONFIG.canvasHeight - top);

        ctx.fillStyle = theme.groundLine;
        for (let px = p.x; px < p.x + p.width; px += 8) {
          ctx.fillRect(px, top - 2, 5, 2);
          ctx.fillRect(px + 2, top, 3, 1);
        }

        const prev = sorted[i - 1];
        const next = sorted[i + 1];
        if (prev && prev.type !== "PIT" && Math.abs(prev.y - top) > 2) {
          const edgeX = Math.max(p.x, prev.x + prev.width);
          SideRunner.render.drawPlatformCliff(ctx, edgeX, prev.y, top, theme);
        }
        if (next && next.type !== "PIT" && Math.abs(next.y - top) > 2) {
          const edgeX = Math.min(p.x + p.width, next.x);
          SideRunner.render.drawPlatformCliff(ctx, edgeX, top, next.y, theme);
        }

        if (groundMarks) {
          ctx.fillStyle = theme.mark;
          for (const mx of groundMarks) {
            if (mx >= p.x && mx < p.x + p.width) {
              ctx.fillRect(mx, top + 4, 8, 3);
              ctx.fillRect(mx + 4, top + 12, 4, 2);
            }
          }
        }
      }
    },

    drawPlatformCliff(ctx, x, yHigh, yLow, theme) {
      const yTop = Math.min(yHigh, yLow);
      const yBot = Math.max(yHigh, yLow);
      const cliffW = 5;
      ctx.fillStyle = theme.ground;
      ctx.fillRect(x - 3, yTop, cliffW, yBot - yTop + 4);

      const crack = theme.cliffCrack || "rgba(90, 82, 110, 0.85)";
      const crackHi = theme.cliffCrackHi || "rgba(120, 110, 135, 0.55)";
      for (let py = yTop + 4; py < yBot - 2; py += 5) {
        ctx.fillStyle = crack;
        ctx.fillRect(x - 2, py, 1, 4);
        ctx.fillRect(x, py + 2, 1, 3);
        ctx.fillStyle = crackHi;
        ctx.fillRect(x - 1, py + 1, 1, 2);
      }
      ctx.fillStyle = theme.groundLine;
      ctx.fillRect(x - 3, yTop, cliffW, 2);
    },

    drawFarLayer(ctx, theme, parallax, nightBlend) {
      const moonX = S(620) - (parallax.far % S(80));
      const moonY = SY(42);
      const moonR = S(14) + nightBlend * S(5);
      const moonColor = theme.moonFace || "#E6E6FA";

      ctx.fillStyle = moonColor;
      ctx.globalAlpha = 0.55 + nightBlend * 0.4;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = theme.cloud;
      for (let i = -1; i < 4; i++) {
        const cx = i * S(280) - (parallax.far % S(280));
        ctx.beginPath();
        ctx.ellipse(cx + S(100), SY(55), S(45), SY(12), 0, 0, Math.PI * 2);
        ctx.ellipse(cx + S(140), SY(50), S(35), SY(10), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawMidLayer(ctx, theme, parallax) {
      const off = parallax.mid % S(220);
      const castleBase = SY(95);

      ctx.fillStyle = theme.castle;
      for (let i = -1; i < 5; i++) {
        const bx = i * S(220) - off;
        ctx.fillRect(bx + S(40), castleBase, S(12), S(75));
        ctx.fillRect(bx + S(70), castleBase - S(20), S(50), S(95));
        ctx.fillRect(bx + S(55), castleBase - S(35), S(18), S(25));
        ctx.fillRect(bx + S(110), castleBase - S(30), S(14), S(20));
      }

      ctx.fillStyle = theme.tree;
      for (let i = -1; i < 6; i++) {
        const tx = i * S(160) - (off * 1.1) % S(160);
        ctx.fillRect(tx + S(8), castleBase + S(10), S(6), S(65));
        ctx.beginPath();
        ctx.moveTo(tx, castleBase + S(5));
        ctx.lineTo(tx + S(11), castleBase - S(28));
        ctx.lineTo(tx + S(22), castleBase + S(5));
        ctx.closePath();
        ctx.fill();
      }
    },

    drawNearLayer(ctx, theme, nearDecor) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = theme.nearDecor;
      for (const d of nearDecor) {
        const surface =
          SideRunner.platforms &&
          SideRunner.platforms.getSolidSurfaceYAt(d.x + S(12));
        const base = surface != null ? surface : CONFIG.groundY;
        if (d.type === "bush") {
          ctx.fillRect(d.x, base - S(12), S(18), S(10));
          ctx.fillRect(d.x + S(5), base - S(17), S(12), S(6));
        } else {
          ctx.fillRect(d.x + S(9), base - S(8), S(6), S(8));
          ctx.fillRect(d.x + S(2), base - S(5), S(20), S(5));
        }
      }
      ctx.restore();
    },

    drawCollectibles(ctx, theme) {
      if (SideRunner.collectibles && SideRunner.collectibles.drawAll) {
        SideRunner.collectibles.drawAll(ctx, theme || getTheme());
      }
    },

    drawPlayer(ctx, theme) {
      const player = SideRunner.player.data;
      if (!Number.isFinite(player.y)) return;

      const px = SideRunner.player.getDrawX();
      const g = SideRunner.game;

      ctx.save();
      try {
        if (SideRunner.player.isDashing()) {
          for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = 0.12 * i;
            ctx.fillStyle = "rgba(232, 224, 200, 0.5)";
            ctx.fillRect(px - i * 10, player.y, CONFIG.standWidth, CONFIG.standHeight);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgba(232, 224, 200, 0.35)";
          ctx.fillRect(px - 6, player.y - 2, CONFIG.standWidth + 32, CONFIG.standHeight + 4);
        }

        if (SideRunner.player.isInvulnerable() && !SideRunner.player.isDashing()) {
          const flicker = Math.sin(g.animFrame * 24) > 0;
          ctx.globalAlpha = flicker ? 0.5 : 1;
        } else {
          ctx.globalAlpha = 1;
        }

        const w = player.ducking ? CONFIG.duckWidth : CONFIG.standWidth;
        const h = player.ducking ? CONFIG.duckHeight : CONFIG.standHeight;
        const sprites = SideRunner.catSprites;
        if (!sprites) return;

        const ox = px + (w - sprites.ART_W) / 2;
        const surface =
          SideRunner.platforms &&
          SideRunner.platforms.getSurfaceYAt(SideRunner.player.feetX());
        const isRunning =
          g.state === State.PLAYING &&
          player.onGround &&
          !player.ducking &&
          surface != null;

        sprites.draw(ctx, ox, player.y, theme, {
          ducking: player.ducking,
          onGround: player.onGround,
          running: isRunning,
          runPhase: player.runPhase,
          blink: SideRunner.player.isBlinking() && player.onGround && !player.ducking,
          animFrame: g.animFrame,
          boxW: w,
          boxH: h,
          magicAura: SideRunner.player.hasMagicAura(),
        });
      } finally {
        ctx.restore();
      }
    },

    drawPixelObstacle(ctx, grid, o, colors) {
      const cell = 3;
      const gw = grid[0].length * cell;
      const gh = grid.length * cell;
      const ox = o.x + (o.w - gw) / 2;
      const oy = o.y + (o.h - gh);
      SideRunner.render.drawPixels(ctx, grid, ox, oy, colors.fill, colors.outline, cell);
    },

    drawTombstone(ctx, o, theme) {
      if (SideRunner.obstacleSprites) {
        SideRunner.obstacleSprites.drawTombstone(ctx, o, theme);
      }
    },

    drawFence(ctx, o, theme) {
      SideRunner.render.drawPixelObstacle(ctx, FENCE_PX, o, {
        fill: "#6b4a6b",
        outline: "#4a3048",
      });
    },

    drawSpike(ctx, o, theme) {
      if (SideRunner.obstacleSprites) {
        SideRunner.obstacleSprites.drawSpike(ctx, o, theme);
      }
    },

    drawBat(ctx, o, theme) {
      if (SideRunner.obstacleSprites) {
        SideRunner.obstacleSprites.drawBat(ctx, o, theme);
      }
    },

    drawObstacles(ctx, theme) {
      const list = SideRunner.obstacles && SideRunner.obstacles.list;
      if (!list) return;

      for (const o of list) {
        ctx.save();
        try {
          if (o.type === "ground") {
            if (o.subtype === "fence") SideRunner.render.drawFence(ctx, o, theme);
            else if (o.subtype === "spike") SideRunner.render.drawSpike(ctx, o, theme);
            else SideRunner.render.drawTombstone(ctx, o, theme);
          } else {
            SideRunner.render.drawBat(ctx, o, theme);
          }
        } catch (err) {
          console.warn("[SideRunner] obstacle draw failed:", o.subtype || o.type, err);
        } finally {
          try {
            ctx.restore();
          } catch {
            /* ignore */
          }
        }
      }
    },

    drawHUD(ctx, theme) {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;

      const scoreText = `分数 ${g.scoreDisplayInt}`;
      const popT = g.scorePopTimer;
      const popProgress = popT > 0 ? 1 - popT / CONFIG.scorePopDuration : 0;
      const scale =
        popProgress > 0 ? 1 + (CONFIG.scorePopScaleMax - 1) * popProgress : 1;
      const alpha = popProgress > 0 ? 0.75 + 0.25 * (1 - popProgress) : 1;

      ctx.save();
      ctx.shadowColor = "rgba(232, 224, 200, 0.4)";
      ctx.shadowBlur = popProgress > 0 ? 8 : 0;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popProgress > 0 ? "#e8e0c8" : theme.catOutline;
      ctx.font = `${S(16)}px Courier New, monospace`;
      ctx.translate(S(12), S(22));
      ctx.scale(scale, scale);
      ctx.fillText(scoreText, 0, 0);
      ctx.restore();

      if (g.newRecordActive) {
        const pulse = 0.75 + 0.25 * Math.sin(g.animFrame * 8);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = `bold ${S(11)}px Courier New, monospace`;
        ctx.fillStyle = "#e8c878";
        ctx.fillText("新纪录!", S(12), S(48));
        ctx.restore();
      }

      if (g.comboCount > 0) {
        const comboPulse = 0.85 + 0.15 * Math.sin(g.animFrame * 10);
        ctx.save();
        ctx.globalAlpha = comboPulse;
        ctx.font = `${S(10)}px Courier New, monospace`;
        ctx.fillStyle = g.comboMultiplier >= 2 ? "#e8c878" : "#b8a8c8";
        const multText =
          g.comboMultiplier > 1
            ? `连击 ${g.comboCount} · x${g.comboMultiplier.toFixed(1)}`
            : `连击 ${g.comboCount}`;
        ctx.fillText(multText, S(12), S(g.newRecordActive ? 62 : 48));
        ctx.restore();
      }

      if (SideRunner.difficulty.getSpawnParams(g.score).inWarmUp) {
        ctx.font = `${S(10)}px Courier New, monospace`;
        ctx.fillStyle = theme.catOutline;
        ctx.globalAlpha = 0.7;
        ctx.fillText("热身", CONFIG.canvasWidth - S(42), S(36));
        ctx.globalAlpha = 1;
      }

      let statusY = S(18);
      if (SideRunner.themes.isDeepNight(g.score)) {
        ctx.font = `${S(10)}px Courier New, monospace`;
        ctx.fillStyle = theme.hud || theme.catOutline;
        ctx.fillText("深夜", CONFIG.canvasWidth - S(42), statusY);
        statusY = S(34);
      }

      if (g.curseTimer > 0) {
        ctx.font = `${S(10)}px Courier New, monospace`;
        ctx.fillStyle = "#c85068";
        ctx.fillText("诅咒", CONFIG.canvasWidth - S(42), statusY);
      }

      const cdLeft = SideRunner.player.getDashCooldownLeft();
      const cdMax = CONFIG.dashCooldown;
      const bx = S(12);
      const by = S(36);
      const bw = S(52);
      const bh = S(6);
      ctx.font = `${S(9)}px Courier New, monospace`;
      if (SideRunner.player.isDashing()) {
        ctx.fillStyle = "#e8e0c8";
        ctx.fillText("冲刺!", bx, by - 2);
        ctx.fillStyle = "rgba(232, 224, 200, 0.9)";
        ctx.fillRect(bx, by + 8, bw, bh);
      } else if (cdLeft > 0.05) {
        ctx.fillStyle = "rgba(180, 170, 200, 0.75)";
        ctx.fillText("Shift", bx, by - 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(bx, by + 8, bw, bh);
        ctx.fillStyle = "rgba(139, 122, 168, 0.9)";
        ctx.fillRect(bx, by + 8, bw * (1 - cdLeft / cdMax), bh);
      } else {
        ctx.fillStyle = "rgba(232, 224, 200, 0.85)";
        ctx.fillText("Shift 就绪", bx, by - 2);
        ctx.fillStyle = "rgba(232, 224, 200, 0.35)";
        ctx.fillRect(bx, by + 8, bw, bh);
      }
    },

    drawScreenOverlay(ctx, theme) {
      const g = SideRunner.game;
      const pulse = 0.85 + 0.15 * Math.sin(SideRunner.game.animFrame * 4);

      if (g.state === State.IDLE) {
        ctx.fillStyle = "rgba(8, 6, 18, 0.35)";
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

        const glow = theme.glow || "rgba(139, 122, 168, 0.75)";
        ctx.textAlign = "center";
        ctx.fillStyle = "#e8e0c8";
        ctx.font = `bold ${S(28)}px Cinzel, serif`;
        ctx.shadowColor = glow;
        ctx.shadowBlur = S(14);
        ctx.fillText("横版无尽跑酷", CONFIG.canvasWidth / 2, S(88));
        ctx.font = `bold ${S(17)}px Courier New, monospace`;
        ctx.globalAlpha = pulse;
        ctx.fillText("按空格或左键开始", CONFIG.canvasWidth / 2, S(122));
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        return;
      }

      if (g.state === State.PAUSED) {
        ctx.fillStyle = "rgba(8, 6, 18, 0.55)";
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
        ctx.textAlign = "center";
        ctx.fillStyle = "#e8e0c8";
        ctx.font = `bold ${S(22)}px Cinzel, serif`;
        ctx.fillText("已暂停", CONFIG.canvasWidth / 2, S(92));
        ctx.font = `${S(14)}px Courier New, monospace`;
        ctx.fillStyle = "#b8a8c8";
        ctx.fillText("点击「继续」或按 Esc", CONFIG.canvasWidth / 2, S(118));
        ctx.textAlign = "left";
      }

      if (g.state === State.GAME_OVER) {
        ctx.fillStyle = "rgba(5, 4, 12, 0.5)";
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    },
  };
})(window);
