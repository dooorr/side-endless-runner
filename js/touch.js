/**
 * 横版无尽跑酷 — 移动端触控（跳跃 / 下蹲 / 冲刺）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const State = SideRunner.State;

  const root = document.getElementById("touch-controls");
  const jumpBtn = document.getElementById("touch-jump");
  const duckBtn = document.getElementById("touch-duck");
  const dashBtn = document.getElementById("touch-dash");

  function shouldShowTouchUi() {
    if (!root) return false;
    if (global.matchMedia && global.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
    if (global.matchMedia && global.matchMedia("(max-width: 900px)").matches) {
      return true;
    }
    return "ontouchstart" in global;
  }

  function setVisible(visible) {
    if (!root) return;
    root.hidden = !visible;
  }

  function syncVisibility() {
    const g = SideRunner.game;
    const playing =
      g &&
      (g.state === State.PLAYING ||
        g.state === State.IDLE ||
        g.state === State.PAUSED);
    setVisible(shouldShowTouchUi() && playing);
  }

  function preventTouchDefault(e) {
    e.preventDefault();
  }

  function bindHoldButton(btn, onStart, onEnd) {
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => {
      preventTouchDefault(e);
      if (SideRunner.audio) SideRunner.audio.unlock();
      onStart();
    }, { passive: false });
    btn.addEventListener("touchend", (e) => {
      preventTouchDefault(e);
      onEnd();
    }, { passive: false });
    btn.addEventListener("touchcancel", () => onEnd(), { passive: true });
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (SideRunner.audio) SideRunner.audio.unlock();
      onStart();
    });
    btn.addEventListener("mouseup", (e) => {
      e.preventDefault();
      onEnd();
    });
    btn.addEventListener("mouseleave", () => onEnd());
  }

  function bindTapButton(btn, onTap) {
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => {
      preventTouchDefault(e);
      if (SideRunner.audio) SideRunner.audio.unlock();
      onTap();
    }, { passive: false });
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (SideRunner.audio) SideRunner.audio.unlock();
      onTap();
    });
  }

  SideRunner.touch = {
    init() {
      if (!root) return;

      bindTapButton(jumpBtn, () => {
        SideRunner.inputModule.handleJumpAction();
      });

      bindHoldButton(
        duckBtn,
        () => SideRunner.inputModule.setTouchDuck(true),
        () => SideRunner.inputModule.setTouchDuck(false)
      );

      bindTapButton(dashBtn, () => {
        const g = SideRunner.game;
        if (g && g.state === State.PLAYING) SideRunner.player.tryDash();
      });

      global.addEventListener("resize", syncVisibility);
      syncVisibility();
    },

    syncVisibility,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => SideRunner.touch.init());
  } else {
    SideRunner.touch.init();
  }
})(window);
