/**
 * 横版无尽跑酷 — 主循环、游戏状态、初始化
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;
  const State = SideRunner.State;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const highScoreLabel = document.getElementById("high-score-label");

  SideRunner.game = {
    state: State.IDLE,
    score: 0,
    highScore: 0,
    speed: CONFIG.baseSpeed,
    lastTime: 0,
    animFrame: 0,
    canvas,
    ctx,
    highScoreLabel,
    parallaxOffset: { far: 0, mid: 0, near: 0 },
    nearDecor: [],
    groundMarks: [],
    scoreDisplayInt: 0,
    scorePopTimer: 0,
    curseTimer: 0,
    lastDeathReason: null,
    runStats: null,
    comboCount: 0,
    comboMultiplier: 1,
    comboTimer: 0,
    maxComboThisRun: 0,
    newRecordActive: false,

    resetRunStats() {
      this.runStats = {
        playSeconds: 0,
        coins: 0,
        paws: 0,
        magic: 0,
        curses: 0,
        maxTier: 0,
        dashCount: 0,
        maxCombo: 0,
      };
    },

    resetCombo() {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.comboTimer = 0;
    },

    registerComboPickup() {
      if (!this.runStats) this.resetRunStats();
      this.comboCount++;
      this.comboTimer = CONFIG.comboDecaySeconds;
      const mult = Math.min(
        CONFIG.comboMaxMultiplier,
        1 + this.comboCount * CONFIG.comboStepBonus
      );
      this.comboMultiplier = Math.round(mult * 100) / 100;
      if (this.comboCount > this.maxComboThisRun) {
        this.maxComboThisRun = this.comboCount;
      }
      if (this.comboCount > this.runStats.maxCombo) {
        this.runStats.maxCombo = this.comboCount;
      }
    },

    breakCombo() {
      this.resetCombo();
    },

    applyScoreBonus(basePoints, popScale) {
      const bonus = Math.round(basePoints * this.comboMultiplier);
      this.score += bonus;
      this.scorePopTimer = CONFIG.scorePopDuration * (popScale || 1);
      return bonus;
    },

    updateCombo(dt) {
      if (this.comboTimer <= 0 || this.comboCount <= 0) return;
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.resetCombo();
    },

    updateNewRecordFlag() {
      const displayed = Math.floor(this.score);
      this.newRecordActive =
        this.highScore > 0 && displayed > this.highScore;
    },

    incrementCollect(type) {
      if (!this.runStats) this.resetRunStats();
      if (type === "coin") this.runStats.coins++;
      else if (type === "paw") this.runStats.paws++;
      else if (type === "magic") this.runStats.magic++;
      else if (type === "curse") this.runStats.curses++;
    },

    incrementDash() {
      if (!this.runStats) this.resetRunStats();
      this.runStats.dashCount++;
    },

    loadHighScore() {
      try {
        let v = localStorage.getItem(SideRunner.HIGH_SCORE_KEY);
        if (v == null) {
          v = localStorage.getItem(SideRunner.LEGACY_HIGH_SCORE_KEY);
          if (v != null) localStorage.setItem(SideRunner.HIGH_SCORE_KEY, v);
        }
        this.highScore = v ? parseInt(v, 10) : 0;
      } catch {
        this.highScore = 0;
      }
      highScoreLabel.textContent = `最高分：${this.highScore}`;
    },

    saveHighScore() {
      try {
        localStorage.setItem(SideRunner.HIGH_SCORE_KEY, String(this.highScore));
      } catch {
        /* ignore */
      }
      highScoreLabel.textContent = `最高分：${this.highScore}`;
    },

    initGroundMarks() {
      this.groundMarks = [];
      for (
        let x = 0;
        x < CONFIG.canvasWidth + CONFIG.groundMarkSpacing;
        x += CONFIG.groundMarkSpacing
      ) {
        this.groundMarks.push(x);
      }
      this.nearDecor = [];
      for (
        let x = 0;
        x < CONFIG.canvasWidth + CONFIG.nearDecorSpacing;
        x += CONFIG.nearDecorSpacing
      ) {
        this.nearDecor.push({ x, type: Math.random() < 0.5 ? "bush" : "stump" });
      }
    },

    updateGroundMarks(dt) {
      if (this.state !== State.PLAYING) return;
      const move = this.speed * 60 * dt;
      for (let i = 0; i < this.groundMarks.length; i++) {
        this.groundMarks[i] -= move;
        if (this.groundMarks[i] < -10) {
          const maxX = Math.max(...this.groundMarks, CONFIG.canvasWidth);
          this.groundMarks[i] = maxX + CONFIG.groundMarkSpacing;
        }
      }
    },

    updateParallax(dt) {
      if (this.state !== State.PLAYING) return;
      const scroll = this.speed * 60 * dt;
      this.parallaxOffset.far += scroll * CONFIG.parallaxFar;
      this.parallaxOffset.mid += scroll * CONFIG.parallaxMid;
      this.parallaxOffset.near += scroll * CONFIG.parallaxNear;
      for (let i = 0; i < this.nearDecor.length; i++) {
        this.nearDecor[i].x -= scroll * CONFIG.parallaxNear;
        if (this.nearDecor[i].x < -60) {
          const maxX = Math.max(...this.nearDecor.map((d) => d.x), CONFIG.canvasWidth);
          this.nearDecor[i].x = maxX + CONFIG.nearDecorSpacing;
          this.nearDecor[i].type = Math.random() < 0.5 ? "bush" : "stump";
        }
      }
    },

    updateDifficulty() {
      let s = SideRunner.difficulty.getSpeed(this.score);
      if (this.curseTimer > 0) s *= CONFIG.curseSpeedMult;
      this.speed = s;
    },

    updateCurse(dt) {
      if (this.curseTimer > 0) {
        this.curseTimer -= dt;
        if (this.curseTimer < 0) this.curseTimer = 0;
      }
    },

    triggerGameOver(reason) {
      if (this.state === State.GAME_OVER) return;
      this.state = State.GAME_OVER;
      this.lastDeathReason = reason || SideRunner.CONFIG.DeathReason.UNKNOWN;

      // 捕获本局统计
      if (this.runStats) {
        this.runStats.playSeconds = SideRunner.difficulty.getPlaySeconds(this.score);
        this.runStats.maxTier = SideRunner.difficulty.getTier(this.score);
      }

      const finalScore = Math.floor(this.score);
      let onTop5 = false;
      if (SideRunner.leaderboard) {
        SideRunner.leaderboard.addScore(this.score);
        onTop5 =
          finalScore > 0 &&
          SideRunner.leaderboard.entries.some((e) => e.score === finalScore);
      } else if (this.score > this.highScore) {
        this.highScore = finalScore;
        this.saveHighScore();
      }

      // 成就检查
      let newlyUnlocked = [];
      if (SideRunner.achievements) {
        newlyUnlocked = SideRunner.achievements.checkAndUnlock(
          this.runStats,
          finalScore,
          onTop5,
          this
        );
      }

      if (SideRunner.audio) {
        SideRunner.audio.playDeath();
        SideRunner.audio.stopBgm();
      }
      if (SideRunner.ui) {
        SideRunner.ui.showGameOver(finalScore, this.highScore, onTop5, this.lastDeathReason, this.runStats, newlyUnlocked);
      }
    },

    updateScorePop(dt) {
      const displayed = Math.floor(this.score);
      if (displayed > this.scoreDisplayInt) {
        this.scoreDisplayInt = displayed;
        this.scorePopTimer = CONFIG.scorePopDuration;
      }
      if (this.scorePopTimer > 0) {
        this.scorePopTimer -= dt;
        if (this.scorePopTimer < 0) this.scorePopTimer = 0;
      }
    },

    startGame() {
      this.state = State.PLAYING;
      this.score = 0;
      this.scoreDisplayInt = 0;
      this.scorePopTimer = 0;
      this.speed = CONFIG.baseSpeed;
      if (SideRunner.platforms) SideRunner.platforms.reset();
      SideRunner.player.resetPlayer();
      SideRunner.obstacles.resetObstacles();
      if (SideRunner.collectibles) SideRunner.collectibles.reset();
      this.initGroundMarks();
      this.parallaxOffset = { far: 0, mid: 0, near: 0 };
      this.curseTimer = 0;
      this.lastDeathReason = null;
      this.resetRunStats();
      this.resetCombo();
      this.maxComboThisRun = 0;
      this.newRecordActive = false;
      SideRunner.effects.resetShake();
      SideRunner.effects.resetVisualEffects();
      SideRunner.inputModule.resetInput();
      if (SideRunner.audio) SideRunner.audio.startBgm();
      if (SideRunner.ui) SideRunner.ui.sync(State.PLAYING);
    },

    pauseGame() {
      if (this.state !== State.PLAYING) return;
      this.state = State.PAUSED;
      SideRunner.inputModule.resetInput();
      if (SideRunner.audio) SideRunner.audio.stopBgm();
      if (SideRunner.ui) SideRunner.ui.sync(State.PAUSED);
    },

    resumeGame() {
      if (this.state !== State.PAUSED) return;
      this.state = State.PLAYING;
      if (SideRunner.audio) SideRunner.audio.startBgm();
      if (SideRunner.ui) SideRunner.ui.sync(State.PLAYING);
    },

    quitFromPause() {
      if (this.state !== State.PAUSED) return;
      this.restart();
    },

    restart() {
      this.state = State.IDLE;
      this.score = 0;
      this.scoreDisplayInt = 0;
      this.scorePopTimer = 0;
      this.curseTimer = 0;
      this.lastDeathReason = null;
      this.resetRunStats();
      this.resetCombo();
      this.maxComboThisRun = 0;
      this.newRecordActive = false;
      this.speed = CONFIG.baseSpeed;
      if (SideRunner.platforms) SideRunner.platforms.reset();
      SideRunner.player.resetPlayer();
      SideRunner.obstacles.resetObstacles();
      if (SideRunner.collectibles) SideRunner.collectibles.reset();
      this.initGroundMarks();
      this.parallaxOffset = { far: 0, mid: 0, near: 0 };
      SideRunner.effects.resetShake();
      SideRunner.effects.resetVisualEffects();
      SideRunner.inputModule.resetInput();
      if (SideRunner.audio) SideRunner.audio.stopBgm();
      if (SideRunner.ui) SideRunner.ui.sync(State.IDLE);
    },

    update(dt) {
      if (this.state === State.PAUSED) return;

      this.animFrame += dt;
      SideRunner.effects.updateEffects(dt);

      if (this.state === State.PLAYING) {
        this.score += dt * CONFIG.scoreRate;
        this.updateCurse(dt);
        this.updateCombo(dt);
        this.updateDifficulty();
        this.updateScorePop(dt);
        this.updateNewRecordFlag();
        if (SideRunner.platforms) SideRunner.platforms.update(dt);
        SideRunner.player.updatePlayer(dt);
        if (SideRunner.collectibles) SideRunner.collectibles.update(dt);
        SideRunner.obstacles.updateObstacles(dt);
        this.updateGroundMarks(dt);
        this.updateParallax(dt);
        SideRunner.obstacles.checkCollisions();
      }
    },

    loop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      let dt = (timestamp - this.lastTime) / 1000;
      if (this.state === State.PAUSED) {
        this.lastTime = timestamp;
        dt = 0;
      } else {
        this.lastTime = timestamp;
        dt = Math.min(dt, 0.05);
      }

      this.update(dt);
      SideRunner.render.draw();
      requestAnimationFrame((t) => SideRunner.game.loop(t));
    },

    init() {
      this.loadHighScore();
      if (SideRunner.platforms) SideRunner.platforms.reset();
      SideRunner.player.resetPlayer();
      this.initGroundMarks();
      SideRunner.inputModule.init(canvas);
      if (SideRunner.leaderboard) SideRunner.leaderboard.updateFooter();
      if (SideRunner.ui) {
        SideRunner.ui.initPauseControls();
        SideRunner.ui.sync(State.IDLE);
      }
      canvas.focus();
      requestAnimationFrame((t) => this.loop(t));
    },
  };

  SideRunner.game.init();
})(window);
