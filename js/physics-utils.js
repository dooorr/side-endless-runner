/**
 * 碰撞与跳跃物理纯函数（供各 IIFE 模块与 Vitest 共用）
 */
(function (global) {
  const root = (global.SideRunner = global.SideRunner || {});

  /** 轴对齐矩形 AABB 重叠检测 */
  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  /** 空中帧：刚离地赋予土狼时间，随后逐帧衰减 */
  function stepCoyoteTime(coyoteTimeLeft, motion, dt, coyoteDuration) {
    if (motion.onGround) return coyoteTimeLeft;
    let next = coyoteTimeLeft;
    if (motion.wasOnGround) next = coyoteDuration;
    if (next > 0) next = Math.max(0, next - dt);
    return next;
  }

  function resetCoyoteOnGround() {
    return 0;
  }

  /** 跳跃输入缓冲逐帧衰减 */
  function stepJumpBuffer(jumpBufferTime, dt) {
    if (jumpBufferTime <= 0) return 0;
    return Math.max(0, jumpBufferTime - dt);
  }

  /**
   * 当前帧是否允许起跳（与 player.js 逻辑一致）
   * @param {{ playing: boolean, ducking: boolean, dashTimer: number, onGround: boolean, coyoteTimeLeft: number, doubleJumpUsed: boolean }} state
   */
  function canJumpNow(state) {
    if (!state.playing || state.ducking || state.dashTimer > 0) return false;
    if (state.onGround || state.coyoteTimeLeft > 0) return true;
    if (!state.onGround && !state.doubleJumpUsed) return true;
    return false;
  }

  /**
   * 缓冲跳跃是否应在本帧执行；返回 null 表示不跳
   * @returns {{ isDouble: boolean } | null}
   */
  function resolveBufferedJump(state) {
    if (!state.canJump || state.jumpBufferTime <= 0) return null;
    return {
      isDouble: !state.onGround && state.coyoteTimeLeft <= 0,
    };
  }

  /** 障碍/收集物碰撞盒内缩（与 obstacles.js 一致） */
  function insetHitbox(rect, inset) {
    return {
      x: rect.x + inset,
      y: rect.y + inset,
      w: rect.w - inset * 2,
      h: rect.h - inset * 2,
    };
  }

  root.physics = {
    rectsOverlap,
    stepCoyoteTime,
    resetCoyoteOnGround,
    stepJumpBuffer,
    canJumpNow,
    resolveBufferedJump,
    insetHitbox,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
