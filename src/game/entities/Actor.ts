import { Container } from 'pixi.js';
import { debugConfig } from '../debug/DebugConfig';
import { HitboxDebugOverlay } from '../debug/HitboxOverlay';

interface SolidBox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Tuning params for game feel */
export interface ActorTuning {
  /** Hitbox for collisions with solids - `{offsetX, offsetY, width, height}` */
  solidBox: SolidBox;

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
  solidBox: {
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

export type CollisionCheckFn = (x: number, y: number, width: number, height: number) => boolean;

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
  /** How much the actor moves each tick */
  protected static readonly STEP_RESOLUTION = 1;

  /** Current velocity */
  public vel = { x: 0, y: 0 };
  /** Actor is touching ground */
  public isOnGround = false;
  /** Optional callback when colliding with hazard */
  public onHazardTouched: (() => void) | null = null;
  /** Collision checker set by owner of the Actor */
  protected checkCollisionFn: CollisionCheckFn = () => false;
  /** Desired input direction (-1 = left, 1 = right) */
  protected inputX: -1 | 0 | 1 = 0;
  /** Tuning params for game feel */
  protected tuning: ActorTuning;

  /** Whether the actor was on the ground in the prev frame */
  private wasOnGround = false;

  private debugOverlay?: HitboxDebugOverlay;

  constructor(tuning: Partial<ActorTuning> = {}, debug = { hitboxLabel: 'actor' }) {
    super();
    this.tuning = {
      ...TUNING_DEFAULTS,
      ...tuning,
      shortHop: {
        ...TUNING_DEFAULTS.shortHop,
        ...tuning.shortHop,
      },
      solidBox: {
        ...TUNING_DEFAULTS.solidBox,
        ...tuning.solidBox,
      },
    };

    // DEBUG
    const { width, height } = this.tuning.solidBox;
    this.debugOverlay = new HitboxDebugOverlay(width, height, debug.hitboxLabel);
    this.addChild(this.debugOverlay);
  }

  /** Update velocity based on desired input. Called every frame by scene
   * @returns `justLanded`: boolean that determines if actor just landed on ground
   */
  public updateMovementPhysics(dt: number) {
    const t = this.tuning;

    // 1. Determine top speed (different in air)
    const maxSpeedX = this.isOnGround ? t.maxSpeedX : t.maxSpeedX * t.airSpeedFactor;

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
      if (!this.isJumpHeld() && t.shortHop.enabled) {
        gravityFactor *= t.gravityUpMultiplier * t.shortHop.earlyReleaseGravityMultiplier;
      } else {
        gravityFactor *= t.gravityUpMultiplier;
        // Halved gravity at the jump peak
        if (Math.abs(this.vel.y) < 0.8) {
          gravityFactor *= 0.5;
        }
      }
    }
    this.vel.y += gravityFactor * dt;

    // DEBUG
    if (this.debugOverlay && debugConfig.getShowHitboxes()) {
      const box = this.getSolidBox();
      this.debugOverlay.updateBox(box.x - this.x, box.y - this.y, box.width, box.height);
      this.debugOverlay.setVisible(true);
    } else {
      this.debugOverlay?.setVisible(false);
    }

    return { justLanded };
  }

  public resetState() {
    this.vel.x = 0;
    this.vel.y = 0;
    this.inputX = 0;
    this.isOnGround = false;
  }

  /** Provide a callback to determine collision with other objects
   * @param fn Function takes x, y, width, height, and returns a boolean
   */
  public setCollisionChecker(fn: CollisionCheckFn) {
    this.checkCollisionFn = fn;
  }

  /** Provide a callback to handle collision with hazard */
  public setHazardCallback(cb: () => void) {
    this.onHazardTouched = cb;
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
    this.vel.y = forceY;
    this.isOnGround = false;
  }

  /** For player, determine if jump button is held */
  protected isJumpHeld(): boolean {
    return false; // default fallback for non-player actors
  }

  /** Move horizontally, accounting for collision */
  protected moveX(dt: number) {
    const moveAmount = this.vel.x * dt;
    this._move('x', moveAmount);
  }

  /** Move vertically, accounting for collision */
  protected moveY(dt: number) {
    const moveAmount = this.vel.y * dt;
    const sign = Math.sign(moveAmount);
    this.isOnGround = false; // reset each frame and then check to set again

    const yBefore = this.y;
    const vyBefore = this.vel.y;
    const hit = this._move('y', moveAmount);

    if (hit && sign > 0) {
      this.isOnGround = true;
    } else if (hit && sign < 0) {
      this.tryCornerWiggle(yBefore, vyBefore);
    }
  }

  /** Move actor along specified axis, accounting for collisions
   * @returns true if collision
   */
  private _move(axis: 'x' | 'y', amount: number): boolean {
    const stepSize = Actor.STEP_RESOLUTION;
    const sign = Math.sign(amount);
    let remaining = Math.abs(amount);

    while (remaining > 0) {
      const step = Math.min(stepSize, remaining);
      const next = axis === 'x' ? this.x + step * sign : this.y + step * sign;
      const bounds = axis === 'x' ? this.getSolidBox(next, this.y) : this.getSolidBox(this.x, next);
      if (this.checkCollisionFn(bounds.x, bounds.y, bounds.width, bounds.height)) {
        if (axis === 'x') this.vel.x = 0;
        if (axis === 'y') this.vel.y = 0;
        return true;
      }

      if (axis === 'x') this.x = next;
      if (axis === 'y') this.y = next;

      remaining -= step;
    }
    return false;
  }

  /** Get collision hitbox  */
  protected getSolidBox(x: number | undefined = undefined, y: number | undefined = undefined) {
    const startX = x !== undefined ? x : this.x;
    const startY = y !== undefined ? y : this.y;
    const hitbox = this.tuning.solidBox;
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

  /** If player hits corner of platform above, try wiggling around */
  private tryCornerWiggle(yBefore: number, vyBefore: number) {
    if (vyBefore >= 0) return;

    const { offsetX, width, offsetY, height } = this.tuning.solidBox;
    const wiggleDistance = 20;
    const probeSize = 2;

    const playerTop = yBefore + offsetY;
    const playerLeft = this.x + offsetX;
    const playerRight = playerLeft + width;

    const leftBlocked = this.checkCollisionFn(playerLeft, playerTop - 1, probeSize, probeSize);
    const rightBlocked = this.checkCollisionFn(
      playerRight - probeSize,
      playerTop - 1,
      probeSize,
      probeSize
    );

    const canWiggle = (dir: -1 | 1): boolean => {
      const dx = dir * wiggleDistance;
      const testX = this.x + dx;
      const testBoxX = testX + offsetX;
      const testBoxY = playerTop;

      const bodyClear = !this.checkCollisionFn(testBoxX, testBoxY, width, height);
      const aboveClear = !this.checkCollisionFn(testBoxX, testBoxY - 2, width, 2);
      return bodyClear && aboveClear;
    };

    if (leftBlocked && !rightBlocked && canWiggle(1)) {
      this.x += wiggleDistance;
      this.vel.y = Math.min(vyBefore, -1);
      console.log('wiggle right!');
    } else if (rightBlocked && !leftBlocked && canWiggle(-1)) {
      this.x -= wiggleDistance;
      this.vel.y = Math.min(vyBefore, -1);
      console.log('wiggle left!');
    }
  }
}
