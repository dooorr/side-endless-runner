/**
 * 蝙蝠 — 程序化 4 帧扇翅像素造型（无外部素材）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  const CELL = 2;
  const COLS = 4;

  const BAT_PAL = {
    1: "#2a1838",
    2: "#4a2860",
    3: "#8b5cf6",
    4: "#c4b5fd",
    5: "#62e090",
  };

  /** 4 帧 × 14 列 × 8 行，1 身体 2 翼暗 3 翼亮 4 耳 5 眼 */
  const BAT_FRAMES = [
    [
      [0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2],
      [0, 2, 3, 3, 2, 1, 1, 1, 1, 2, 3, 3, 2, 0],
      [2, 3, 3, 2, 1, 1, 4, 5, 4, 1, 1, 2, 3, 3],
      [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
      [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
      [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
      [0, 0, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 0, 0],
      [0, 2, 3, 3, 2, 1, 1, 1, 1, 2, 3, 3, 2, 0],
      [2, 2, 1, 1, 1, 1, 4, 5, 4, 1, 1, 1, 1, 2],
      [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
      [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
    ],
    [
      [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
      [2, 3, 3, 2, 1, 1, 1, 1, 1, 1, 2, 3, 3, 2],
      [2, 3, 2, 1, 1, 4, 5, 4, 1, 1, 1, 2, 3, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
      [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
    ],
    [
      [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
      [0, 2, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 2, 0],
      [2, 3, 3, 2, 1, 1, 1, 1, 1, 1, 2, 3, 3, 2],
      [2, 2, 1, 1, 1, 1, 4, 5, 4, 1, 1, 1, 2, 2],
      [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
      [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
    ],
  ];

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

  function frameSize() {
    const grid = BAT_FRAMES[0];
    return {
      w: grid[0].length * CELL,
      h: grid.length * CELL,
    };
  }

  SideRunner.batSprites = {
    isReady() {
      return true;
    },

    draw(ctx, o) {
      const frame = Math.floor(o.batFrame || 0);
      const col = ((frame % COLS) + COLS) % COLS;
      const grid = BAT_FRAMES[col];
      const { w: artW, h: artH } = frameSize();
      const catH = Math.round(44 * (CONFIG.viewScale || 1.6));
      const targetH =
        CONFIG.batDrawHeight != null ? CONFIG.batDrawHeight : Math.round(catH * 0.88);
      const scale = targetH / artH;
      const dispH = Math.max(1, Math.round(targetH));
      const dispW = Math.max(1, Math.round(artW * scale));
      const bob = Math.sin(frame * 1.15) * 4;
      const drawX = o.x + (o.w - dispW) / 2;
      const drawY = o.y + o.h - dispH - bob;

      ctx.save();
      try {
        ctx.translate(Math.floor(drawX), Math.floor(drawY));
        ctx.scale(scale, scale);
        drawGrid(ctx, grid, 0, 0, BAT_PAL);
      } finally {
        ctx.restore();
      }
    },
  };
})(window);
