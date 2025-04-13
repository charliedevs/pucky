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
      squashScale: { x: 1.15, y: 0.5 },
      stretchScale: { x: 0.8, y: 1.25 },
      preJumpSquashDurationMs: 40,
      stretchDurationMs: 70,
      landingSquashDurationMs: 70,
    },

    /** Time where you're allowed to jump again before hitting ground */
    jumpBuffer: 15000,

    /** Time to pause on closed-feet before going idle */
    idleSnapDelay: 80,

    /** Skidding */
    turnAnticipation: {
      threshold: 2, // If speed is over this, apply skid delay on turn
      delayMs: 80, // How long to delay turn animation
    },
  } as const;

  private facingDir: Direction = Direction.Right;
  private isSquashingJump = false;
  private isSkidding = false;
  private wasGrounded = false;
  private jumpBufferMs = 0;

  private idleAnimation: AnimatedSprite;
  private walkAnimation: AnimatedSprite;
  private skidAnimation: AnimatedSprite;
  private jumpAnimation: AnimatedSprite;
  private fallAnimation: AnimatedSprite;
  private currentAnimation: AnimatedSprite;
  private animState: PlayerAnimationState = PlayerAnimationState.Idle;

  constructor(animations: Spritesheet['animations']) {
    super();

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
    const isJumpHeld = keyboard.isHeld('Space');
    this.setJumpHeld(isJumpHeld);

    this.updateActor(dt);
    this.moveX(dt);
    this.moveY(dt);

    // Check jump buffer to determine whether to begin a jump
    const bufferedJumpStarted =
      this.jumpBufferMs > 0 && this.isOnGround && !this.isSquashingJump;
    if (bufferedJumpStarted) {
      this.jumpBufferMs = 0;
      this.startJump();
    }
    if (this.jumpBufferMs > 0) {
      this.jumpBufferMs -= dt * 1000; // Remove from buffer every tick
    }

    // Apply landing squash if landing and not jumping again
    const wasGrounded = this.wasGrounded;
    this.wasGrounded = this.isOnGround;
    const justLanded = !wasGrounded && this.isOnGround;
    if (justLanded && !this.isSquashingJump) {
      this.applyLandingSquash();
    }

    // Update sprite animations
    this.updateSpriteDirection();
    this.updateAnimationStateFromPhysics();
    this.applyAnimationForState();
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
    this.jumpBufferMs = Player.TUNING.jumpBuffer;
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

  private startJump() {
    if (this.isSquashingJump) return;
    this.isSquashingJump = true;

    const {
      squashScale,
      stretchScale,
      preJumpSquashDurationMs: squashDurationMs,
      stretchDurationMs,
    } = Player.TUNING.jumpVisuals;

    // Squash before takeoff
    this.scale.set(squashScale.x, squashScale.y);
    setTimeout(() => {
      // Stretch on takeoff
      this.scale.set(stretchScale.x, stretchScale.y);
      this.applyJump(-Player.TUNING.jumpForce);

      // Return to normal
      setTimeout(() => {
        this.scale.set(1, 1);
        this.isSquashingJump = false;
      }, stretchDurationMs);
    }, squashDurationMs);
  }

  private applyLandingSquash() {
    const { squashScale, landingSquashDurationMs } = Player.TUNING.jumpVisuals;
    this.scale.set(squashScale.x, squashScale.y);
    setTimeout(() => {
      this.scale.set(1, 1);
    }, landingSquashDurationMs);
  }

  private updateSpriteDirection() {
    this.currentAnimation.scale.x = this.facingDir === Direction.Left ? -1 : 1;
  }
}
