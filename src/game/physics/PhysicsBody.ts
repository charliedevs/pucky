export interface PhysicsParams {
  /** Max velocity (horizontal)
   * @default 3
   */
  maxSpeedX?: number;
  /** Gravity applied to body
   * @default 0.5
   */
  gravity?: number;
}

/**
 * A physics object that can accelerate and respects gravity.
 *
 * @example
 * const physics = new PhysicsBody({ maxSpeedX: 4, g: 0.5 });
 *
 * @param maxSpeedX Maximum velocity in X
 * @param g   Gravity acceleration
 */
export class PhysicsBody {
  /** Parameters that control motion behavior */
  private static readonly TUNING = {
    /** Max horizontal speed */
    maxSpeedX: 3,

    /** Gravity multiplier when going up */
    gravityUpMultiplier: 0.6,

    /** Ground acceleration easing factor */
    easeGround: 0.135,

    /** Ease factor when switching directions */
    easeTurnMultiplier: 0.25,

    /** Air control multiplier (how much horizontal influence midair) */
    easeAir: 0.3,

    /** Max fraction of speedX allowed while airborne */
    airSpeedFactor: 0.9,

    /** Variable jump height */
    shortHop: {
      enabled: true,
      earlyReleaseGravityMult: 2,
    },
  } as const;

  /** Current velocity (vx, vy) */
  public vel = { x: 0, y: 0 };
  /** Whether the object is touching the ground */
  public isOnGround = false;

  /** Whether the object was grounded in the prev frame */
  private wasOnGround = false;
  /** Input direction (-1, 0, 1) */
  private inputX: -1 | 0 | 1 = 0;
  /** Track if jump button is held down */
  private jumpHeld = false;
  /** Max velocity (horizontal) */
  private maxSpeedX: number;
  /** Gravity applied to body when falling */
  private g: number;

  constructor(params: PhysicsParams = {}) {
    this.maxSpeedX = params.maxSpeedX ?? 3;
    this.g = params.gravity ?? 0.5;
  }
  /**
   * Update velocity based on input and gravity
   */
  public update(dt: number) {
    const t = PhysicsBody.TUNING;

    // 1. Determine top speed (different in air)
    const maxSpeedX = this.isOnGround
      ? this.maxSpeedX
      : t.maxSpeedX * t.airSpeedFactor;

    // 2. Calculate target horizontal velocity
    const targetVx = this.inputX * maxSpeedX;

    // 3. Choose easing factor
    let easeFactor = this.isOnGround ? t.easeGround : t.easeAir;
    if (this.inputX !== 0 && Math.sign(this.inputX) !== Math.sign(this.vel.x)) {
      // If switching directions, apply harsher easing
      easeFactor *= t.easeTurnMultiplier;
    }

    // 4. Handle "snap to ground" case to prevent slow ramp-up on landing
    const justLanded = !this.wasOnGround && this.isOnGround;
    this.wasOnGround = this.isOnGround;
    const snapToGroundSpeed =
      justLanded &&
      Math.abs(this.vel.x) > t.maxSpeedX * t.airSpeedFactor &&
      Math.abs(this.vel.x - targetVx) < 1;

    // 5. Apply velocity
    this.vel.x = snapToGroundSpeed
      ? this.inputX * this.maxSpeedX
      : this.dampen(this.vel.x, targetVx, easeFactor);

    // 6. Apply gravity (different if rising or falling)
    let gravityFactor = this.g;
    if (this.vel.y < 0) {
      if (!this.jumpHeld && t.shortHop.enabled) {
        gravityFactor *=
          t.gravityUpMultiplier * t.shortHop.earlyReleaseGravityMult;
      } else {
        gravityFactor *= t.gravityUpMultiplier;
      }
    }
    this.vel.y += gravityFactor * dt;
  }

  /**
   * Set the input direction (-1, 0, 1)
   */
  public setInputX(dir: -1 | 0 | 1) {
    this.inputX = dir;
  }

  /**
   * Apply a vertical force if grounded
   * @param fy vertical force (usually negative to jump)
   */
  public jump(fy: number) {
    if (this.isOnGround) {
      this.vel.y = fy;
      this.isOnGround = false;
    }
  }

  /** Keep track of whether jump button is held down */
  public setJumpHeld(held: boolean) {
    this.jumpHeld = held;
  }

  /**
   * Calculate next position based on current position, delta time, and velocity of current body.
   * @returns newPos `{x: number, y: number}`
   */
  public getNextPosition(pos: { x: number; y: number }, dt: number) {
    const newPos = {
      x: pos.x + this.vel.x * dt,
      y: pos.y + this.vel.y * dt,
    };
    return newPos;
  }

  /**
   * Clamp the object to ground and zero vertical velocity
   */
  public checkGround(groundY: number, currentY: number): number {
    if (currentY >= groundY) {
      this.vel.y = 0;
      this.isOnGround = true;
      return groundY;
    }
    return currentY;
  }

  private dampen(current: number, target: number, factor: number): number {
    const delta = target - current;
    return current + delta * factor;
  }
}
