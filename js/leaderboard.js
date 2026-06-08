/**
 * 横版无尽跑酷 — 本地 Top5 排行榜（v0.6）
 */
(function (global) {
  const SideRunner = global.SideRunner;

  const KEY = "sideRunnerTop5";
  const LEGACY_KEY = "shadowMeowTop5";
  let entries = [];

  function load() {
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY);
        if (raw) localStorage.setItem(KEY, raw);
      }
      entries = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(entries)) entries = [];
    } catch {
      entries = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  load();

  SideRunner.leaderboard = {
    entries,

    reload() {
      load();
      return entries;
    },

    addScore(score) {
      const s = Math.floor(score);
      if (s <= 0) return false;
      entries.push({ score: s, at: Date.now() });
      entries.sort((a, b) => b.score - a.score);
      entries = entries.slice(0, 5);
      save();
      SideRunner.leaderboard.entries = entries;

      const g = SideRunner.game;
      if (g && s > g.highScore) {
        g.highScore = s;
        g.saveHighScore();
      }
      return true;
    },

    isTop5(score) {
      const s = Math.floor(score);
      if (s <= 0) return false;
      if (entries.length < 5) return true;
      return s >= entries[entries.length - 1].score;
    },

    updateFooter() {
      const el = document.getElementById("leaderboard-panel");
      if (!el) return;
      load();
      if (entries.length === 0) {
        el.innerHTML = "<span class=\"lb-empty\">暂无纪录</span>";
        return;
      }
      el.innerHTML = entries
        .map(
          (e, i) =>
            `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-score">${e.score}</span><span class="lb-date">${formatDate(e.at)}</span></div>`
        )
        .join("");
    },

    drawInCanvas(ctx, theme, centerY) {
      const CONFIG = SideRunner.CONFIG;
      load();
      ctx.textAlign = "center";
      ctx.font = "11px Courier New, monospace";
      ctx.fillStyle = theme.hud || theme.catOutline;
      ctx.fillText("— Top 5 —", CONFIG.canvasWidth / 2, centerY);
      entries.forEach((e, i) => {
        ctx.fillText(
          `${i + 1}.  ${e.score}  (${formatDate(e.at)})`,
          CONFIG.canvasWidth / 2,
          centerY + 16 + i * 14
        );
      });
      ctx.textAlign = "left";
    },
  };
})(window);
