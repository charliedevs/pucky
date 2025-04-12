/**
 * Lightweight physics body for platformer-style motion.
 * Handles acceleration, deceleration, gravity, and jump force.
 *
 * @example
 * const body = new PhysicsBody({ ax: 0.2, g: 0.5 });
 *
 * @param accelX  Acceleration in the X direction (default: 0.2)
 * @param decelX  Deceleration in the X direction (default: 0.3)
 * @param maxSpeedX Maximum velocity in X (default: 2.5)
 * @param g   Gravity acceleration (default: 0.5)
 */
export interface PhysicsParams {
  /** Acceleration (horizontal)
   * @default 0.2
   */
  accelX?: number;
  /** Deceleration (horizontal)
   * @default 0.3
   */
  decelX?: number;
  /** Max velocity (horizontal)
   * @default 2.5
   */
  maxSpeedX?: number;
  /** Gravity applied to body
   * @default 0.5
   */
  g?: number;
}

export class PhysicsBody {
  /** Current velocity (vx, vy) */
  public vel = { x: 0, y: 0 };

  /** Whether the object is touching the ground */
  public isOnGround = false;

  /** Input direction (-1, 0, 1) */
  private inputX: -1 | 0 | 1 = 0;

  /** Parameters of motion */
  private accelX: number;
  private decelX: number;
  private maxSpeedX: number;
  private g: number;

  constructor(params: PhysicsParams = {}) {
    this.accelX = params.accelX ?? 0.4;
    this.decelX = params.decelX ?? 0.2;
    this.maxSpeedX = params.maxSpeedX ?? 2.5;
    this.g = params.g ?? 0.5;
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

  /**
   * Update velocity based on input and gravity
   */
  public update(dt: number) {
    // Horizontal acceleration
    const targetVx = this.inputX * this.maxSpeedX;
    const accel = targetVx === 0 ? this.decelX : this.accelX;
    this.vel.x = this.approach(this.vel.x, targetVx, accel * dt);

    // Vertical gravity
    this.vel.y += this.g * dt;
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

  private approach(current: number, target: number, delta: number): number {
    if (current < target) return Math.min(current + delta, target);
    if (current > target) return Math.max(current - delta, target);
    return target;
  }
}
