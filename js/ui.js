/**
 * 横版无尽跑酷 — 画布外 UI 面板（开始说明 / 结束提示）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const State = SideRunner.State;

  const startPanel = document.getElementById("start-panel");
  const gameoverPanel = document.getElementById("gameover-panel");
  const pausePanel = document.getElementById("pause-panel");
  const pauseBtn = document.getElementById("pause-btn");
  const pauseResumeBtn = document.getElementById("pause-resume-btn");
  const pauseQuitBtn = document.getElementById("pause-quit-btn");
  const muteBtn = document.getElementById("mute-btn");
  const themeNameEl = document.getElementById("theme-name");
  const goScoreEl = document.getElementById("go-score");
  const goRecordEl = document.getElementById("go-record");

  const ICON_PAUSE =
    '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<polygon points="7,5 7,19 13,12" fill="currentColor"/>' +
    '<polygon points="17,5 17,19 11,12" fill="currentColor"/>' +
    "</svg>";
  const ICON_RESUME =
    '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<polygon points="5,5 5,19 13,12" fill="currentColor"/>' +
    '<polygon points="11,5 11,19 19,12" fill="currentColor" opacity="0.92"/>' +
    "</svg>";
  const ICON_QUIT =
    '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>' +
    "</svg>";
  const ICON_MUTE_ON =
    '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>' +
    '<path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";
  const ICON_MUTE_OFF =
    '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>' +
    '<path d="M15 8a5 5 0 010 8M17 6a8 8 0 010 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    "</svg>";

  let pauseControlsBound = false;
  let muteControlBound = false;

  function bindMuteControl() {
    if (muteControlBound || !muteBtn) return;
    muteControlBound = true;
    muteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (SideRunner.audio) {
        SideRunner.audio.toggleMute();
        SideRunner.ui.syncMuteButton();
      }
    });
    SideRunner.ui.syncMuteButton();
  }

  function bindPauseControls() {
    if (pauseControlsBound) return;
    pauseControlsBound = true;

    if (pauseBtn) {
      pauseBtn.innerHTML = ICON_PAUSE;
      pauseBtn.setAttribute("aria-label", "暂停");
      pauseBtn.title = "暂停";
      pauseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = SideRunner.game;
        if (g && g.state === State.PLAYING) g.pauseGame();
      });
    }
    if (pauseResumeBtn) {
      pauseResumeBtn.innerHTML = ICON_RESUME;
      pauseResumeBtn.setAttribute("aria-label", "继续");
      pauseResumeBtn.title = "继续";
      pauseResumeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = SideRunner.game;
        if (g) g.resumeGame();
      });
    }
    if (pauseQuitBtn) {
      pauseQuitBtn.innerHTML = ICON_QUIT;
      pauseQuitBtn.setAttribute("aria-label", "终止本局");
      pauseQuitBtn.title = "终止本局";
      pauseQuitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = SideRunner.game;
        if (g) g.quitFromPause();
      });
    }
    if (pausePanel) {
      pausePanel.addEventListener("mousedown", (e) => e.stopPropagation());
      pausePanel.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  SideRunner.ui = {
    initPauseControls() {
      bindPauseControls();
      bindMuteControl();
    },

    syncMuteButton() {
      if (!muteBtn || !SideRunner.audio) return;
      const muted = SideRunner.audio.isMuted();
      muteBtn.innerHTML = muted ? ICON_MUTE_ON : ICON_MUTE_OFF;
      muteBtn.setAttribute("aria-label", muted ? "取消静音" : "静音");
      muteBtn.title = muted ? "取消静音 (M)" : "静音 (M)";
      muteBtn.classList.toggle("mute-btn--active", muted);
    },

    sync(state) {
      bindPauseControls();
      bindMuteControl();
      const canvas = document.getElementById("game");
      if (canvas) {
        canvas.style.pointerEvents =
          state === State.PAUSED ? "none" : "auto";
      }
      if (startPanel) {
        startPanel.hidden = state !== State.IDLE;
      }
      if (gameoverPanel) {
        gameoverPanel.hidden = state !== State.GAME_OVER;
      }
      if (pausePanel) {
        pausePanel.hidden = state !== State.PAUSED;
      }
      if (pauseBtn) {
        pauseBtn.hidden = state !== State.PLAYING;
      }
      if (SideRunner.touch) SideRunner.touch.syncVisibility();
      if (themeNameEl && SideRunner.themes) {
        themeNameEl.textContent = SideRunner.themes.getCurrentName();
      }
    },

    showGameOver(score, highScore, onTop5, deathReason, runStats, newlyUnlocked) {
      if (goScoreEl) goScoreEl.textContent = String(Math.floor(score));
      if (goRecordEl) {
        if (onTop5 && score > 0) {
          goRecordEl.textContent = "恭喜上榜 Top 5！";
          goRecordEl.className = "go-record go-record--new";
        } else {
          goRecordEl.textContent = `历史最高 ${highScore}`;
          goRecordEl.className = "go-record";
        }
      }

      const g = SideRunner.game || {};

      // 死亡原因文案（直接从 game 对象读取，更健壮）
      const reasonEl = document.getElementById("go-death-reason");
      if (reasonEl) {
        const map = {
          pit: "坠入深坑",
          tombstone: "撞上墓碑",
          spike: "踩中尖刺",
          bat: "被蝙蝠击中",
        };
        const reason = g.lastDeathReason || "unknown";
        const text = map[reason] || "游戏结束";
        reasonEl.textContent = text;
        reasonEl.hidden = false;
      }

      // 本局统计摘要（直接从 game 对象读取）
      const statsEl = document.getElementById("go-run-stats");
      const rs = g.runStats;
      if (statsEl && rs) {
        const s = rs;
        const lines = [
          `存活 ${Math.floor(s.playSeconds)}s · 最高 ${s.maxTier} 档`,
          `金币 ${s.coins} · 猫爪 ${s.paws} · 魔法 ${s.magic} · 诅咒 ${s.curses}`,
        ];
        if (s.dashCount > 0) lines.push(`冲刺 ${s.dashCount} 次`);
        if (s.maxCombo > 1) lines.push(`最高连击 ${s.maxCombo}`);
        statsEl.innerHTML = lines.map((l) => `<span>${l}</span>`).join("<br>");
        statsEl.hidden = false;
      } else if (statsEl) {
        statsEl.hidden = true;
      }

      // 本次解锁的成就
      const achEl = document.getElementById("go-achievements");
      if (achEl) {
        if (newlyUnlocked && newlyUnlocked.length > 0) {
          const html = newlyUnlocked
            .map(
              (a) =>
                `<span class="ach-badge"><span class="ach-icon">${a.icon}</span> ${a.name}</span>`
            )
            .join("");
          achEl.innerHTML = `新成就：<br>${html}`;
          achEl.hidden = false;
        } else {
          achEl.hidden = true;
        }
      }

      SideRunner.ui.sync(State.GAME_OVER);
      if (SideRunner.leaderboard) SideRunner.leaderboard.updateFooter();
    },
  };
})(window);
