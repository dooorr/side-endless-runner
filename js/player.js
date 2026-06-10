/**
 * 横版无尽跑酷 — 玩家物理、二段跳、冲刺、高低平台（v0.7.1）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;
  const State = SideRunner.State;

  const player = {
    x: CONFIG.playerX,
    y: 0,
    vy: 0,
    onGround: true,
    wasOnGround: true,
    ducking: false,
    runPhase: 0,
  };

  let coyoteTimeLeft = 0;
  let blinkTimer = 0;
  let nextBlinkIn = 3;
  let blinkActive = false;
  let doubleJumpUsed = false;
  let dashTimer = 0;
  let dashCooldownLeft = 0;
  let dashOffsetX = 0;
  let invulnTimer = 0;
  let magicAuraTimer = 0;
  let fallArcOffset = 0;
  let ledgeFallActive = false;
  let ledgeFallTime = 0;

  function getDrawX() {
    return CONFIG.playerX + dashOffsetX + fallArcOffset;
  }

  function playerHeight() {
    return player.ducking ? CONFIG.duckHeight : CONFIG.standHeight;
  }

  function feetX() {
    const w = player.ducking ? CONFIG.duckWidth : CONFIG.standWidth;
    return getDrawX() + w * 0.5;
  }

  function feetBottom() {
    return player.y + playerHeight();
  }

  function surfaceForLanding() {
    if (!SideRunner.platforms) return CONFIG.groundY;
    const p = SideRunner.platforms.getPlatformAt(feetX());
    if (!p || p.type === "PIT") return null;
    return p.y;
  }

  /** 站立：脚底须贴在台面上；略高的邻台允许“登台阶” */
  function surfaceTopForFeet() {
    if (!SideRunner.platforms) return CONFIG.groundY;
    const p = SideRunner.platforms.getPlatformAt(feetX());
    if (!p || p.type === "PIT") return null;
    const surface = p.y;
    const slack = CONFIG.platformSupportSlack;
    if (feetBottom() <= surface + slack) return surface;

    const targetTop = surface - playerHeight();
    const stepUp = player.y - targetTop;
    const maxStep = CONFIG.platformStepUpPx != null ? CONFIG.platformStepUpPx : 96;
    if (stepUp > 0 && stepUp <= maxStep) return surface;

    return null;
  }

  function playerGroundY() {
    const surface = surfaceTopForFeet();
    const top = surface != null ? surface : CONFIG.groundY;
    return top - playerHeight();
  }

  function clearLedgeFall() {
    ledgeFallActive = false;
    ledgeFallTime = 0;
    fallArcOffset = 0;
  }

  function startLedgeFall() {
    player.onGround = false;
    player.ducking = false;
    ledgeFallActive = true;
    ledgeFallTime = 0;
    fallArcOffset = 0;
    if (player.vy < CONFIG.ledgeFallInitialVy) {
      player.vy = CONFIG.ledgeFallInitialVy;
    }
  }

  function startPitFall() {
    player.onGround = false;
    player.ducking = false;
    clearLedgeFall();
    if (player.vy < 93) player.vy = 93;
  }

  function updateLedgeFallArc(dt) {
    if (!ledgeFallActive) return;
    ledgeFallTime += dt;
    const dur = CONFIG.ledgeFallArcDuration;
    const t = Math.min(1, ledgeFallTime / dur);
    fallArcOffset = Math.sin(Math.PI * t) * CONFIG.ledgeFallArcPx;
    if (t >= 1) ledgeFallActive = false;
  }

  function triggerFallDeath() {
    const g = SideRunner.game;
    if (g.state !== State.PLAYING) return;
    clearLedgeFall();
    SideRunner.effects.triggerDeathShake();
    g.triggerGameOver(SideRunner.CONFIG.DeathReason.PIT);
  }

  function performJump(isDouble) {
    clearLedgeFall();
    player.vy = isDouble ? CONFIG.doubleJumpVelocity : CONFIG.jumpVelocity;
    player.onGround = false;
    player.ducking = false;
    coyoteTimeLeft = 0;
    SideRunner.input.jumpBufferTime = 0;

    SideRunner.effects.spawnJumpTrail(
      getDrawX(),
      player.y,
      CONFIG.standWidth,
      playerHeight()
    );
    if (SideRunner.audio) {
      SideRunner.audio.playJump(isDouble);
    }
  }

  function canJumpNow() {
    const g = SideRunner.game;
    return SideRunner.physics.canJumpNow({
      playing: g.state === State.PLAYING,
      ducking: player.ducking,
      dashTimer,
      onGround: player.onGround,
      coyoteTimeLeft,
      doubleJumpUsed,
    });
  }

  function tryLandOnSurface() {
    const surface = surfaceForLanding();
    if (surface == null || player.vy < 0) return false;

    const targetTop = surface - playerHeight();
    if (feetBottom() >= surface - 2) {
      player.y = targetTop;
      player.vy = 0;
      player.onGround = true;
      clearLedgeFall();
      coyoteTimeLeft = 0;
      doubleJumpUsed = false;
      return true;
    }
    return false;
  }

  SideRunner.player = {
    data: player,
    playerGroundY,
    getDrawX,
    feetX,
    surfaceTopForFeet,

    getPlayerHitbox() {
      const w = player.ducking ? CONFIG.duckWidth : CONFIG.standWidth;
      const h = playerHeight();
      const pad = CONFIG.hitboxPadding;
      const px = getDrawX();
      return {
        x: px + pad,
        y: player.y + pad,
        w: w - pad * 2,
        h: h - pad * 2,
      };
    },

    isDashing() {
      return dashTimer > 0;
    },

    getDashCooldownLeft() {
      return dashCooldownLeft;
    },

    isInvulnerable() {
      return dashTimer > 0 || invulnTimer > 0;
    },

    isAirborne() {
      return !player.onGround;
    },

    grantMagicBuff() {
      invulnTimer = CONFIG.invulnDurationMagic;
      magicAuraTimer = CONFIG.invulnDurationMagic;
      doubleJumpUsed = false;
    },

    hasMagicAura() {
      return magicAuraTimer > 0;
    },

    resetPlayer() {
      player.x = CONFIG.playerX;
      player.vy = 0;
      player.onGround = true;
      player.wasOnGround = true;
      player.ducking = false;
      player.runPhase = 0;
      coyoteTimeLeft = 0;
      doubleJumpUsed = false;
      dashTimer = 0;
      dashCooldownLeft = 0;
      dashOffsetX = 0;
      invulnTimer = 0;
      magicAuraTimer = 0;
      clearLedgeFall();
      SideRunner.input.jumpBufferTime = 0;
      player.y = playerGroundY();
      if (!Number.isFinite(player.y)) {
        player.y = CONFIG.groundY - playerHeight();
      }
      SideRunner.player.resetBlink();
    },

    resetBlink() {
      blinkTimer = 0;
      blinkActive = false;
      nextBlinkIn =
        CONFIG.blinkMinInterval +
        Math.random() * (CONFIG.blinkMaxInterval - CONFIG.blinkMinInterval);
    },

    updateBlink(dt) {
      if (!player.onGround || player.ducking) {
        blinkActive = false;
        return;
      }
      if (blinkActive) {
        blinkTimer -= dt;
        if (blinkTimer <= 0) {
          blinkActive = false;
          nextBlinkIn =
            CONFIG.blinkMinInterval +
            Math.random() * (CONFIG.blinkMaxInterval - CONFIG.blinkMinInterval);
        }
        return;
      }
      nextBlinkIn -= dt;
      if (nextBlinkIn <= 0) {
        blinkActive = true;
        blinkTimer = CONFIG.blinkDuration;
      }
    },

    isBlinking() {
      return blinkActive;
    },

    tryJump() {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;

      if (canJumpNow()) {
        const isDouble = !player.onGround && coyoteTimeLeft <= 0;
        if (isDouble) doubleJumpUsed = true;
        performJump(isDouble);
        return;
      }

      if (!player.ducking) {
        SideRunner.input.jumpBufferTime = CONFIG.jumpBufferDuration;
      }
    },

    tryDash() {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;
      if (dashCooldownLeft > 0 || dashTimer > 0 || player.ducking) return;

      if (g.incrementDash) g.incrementDash();
      dashTimer = CONFIG.dashDuration;
      dashCooldownLeft = CONFIG.dashCooldown;
      dashOffsetX = CONFIG.dashLungePx;
      SideRunner.effects.spawnDashTrail(getDrawX(), player.y, CONFIG.standWidth);
      SideRunner.effects.triggerDashFlash();
      if (SideRunner.audio && SideRunner.audio.playDash) {
        SideRunner.audio.playDash();
      }
    },

    updatePlayer(dt) {
      const g = SideRunner.game;
      if (g.state !== State.PLAYING) return;

      if (!Number.isFinite(player.y)) {
        player.y = playerGroundY();
        if (!Number.isFinite(player.y)) {
          player.y = CONFIG.groundY - playerHeight();
        }
        player.vy = 0;
        player.onGround = true;
        clearLedgeFall();
      }

      if (dashCooldownLeft > 0) dashCooldownLeft -= dt;
      if (dashTimer > 0) {
        dashTimer -= dt;
        const t = dashTimer / CONFIG.dashDuration;
        dashOffsetX = CONFIG.dashLungePx * Math.max(0, t);
      } else if (dashOffsetX > 0) {
        dashOffsetX = Math.max(0, dashOffsetX - dt * 80);
      }
      if (invulnTimer > 0) invulnTimer -= dt;
      if (magicAuraTimer > 0) magicAuraTimer -= dt;

      const input = SideRunner.input;
      player.wasOnGround = player.onGround;

      if (player.onGround) {
        player.ducking = input.duckHeld && dashTimer <= 0;
        const surface = surfaceTopForFeet();
        if (surface == null) {
          const plat = SideRunner.platforms
            ? SideRunner.platforms.getPlatformAt(feetX())
            : null;
          if (plat && plat.type === "PIT") {
            startPitFall();
          } else {
            startLedgeFall();
          }
        } else {
          // 脚下有实心台面时直接贴合，勿用 targetTop 差值判「踩空」：
          // 高台 → 平地时 targetTop 会变大，旧逻辑会误判为滑落并令角色持续下落（猫消失）。
          const targetTop = surface - playerHeight();
          player.y = targetTop;
          doubleJumpUsed = false;
        }
      } else {
        player.ducking = false;
        updateLedgeFallArc(dt);
        coyoteTimeLeft = SideRunner.physics.stepCoyoteTime(
          coyoteTimeLeft,
          { wasOnGround: player.wasOnGround, onGround: player.onGround },
          dt,
          CONFIG.coyoteTimeDuration
        );
      }

      input.jumpBufferTime = SideRunner.physics.stepJumpBuffer(input.jumpBufferTime, dt);

      const bufferedJump = SideRunner.physics.resolveBufferedJump({
        canJump: canJumpNow(),
        jumpBufferTime: input.jumpBufferTime,
        onGround: player.onGround,
        coyoteTimeLeft,
      });
      if (bufferedJump) {
        if (bufferedJump.isDouble) doubleJumpUsed = true;
        performJump(bufferedJump.isDouble);
      }

      if (!player.onGround) {
        const gravMult = player.vy > 0 ? CONFIG.fallGravityMult : 1;
        player.vy += CONFIG.gravity * gravMult * dt;
        if (player.vy > CONFIG.maxFallSpeed) player.vy = CONFIG.maxFallSpeed;
        player.y += player.vy * dt;

        if (tryLandOnSurface()) {
          if (input.jumpBufferTime > 0 && !input.duckHeld) {
            performJump(false);
          }
        } else if (player.y > CONFIG.fallDeathY) {
          triggerFallDeath();
          return;
        }
      } else {
        player.runPhase += dt * 11;
        coyoteTimeLeft = SideRunner.physics.resetCoyoteOnGround();
        SideRunner.player.updateBlink(dt);
      }
    },
  };
})(window);
