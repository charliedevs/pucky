import { Container } from 'pixi.js';

interface CollisionHitbox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Tuning params for game feel */
export interface ActorTuning {
  /** Hitbox for collisions - `{offsetX, offsetY, width, height}` */
  collisionHitbox: CollisionHitbox;

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
  collisionHitbox: {
    offsetX: -16,
    offsetY: -64,
    width: 32,
    height: 56,
  },
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

export type CollisionCheckFn = (
  x: number,
  y: number,
  width: number,
  height: number
) => boolean;

/**
 * A base class for moving entities that are affected by gravity and physics-like movement.
 *
 * Used for player characters, NPCs, enemies, or anything that moves and responds to solid collisions.
 * This class provides horizontal acceleration, gravity, jump behavior (with optional short-hop),
 * and movement smoothing with tunable parameters.
 *
 * Extend this class to create specific behavior (like player control or AI logic).
 *
 * @example
 * class Player extends Actor {
 *   update(dt: number) {
 *     this.updateActor(dt);
 *     this.x += this.vel.x * dt;
 *     this.y += this.vel.y * dt;
 *   }
 * }
 */
export abstract class Actor extends Container {
  /** Current velocity */
  public vel = { x: 0, y: 0 };
  /** Actor is touching ground */
  public isOnGround = false;
  /** Collision checker set by owner of the Actor */
  protected checkCollisionFn: CollisionCheckFn = () => false;
  /** Desired input direction (-1 = left, 1 = right) */
  protected inputX: -1 | 0 | 1 = 0;
  /** Tuning params for game feel */
  protected tuning: ActorTuning;

  /** Whether the actor was on the ground in the prev frame */
  private wasOnGround = false;
  /** Track if jump button is held down */
  private jumpHeld = false;

  constructor(tuning: Partial<ActorTuning> = {}) {
    super();
    this.tuning = {
      ...TUNING_DEFAULTS,
      ...tuning,
      shortHop: {
        ...TUNING_DEFAULTS.shortHop,
        ...tuning.shortHop,
      },
      collisionHitbox: {
        ...TUNING_DEFAULTS.collisionHitbox,
        ...tuning.collisionHitbox,
      },
    };

    // Add red debug rectangle to visualize collision hitbox
    // const debugBox = new Graphics()
    //   .rect(
    //     this.tuning.collisionHitbox.offsetX,
    //     this.tuning.collisionHitbox.offsetY,
    //     this.tuning.collisionHitbox.width,
    //     this.tuning.collisionHitbox.height
    //   )
    //   .stroke({ color: 0xff0000, width: 1 });

    // this.addChild(debugBox);
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

  /** Provide a callback to determine collision with other objects
   * @param fn Function takes x, y, width, height, and returns a boolean
   */
  public setCollisionChecker(fn: CollisionCheckFn) {
    this.checkCollisionFn = fn;
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

  /** Move horizontally, accounting for collision */
  protected moveX(dt: number) {
    const moveAmount = this.vel.x * dt;
    const sign = Math.sign(moveAmount);
    let remaining = Math.abs(moveAmount);

    while (remaining > 0) {
      const step = Math.min(1, remaining);
      const nextX = this.x + step * sign;
      const bounds = this.getCollisionHitbox(nextX, this.y);
      if (
        this.checkCollisionFn(bounds.x, bounds.y, bounds.width, bounds.height)
      ) {
        this.vel.x = 0;
        break;
      }
      this.x = nextX;
      remaining -= step;
    }
  }

  /** Move vertically, accounting for collision */
  protected moveY(dt: number) {
    const moveAmount = this.vel.y * dt;
    const sign = Math.sign(moveAmount);
    let remaining = Math.abs(moveAmount);

    // Reset grounded status each frame before checking
    this.isOnGround = false;

    while (remaining > 0) {
      const step = Math.min(1, remaining);
      const nextY = this.y + step * sign;
      const bounds = this.getCollisionHitbox(this.x, nextY);
      if (
        this.checkCollisionFn(bounds.x, bounds.y, bounds.width, bounds.height)
      ) {
        if (sign > 0) this.isOnGround = true;
        this.vel.y = 0;
        break;
      }
      this.y = nextY;
      remaining -= step;
    }
  }

  /** Get collision hitbox  */
  protected getCollisionHitbox(
    x: number | undefined = undefined,
    y: number | undefined = undefined
  ) {
    const startX = x !== undefined ? x : this.x;
    const startY = y !== undefined ? y : this.y;
    const hitbox = this.tuning.collisionHitbox;
    return {
      x: startX + hitbox.offsetX,
      y: startY + hitbox.offsetY,
      width: hitbox.width,
      height: hitbox.height,
    } as const;
  }

  private dampen(current: number, target: number, factor: number): number {
    const delta = target - current;
    return current + delta * factor;
  }
}
