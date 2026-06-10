import { describe, expect, it } from "vitest";

const physics = globalThis.SideRunner.physics;

describe("rectsOverlap", () => {
  it("returns true when rectangles overlap", () => {
    expect(physics.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(
      true
    );
  });

  it("returns false when separated on x axis", () => {
    expect(physics.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 10, h: 10 })).toBe(
      false
    );
  });

  it("returns false when separated on y axis", () => {
    expect(physics.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 11, w: 10, h: 10 })).toBe(
      false
    );
  });

  it("returns false when only edge-touching (no area overlap)", () => {
    expect(physics.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(
      false
    );
  });

  it("returns true when one rect is inside another", () => {
    expect(physics.rectsOverlap({ x: 0, y: 0, w: 20, h: 20 }, { x: 5, y: 5, w: 5, h: 5 })).toBe(
      true
    );
  });
});

describe("insetHitbox", () => {
  it("shrinks hitbox by inset on all sides", () => {
    expect(physics.insetHitbox({ x: 10, y: 20, w: 30, h: 40 }, 2)).toEqual({
      x: 12,
      y: 22,
      w: 26,
      h: 36,
    });
  });
});

describe("stepCoyoteTime", () => {
  const duration = 0.08;

  it("grants coyote window when leaving ground", () => {
    const next = physics.stepCoyoteTime(
      0,
      { wasOnGround: true, onGround: false },
      0,
      duration
    );
    expect(next).toBe(duration);
  });

  it("decays coyote time while airborne", () => {
    const next = physics.stepCoyoteTime(
      0.08,
      { wasOnGround: false, onGround: false },
      0.03,
      duration
    );
    expect(next).toBeCloseTo(0.05);
  });

  it("does not tick while on ground (reset handled separately)", () => {
    const next = physics.stepCoyoteTime(
      0.04,
      { wasOnGround: true, onGround: true },
      0.016,
      duration
    );
    expect(next).toBe(0.04);
  });

  it("expires coyote time after duration elapses", () => {
    let coyote = physics.stepCoyoteTime(
      0,
      { wasOnGround: true, onGround: false },
      0,
      duration
    );
    coyote = physics.stepCoyoteTime(
      coyote,
      { wasOnGround: false, onGround: false },
      0.05,
      duration
    );
    expect(coyote).toBeCloseTo(0.03);
    coyote = physics.stepCoyoteTime(
      coyote,
      { wasOnGround: false, onGround: false },
      0.03,
      duration
    );
    expect(coyote).toBe(0);
  });
});

describe("stepJumpBuffer", () => {
  it("decays buffer timer", () => {
    expect(physics.stepJumpBuffer(0.12, 0.05)).toBeCloseTo(0.07);
  });

  it("clamps to zero", () => {
    expect(physics.stepJumpBuffer(0.03, 0.05)).toBe(0);
  });

  it("stays zero when already expired", () => {
    expect(physics.stepJumpBuffer(0, 0.016)).toBe(0);
  });
});

describe("canJumpNow", () => {
  const base = {
    playing: true,
    ducking: false,
    dashTimer: 0,
    onGround: true,
    coyoteTimeLeft: 0,
    doubleJumpUsed: false,
  };

  it("allows jump on ground", () => {
    expect(physics.canJumpNow(base)).toBe(true);
  });

  it("allows jump during coyote time", () => {
    expect(
      physics.canJumpNow({ ...base, onGround: false, coyoteTimeLeft: 0.04 })
    ).toBe(true);
  });

  it("allows double jump once while airborne", () => {
    expect(
      physics.canJumpNow({
        ...base,
        onGround: false,
        coyoteTimeLeft: 0,
        doubleJumpUsed: false,
      })
    ).toBe(true);
  });

  it("blocks third jump in air", () => {
    expect(
      physics.canJumpNow({
        ...base,
        onGround: false,
        coyoteTimeLeft: 0,
        doubleJumpUsed: true,
      })
    ).toBe(false);
  });

  it("blocks jump while ducking", () => {
    expect(physics.canJumpNow({ ...base, ducking: true })).toBe(false);
  });

  it("blocks jump during dash", () => {
    expect(physics.canJumpNow({ ...base, dashTimer: 0.1 })).toBe(false);
  });

  it("blocks jump when not playing", () => {
    expect(physics.canJumpNow({ ...base, playing: false })).toBe(false);
  });
});

describe("resolveBufferedJump", () => {
  it("returns null when buffer expired", () => {
    expect(
      physics.resolveBufferedJump({
        canJump: true,
        jumpBufferTime: 0,
        onGround: true,
        coyoteTimeLeft: 0,
      })
    ).toBeNull();
  });

  it("returns null when cannot jump", () => {
    expect(
      physics.resolveBufferedJump({
        canJump: false,
        jumpBufferTime: 0.08,
        onGround: false,
        coyoteTimeLeft: 0,
        doubleJumpUsed: true,
      })
    ).toBeNull();
  });

  it("resolves ground jump from buffer", () => {
    expect(
      physics.resolveBufferedJump({
        canJump: true,
        jumpBufferTime: 0.05,
        onGround: true,
        coyoteTimeLeft: 0,
      })
    ).toEqual({ isDouble: false });
  });

  it("resolves coyote jump as single jump", () => {
    expect(
      physics.resolveBufferedJump({
        canJump: true,
        jumpBufferTime: 0.05,
        onGround: false,
        coyoteTimeLeft: 0.04,
      })
    ).toEqual({ isDouble: false });
  });

  it("resolves air jump as double jump after coyote expires", () => {
    expect(
      physics.resolveBufferedJump({
        canJump: true,
        jumpBufferTime: 0.05,
        onGround: false,
        coyoteTimeLeft: 0,
      })
    ).toEqual({ isDouble: true });
  });
});
