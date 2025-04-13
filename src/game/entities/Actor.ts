import { Container } from 'pixi.js';

/** Tuning params for game feel */
export interface ActorTuning {
  /** Max horizontal speed */
  maxSpeedX: number;

  /** Force applied downward when in air */
  gravity: number;

  /** Gravity multiplier when jumping (<1 for slower ascent) */
  gravityUpMultiplier: number;

  /** Ease factor for acceleration on ground */
  easeGround: number;

  /** Ease factor when switching directions */
  easeTurnMultiplier: number;

  /** Air control multiplier (how much horizontal influence midair) */
  easeAir: number;

  /** Max fraction of speedX allowed while airborne */
  airSpeedFactor: number;

  /** Variable jump height */
  shortHop: {
    /** Whether variant jump height is enabled */
    enabled: boolean;
    /** Multiplier for gravity for short hops */
    earlyReleaseGravityMultiplier: number;
  };
}

const TUNING_DEFAULTS = {
  maxSpeedX: 3,
  gravity: 0.5,
  gravityUpMultiplier: 0.6,
  easeGround: 0.135,
  easeTurnMultiplier: 0.25,
  easeAir: 0.3,
  airSpeedFactor: 0.9,
  shortHop: {
    enabled: true,
    earlyReleaseGravityMultiplier: 2,
  },
} as const;

export abstract class Actor extends Container {
  /** Current velocity */
  public vel = { x: 0, y: 0 };
  /** Actor is touching ground */
  public isOnGround = false;

  /** Desired input direction (-1 = left, 1 = right) */
  protected inputX: -1 | 0 | 1 = 0;
  /** Tuning params for game feel */
  protected tuning: ActorTuning;

  /** Whether the actor was on the ground in the prev frame */
  private wasOnGround = false;
  /** Track if jump button is held down */
  private jumpHeld = false;

  constructor(tuning: ActorTuning = TUNING_DEFAULTS) {
    super();
    this.tuning = tuning;
  }

  /** Update velocity based on desired input. Called every frame by scene */
  public updateActor(dt: number) {
    const t = this.tuning;

    // 1. Determine top speed (different in air)
    const maxSpeedX = this.isOnGround
      ? t.maxSpeedX
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
      ? this.inputX * t.maxSpeedX
      : this.dampen(this.vel.x, targetVx, easeFactor);

    // 6. Apply gravity (different if rising or falling)
    let gravityFactor = t.gravity;
    if (this.vel.y < 0) {
      if (!this.jumpHeld && t.shortHop.enabled) {
        gravityFactor *=
          t.gravityUpMultiplier * t.shortHop.earlyReleaseGravityMultiplier;
      } else {
        gravityFactor *= t.gravityUpMultiplier;
      }
    }
    this.vel.y += gravityFactor * dt;
  }

  /** Set desired horizontal movement (-1 = left, 1 = right) */
  public setInputX(dir: -1 | 0 | 1) {
    this.inputX = dir;
  }

  /**
   * Apply a vertical force if grounded
   * @param forceY vertical force (usually negative to jump)
   */
  public applyJump(forceY: number) {
    if (this.isOnGround) {
      this.vel.y = forceY;
      this.isOnGround = false;
    }
  }

  /** Keep track of whether jump button is held down */
  public setJumpHeld(held: boolean) {
    this.jumpHeld = held;
  }

  private dampen(current: number, target: number, factor: number): number {
    const delta = target - current;
    return current + delta * factor;
  }
}
