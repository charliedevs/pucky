import { Actions, Interpolations } from 'pixi-actions';
import { AnimatedSprite, Spritesheet, Texture } from 'pixi.js';
import { type KeyboardInput } from '../input/KeyboardInput';
import { Actor } from './Actor';

/** Spritesheet definition for the player character */
const heroSheet = {
  frames: {
    idle: {
      frame: { x: 4, y: 2, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    walk: {
      frame: { x: 68, y: 2, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    jump: {
      frame: { x: 132, y: 2, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    fall: {
      frame: { x: 196, y: 2, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
  },
  meta: {
    image: 'hero-spritesheet.png',
    format: 'RGBA8888',
    size: { w: 260, h: 68 },
    scale: 1,
  },
  animations: {
    idle: ['idle'],
    walk: ['walk', 'idle'],
    jump: ['jump'],
    fall: ['fall'],
    skid: ['walk'],
  },
};

enum PlayerAnimationState {
  Idle,
  Walk,
  Skid,
  Jump,
  Fall,
}

enum Direction {
  Left = -1,
  None = 0,
  Right = 1,
}

export class Player extends Actor {
  /** Parameters to adjust game feel. */
  private static readonly TUNING = {
    /** How strong the jump is */
    jumpForce: 10,

    /** Minimum vx to consider 'moving' */
    moveThreshold: 0.8,

    /** How long to pause animation when walk starts */
    walkPause: 50,

    /** Speed of walking loop */
    walkAnimSpeed: 0.08,

    /** Visual squash/stretch for jumping */
    jumpVisuals: {
      squashScale: { x: 1.15, y: 0.6 },
      stretchScale: { x: 0.75, y: 1.25 },
      preJumpSquashDurationMs: 30,
      stretchDurationMs: 60,
      landingSquashDurationMs: 60,
    },

    /** Time where you're allowed to jump again before hitting ground */
    jumpBufferMs: 10500,

    /** Time you can still jump after walking off ledge */
    coyoteTimeMs: 5000,

    /** Time to pause on closed-feet before going idle */
    idleSnapDelay: 80,

    /** Skidding */
    turnAnticipation: {
      threshold: 2, // If speed is over this, apply skid delay on turn
      delayMs: 80, // How long to delay turn animation
    },
  } as const;

  private facingDir: Direction = Direction.Right;
  private isSkidding = false;
  private jumpHeld = false;
  private jumpState = {
    isSquashing: false,
    playedLandingSquash: false,
    buffer: 0,
    timeSinceGrounded: Infinity,
    lastFallSpeed: 0,
  };

  private idleAnimation: AnimatedSprite;
  private walkAnimation: AnimatedSprite;
  private skidAnimation: AnimatedSprite;
  private jumpAnimation: AnimatedSprite;
  private fallAnimation: AnimatedSprite;
  private currentAnimation: AnimatedSprite;
  private animState: PlayerAnimationState = PlayerAnimationState.Idle;

  constructor(animations: Spritesheet['animations']) {
    super(
      {
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
      },
      { hitboxLabel: 'player' }
    );

    this.idleAnimation = new AnimatedSprite(animations.idle);
    this.walkAnimation = new AnimatedSprite(animations.walk);
    this.skidAnimation = new AnimatedSprite(animations.skid);
    this.jumpAnimation = new AnimatedSprite(animations.jump);
    this.fallAnimation = new AnimatedSprite(animations.fall);

    this.setupAnim(this.idleAnimation);
    this.setupAnim(this.walkAnimation, 0.08);
    this.setupAnim(this.skidAnimation);
    this.setupAnim(this.jumpAnimation);
    this.setupAnim(this.fallAnimation);

    this.currentAnimation = this.idleAnimation;
    this.currentAnimation.play();
    this.addChild(this.currentAnimation);

    this.position.set(200, 200);
  }

  public update(dt: number, keyboard: KeyboardInput) {
    this.jumpHeld = keyboard.isHeld('Space');

    // Track last fall speed
    if (this.vel.y > 0) this.jumpState.lastFallSpeed = this.vel.y;

    const updates = this.updateMovementPhysics(dt);
    this.moveX(dt);
    this.moveY(dt);

    this.updateJumpTimers(dt);
    this.tryStartJump();

    // Apply landing squash if landing and not jumping again
    if (
      updates.justLanded &&
      !this.jumpState.isSquashing &&
      !this.jumpState.playedLandingSquash
    ) {
      const impact = this.getLandingImpact();
      if (impact > 0.1) {
        this.jumpState.playedLandingSquash = true;
        this.applyLandingSquash(impact);
      }
    }

    if (!this.isOnGround) this.jumpState.playedLandingSquash = false;

    // Update sprite animations
    this.updateSpriteDirection();
    this.updateAnimationStateFromPhysics();
    this.applyAnimationForState();
  }

  public override resetState(): void {
    super.resetState();
    this.jumpHeld = false;
    this.jumpState = {
      isSquashing: false,
      playedLandingSquash: false,
      buffer: 0,
      timeSinceGrounded: Infinity,
      lastFallSpeed: 0,
    };
  }

  public moveLeft() {
    this.move(Direction.Left);
  }

  public moveRight() {
    this.move(Direction.Right);
  }

  public stop() {
    this.move(Direction.None);
  }

  public jump() {
    this.jumpState.buffer = Player.TUNING.jumpBufferMs;
  }

  /** Load the spritesheet animations to be passed into the constructor */
  public static async loadSpritesheet() {
    const sheet = new Spritesheet(
      Texture.from(heroSheet.meta.image),
      heroSheet
    );
    await sheet.parse();
    return sheet;
  }

  protected override isJumpHeld(): boolean {
    return this.jumpHeld;
  }

  private updateAnimationStateFromPhysics() {
    if (this.isSkidding) {
      this.setAnimationState(PlayerAnimationState.Skid);
      return;
    }

    const { x: vx, y: vy } = this.vel;
    const isWalking = Math.abs(vx) > Player.TUNING.moveThreshold;

    if (vy < 0) {
      this.setAnimationState(PlayerAnimationState.Jump);
    } else if (vy > 0) {
      this.setAnimationState(PlayerAnimationState.Fall);
    } else if (isWalking) {
      this.setAnimationState(PlayerAnimationState.Walk);
    } else {
      this.setAnimationState(PlayerAnimationState.Idle);
    }
  }

  private setAnimationState(state: PlayerAnimationState) {
    if (this.animState === state) return;
    this.animState = state;
  }

  private applyAnimationForState() {
    switch (this.animState) {
      case PlayerAnimationState.Jump:
        this.playAnimation(this.jumpAnimation);
        break;
      case PlayerAnimationState.Fall:
        this.playAnimation(this.fallAnimation);
        break;
      case PlayerAnimationState.Walk:
        this.playAnimation(this.walkAnimation);
        break;
      case PlayerAnimationState.Skid:
        this.playAnimation(this.skidAnimation);
        break;
      case PlayerAnimationState.Idle:
      default:
        this.playAnimation(this.idleAnimation);
        break;
    }
  }

  private setupAnim(anim: AnimatedSprite, speed = 0.1) {
    anim.anchor.set(0.5, 1);
    anim.loop = true;
    anim.animationSpeed = speed;
  }

  private playAnimation(anim: AnimatedSprite) {
    if (this.currentAnimation === anim) return;
    if (this.currentAnimation) {
      this.removeChild(this.currentAnimation);
      this.currentAnimation.stop();
    }
    this.currentAnimation = anim;
    this.currentAnimation.gotoAndPlay(0);
    this.addChild(this.currentAnimation);
    this.updateSpriteDirection();
  }

  private move(dir: Direction) {
    const isReversing =
      this.isOnGround &&
      dir !== Direction.None &&
      Math.sign(this.vel.x) !== dir &&
      Math.abs(this.vel.x) > Player.TUNING.turnAnticipation.threshold;

    if (isReversing && !this.isSkidding) {
      this.triggerTurnSkid(dir);
    } else {
      this.setInputX(dir);
    }

    if (dir !== Direction.None) {
      this.facingDir = dir;
    }
  }

  private triggerTurnSkid(newDir: Direction) {
    if (this.isSkidding) return;
    this.isSkidding = true;

    this.setAnimationState(PlayerAnimationState.Skid);

    setTimeout(() => {
      this.isSkidding = false;
      this.move(newDir);
      this.setAnimationState(PlayerAnimationState.Walk);
    }, Player.TUNING.turnAnticipation.delayMs);
  }

  private tryStartJump() {
    const canJump =
      this.isOnGround ||
      this.jumpState.timeSinceGrounded < Player.TUNING.coyoteTimeMs;

    // Check jump buffer to determine whether to begin a jump
    const bufferedJumpStarted =
      this.jumpState.buffer > 0 && canJump && !this.jumpState.isSquashing;
    if (bufferedJumpStarted) {
      this.jumpState.buffer = 0;
      this.startJump();
      this.jumpState.timeSinceGrounded = Player.TUNING.coyoteTimeMs;
    }
  }

  private startJump() {
    if (this.jumpState.isSquashing) return;
    this.jumpState.isSquashing = true;

    const {
      squashScale,
      stretchScale,
      preJumpSquashDurationMs: squashDurationMs,
      stretchDurationMs,
    } = Player.TUNING.jumpVisuals;

    const squash = Actions.scaleTo(
      this,
      squashScale.x,
      squashScale.y,
      squashDurationMs / 1000,
      Interpolations.smooth
    );
    const stretch = Actions.scaleTo(
      this,
      stretchScale.x,
      stretchScale.y,
      stretchDurationMs / 1000,
      Interpolations.pow2out
    );
    const normalize = Actions.scaleTo(this, 1, 1, 0.1, Interpolations.smoother);

    const jumpSequence = Actions.sequence(
      // Squash before takeoff
      squash,
      Actions.runFunc(() => {
        // Jump!
        this.applyJump(-Player.TUNING.jumpForce);
      }),
      Actions.delay(0.016),
      // Stretch after takeoff
      stretch,
      // Return to normal scale
      normalize,
      Actions.runFunc(() => {
        this.jumpState.isSquashing = false;
      })
    );

    Actions.play(jumpSequence);
  }

  private updateJumpTimers(dt: number) {
    // Update coyote time counter
    if (this.isOnGround) {
      this.jumpState.timeSinceGrounded = 0;
    } else {
      this.jumpState.timeSinceGrounded += dt * 1000;
    }

    if (this.jumpState.buffer > 0) {
      this.jumpState.buffer -= dt * 1000; // Remove from buffer every tick
    }
  }

  /** Returns number between 0 and 1 to determine force of impact with ground */
  private getLandingImpact(): number {
    const fallSpeed = this.jumpState.lastFallSpeed;
    const threshold = this.tuning.gravity * 16; // limit for showing any squash
    const maxSafeFall = this.tuning.gravity * 24;

    let impact: number | null = null;
    if (fallSpeed < threshold) impact = 0;
    if (fallSpeed > maxSafeFall) impact = 1;
    if (impact === null)
      impact = (fallSpeed - threshold) / (maxSafeFall - threshold);

    return impact;
  }

  private applyLandingSquash(impact: number = 1) {
    const { squashScale, landingSquashDurationMs } = Player.TUNING.jumpVisuals;
    const baseSquash = squashScale;
    const squashX = baseSquash.x + 0.1 * impact;
    const squashY = baseSquash.y - 0.2 * impact;
    const squash = Actions.scaleTo(
      this,
      squashX,
      squashY,
      (landingSquashDurationMs / 1000) * impact,
      Interpolations.pow2out
    );
    const stretchUp = Actions.scaleTo(this, 0.9, 1.1, 0.04);
    const normalize = Actions.scaleTo(this, 1, 1, 0.1, Interpolations.smoother);
    const landingSequence = Actions.sequence(squash, stretchUp, normalize);
    Actions.play(landingSequence);
  }

  private updateSpriteDirection() {
    this.currentAnimation.scale.x = this.facingDir === Direction.Left ? -1 : 1;
  }
}
