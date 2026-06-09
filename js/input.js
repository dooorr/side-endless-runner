/**
 * 横版无尽跑酷 — 键鼠输入、失焦重置、冲刺、换肤
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const State = SideRunner.State;

  SideRunner.input = {
    duckHeld: false,
    jumpBufferTime: 0,
    duckFromMouse: false,
    duckFromTouch: false,
    keyCHeld: false,
  };

  function syncDuckHeld() {
    const input = SideRunner.input;
    input.duckHeld = input.keyCHeld || input.duckFromMouse || input.duckFromTouch;
  }

  function resetInput() {
    const input = SideRunner.input;
    input.duckHeld = false;
    input.jumpBufferTime = 0;
    input.duckFromMouse = false;
    input.duckFromTouch = false;
    input.keyCHeld = false;
  }

  function setTouchDuck(on) {
    SideRunner.input.duckFromTouch = on;
    syncDuckHeld();
  }

  function setKeyCHeld(on) {
    SideRunner.input.keyCHeld = on;
    syncDuckHeld();
  }

  function setMouseDuck(on) {
    SideRunner.input.duckFromMouse = on;
    syncDuckHeld();
  }

  function tryThemeKey(e) {
    const game = SideRunner.game;
    if (game.state !== State.IDLE || !SideRunner.themes) return false;
    if (e.code === "Digit1") {
      SideRunner.themes.setTheme("dusk");
      if (SideRunner.ui) SideRunner.ui.sync(State.IDLE);
      return true;
    }
    if (e.code === "Digit2") {
      SideRunner.themes.setTheme("redmoon");
      if (SideRunner.ui) SideRunner.ui.sync(State.IDLE);
      return true;
    }
    if (e.code === "Digit3") {
      SideRunner.themes.setTheme("midnight");
      if (SideRunner.ui) SideRunner.ui.sync(State.IDLE);
      return true;
    }
    if (e.code === "KeyT") {
      SideRunner.themes.cycleTheme(1);
      if (SideRunner.ui) SideRunner.ui.sync(State.IDLE);
      return true;
    }
    return false;
  }

  SideRunner.inputModule = {
    resetInput,
    setTouchDuck,
    init(canvas) {
      const game = SideRunner.game;

      document.addEventListener("keydown", (e) => {
        if (tryThemeKey(e)) {
          e.preventDefault();
          return;
        }
        if (e.code === "Space") {
          e.preventDefault();
          SideRunner.inputModule.handleJumpAction();
        }
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
          e.preventDefault();
          if (game.state === State.PLAYING) SideRunner.player.tryDash();
        }
        if (e.code === "KeyC") {
          e.preventDefault();
          setKeyCHeld(true);
        }
        if (e.code === "KeyR" && game.state === State.GAME_OVER) {
          game.restart();
        }
        if (e.code === "Escape") {
          e.preventDefault();
          if (game.state === State.PLAYING) game.pauseGame();
          else if (game.state === State.PAUSED) game.resumeGame();
        }
        if (e.code === "KeyP" && game.state === State.PLAYING) {
          e.preventDefault();
          game.pauseGame();
        }
        if (e.code === "KeyM") {
          e.preventDefault();
          if (SideRunner.audio) {
            SideRunner.audio.toggleMute();
            if (SideRunner.ui) SideRunner.ui.syncMuteButton();
          }
        }
      });

      document.addEventListener("keyup", (e) => {
        if (e.code === "KeyC") setKeyCHeld(false);
      });

      window.addEventListener("blur", resetInput);

      canvas.addEventListener("mousedown", (e) => {
        canvas.focus();
        if (SideRunner.audio) SideRunner.audio.unlock();
        if (e.button === 0) SideRunner.inputModule.handleJumpAction();
        if (e.button === 2) setMouseDuck(true);
      });

      canvas.addEventListener("mouseup", (e) => {
        if (e.button === 2) setMouseDuck(false);
      });

      canvas.addEventListener("mouseleave", () => {
        if (SideRunner.input.duckFromMouse) setMouseDuck(false);
      });

      canvas.addEventListener("contextmenu", (e) => e.preventDefault());

      canvas.addEventListener("click", () => {
        if (game.state === State.GAME_OVER) game.restart();
      });
    },

    handleJumpAction() {
      if (SideRunner.audio) SideRunner.audio.unlock();

      const game = SideRunner.game;
      if (game.state === State.PAUSED) return;
      if (game.state === State.GAME_OVER) {
        game.restart();
        return;
      }
      if (game.state === State.IDLE) {
        game.startGame();
        return;
      }
      SideRunner.player.tryJump();
    },
  };
})(window);
