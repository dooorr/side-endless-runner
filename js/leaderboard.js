/**
 * 横版无尽跑酷 — 本地 Top5 排行榜（IndexedDB 版本 v0.7）
 * 替代 localStorage，提升工程化与持久化可靠性
 */
(function (global) {
  const SideRunner = global.SideRunner;

  const DB_NAME = "SideRunnerDB";
  const STORE_NAME = "scores";
  const DB_VERSION = 1;
  const MAX_ENTRIES = 5;

  let entries = [];
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("score", "score", { unique: false });
          store.createIndex("at", "at", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        // 迁移旧 localStorage 数据（如果存在）
        migrateFromLocalStorage(db);
        resolve(db);
      };

      request.onerror = (event) => {
        console.warn("[Leaderboard] IndexedDB 打开失败，回退内存模式", event);
        reject(event);
      };
    });

    return dbPromise;
  }

  async function migrateFromLocalStorage(db) {
    const LEGACY_KEY = "shadowMeowTop5";
    const KEY = "sideRunnerTop5";

    try {
      let raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return;

      const oldEntries = JSON.parse(raw);
      if (!Array.isArray(oldEntries) || oldEntries.length === 0) return;

      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const e of oldEntries) {
        if (e && typeof e.score === "number") {
          store.add({ score: e.score, at: e.at || Date.now() });
        }
      }

      // 迁移成功后清理旧数据
      localStorage.removeItem(KEY);
      localStorage.removeItem(LEGACY_KEY);

      await new Promise((res) => (tx.oncomplete = res));
      console.log("[Leaderboard] 已从 localStorage 迁移到 IndexedDB");
    } catch (err) {
      console.warn("[Leaderboard] 迁移失败", err);
    }
  }

  async function loadTop5() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("score");

      // 按分数降序取前 5
      const request = index.openCursor(null, "prev");
      const result = [];

      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && result.length < MAX_ENTRIES) {
            result.push(cursor.value);
            cursor.continue();
          } else {
            entries = result;
            SideRunner.leaderboard.entries = entries;
            resolve(entries);
          }
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async function saveEntry(score) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.add({ score: Math.floor(score), at: Date.now() });

      // 超过 5 条则清理最旧的
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result > MAX_ENTRIES) {
          const delTx = db.transaction(STORE_NAME, "readwrite");
          const delStore = delTx.objectStore(STORE_NAME);
          const delIndex = delStore.index("score");
          const delCursor = delIndex.openCursor(null, "next"); // 分数最低的先删

          let deleted = 0;
          delCursor.onsuccess = (e) => {
            const c = e.target.result;
            if (c && deleted < countReq.result - MAX_ENTRIES) {
              delStore.delete(c.primaryKey);
              deleted++;
              c.continue();
            }
          };
        }
      };

      await new Promise((res) => (tx.oncomplete = res));
    } catch (err) {
      console.warn("[Leaderboard] 保存失败", err);
    }
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // 初始化时加载
  loadTop5();

  SideRunner.leaderboard = {
    entries,

    async reload() {
      await loadTop5();
      return entries;
    },

    async addScore(score) {
      const s = Math.floor(score);
      if (s <= 0) return false;

      await saveEntry(s);
      await loadTop5();

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
      if (entries.length < MAX_ENTRIES) return true;
      return s >= entries[entries.length - 1].score;
    },

    async updateFooter() {
      const el = document.getElementById("leaderboard-panel");
      if (!el) return;

      await loadTop5();

      if (entries.length === 0) {
        el.innerHTML = '<span class="lb-empty">暂无纪录</span>';
        return;
      }

      el.innerHTML = entries
        .map(
          (e, i) =>
            `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-score">${e.score}</span><span class="lb-date">${formatDate(e.at)}</span></div>`
        )
        .join("");
    },

    async drawInCanvas(ctx, theme, centerY) {
      const CONFIG = SideRunner.CONFIG;
      await loadTop5();

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
