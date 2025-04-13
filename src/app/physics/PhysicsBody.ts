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
  private maxSpeedX: number;
  private g: number;

  constructor(params: PhysicsParams = {}) {
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
    let easeFactor = this.isOnGround ? 0.3 : 0.05;

    // If switching directions, apply harsher easing
    if (Math.sign(this.inputX) !== Math.sign(this.vel.x) && this.inputX !== 0) {
      easeFactor *= 0.5;
    }

    this.vel.x = this.easeOutQuad(this.vel.x, targetVx, easeFactor);

    // Gravity
    if (this.vel.y < 0) {
      // Going up: apply less gravity
      this.vel.y += this.g * 0.6 * dt;
    } else {
      this.vel.y += this.g * dt;
    }
    if (!this.isOnGround && this.inputX !== 0) {
      const airControlFactor = 0.03;
      const airTarget = this.inputX * this.maxSpeedX * 0.7;
      this.vel.x = this.easeOutQuad(this.vel.x, airTarget, airControlFactor);
    }
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

  private easeOutQuad(current: number, target: number, factor: number): number {
    const delta = target - current;
    return current + delta * factor;
  }
}
