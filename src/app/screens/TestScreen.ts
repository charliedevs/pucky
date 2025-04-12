import {
  AnimatedSprite,
  Container,
  Graphics,
  Spritesheet,
  Texture,
  TexturePool,
  type Ticker,
} from 'pixi.js';
import { engine } from '../getEngine';
import { KeyboardInput } from '../input/KeyboardInput';
import { PhysicsBody } from '../physics/PhysicsBody';
import { PausePopup } from '../popups/PausePopup';

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
  },
};

enum PlayerAnimationState {
  Idle,
  Walk,
  Jump,
  Fall,
}

/**
 * Player Class
 */
class Player extends Container {
  private static readonly JUMP_FORCE = 10;
  private static readonly GROUND_Y = 300; // temporary until platforms/collision

  private idleAnimation: AnimatedSprite;
  private walkAnimation: AnimatedSprite;
  private jumpAnimation: AnimatedSprite;
  private fallAnimation: AnimatedSprite;
  private currentAnimation: AnimatedSprite;

  private physics = new PhysicsBody();
  private facing: 'left' | 'right' = 'right';
  private animState: PlayerAnimationState = PlayerAnimationState.Idle;

  constructor(animations: Spritesheet['animations']) {
    super();

    this.idleAnimation = new AnimatedSprite(animations.idle);
    this.walkAnimation = new AnimatedSprite(animations.walk);
    this.jumpAnimation = new AnimatedSprite(animations.jump);
    this.fallAnimation = new AnimatedSprite(animations.fall);

    [
      this.idleAnimation,
      this.walkAnimation,
      this.jumpAnimation,
      this.fallAnimation,
    ].forEach((anim) => {
      anim.anchor.set(0.5, 0);
      anim.loop = true;
      anim.animationSpeed = 0.1;
    });

    this.currentAnimation = this.idleAnimation;
    this.currentAnimation.play();
    this.addChild(this.currentAnimation);

    this.position.set(100, 300);
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

  public update(dt: number) {
    this.physics.update(dt);
    this.position = this.physics.getNextPosition(this.position, dt);
    this.y = this.physics.checkGround(Player.GROUND_Y, this.y);

    this.updateAnimationState();
    this.updateFacingDirection();
  }

  public moveLeft() {
    this.physics.setInputX(-1);
  }

  public moveRight() {
    this.physics.setInputX(1);
  }

  public stop() {
    this.physics.setInputX(0);
  }

  public jump() {
    const fy = Player.JUMP_FORCE * -1;
    this.physics.jump(fy);
  }

  public pause() {
    this.currentAnimation.stop();
  }

  public resume() {
    this.currentAnimation.play();
  }

  private playAnimation(anim: AnimatedSprite) {
    if (this.currentAnimation === anim) return;

    this.removeChild(this.currentAnimation);
    this.currentAnimation.stop();

    this.currentAnimation = anim;
    this.currentAnimation.play();
    this.addChild(this.currentAnimation);
  }

  private updateAnimationState() {
    const { x: vx, y: vy } = this.physics.vel;
    let newState: PlayerAnimationState;

    if (vy < 0) {
      newState = PlayerAnimationState.Jump;
    } else if (vy > 0) {
      newState = PlayerAnimationState.Fall;
    } else if (vx !== 0) {
      newState = PlayerAnimationState.Walk;
    } else {
      newState = PlayerAnimationState.Idle;
    }

    if (newState !== this.animState) {
      this.animState = newState;

      switch (newState) {
        case PlayerAnimationState.Jump:
          this.playAnimation(this.jumpAnimation);
          break;
        case PlayerAnimationState.Fall:
          this.playAnimation(this.fallAnimation);
          break;
        case PlayerAnimationState.Walk:
          this.playAnimation(this.walkAnimation);
          break;
        case PlayerAnimationState.Idle:
        default:
          this.playAnimation(this.idleAnimation);
          break;
      }
    }
  }

  private updateFacingDirection() {
    const vx = this.physics.vel.x;
    if (vx < 0) {
      this.facing = 'left';
    } else if (vx > 0) {
      this.facing = 'right';
    }

    this.currentAnimation.scale.x = this.facing === 'left' ? -1 : 1;
  }
}

/**
 * TestScreen Class
 */
export class TestScreen extends Container {
  /**
   * Asset bundles required for this screen, using AssetPack.
   * The engine automatically loads the assets specified, based
   * on the content of `raw-assets/` folder.
   *
   * See more here: https://pixijs.io/create-pixi/docs/guide/creations/engine/#asset-loading
   */
  public static assetBundles = ['main', 'test']; // using main for now as placeholder (see MainScreen.ts)

  public testContainer: Container;
  private paused = false;
  private keyboard = new KeyboardInput();
  private player!: Player;

  constructor() {
    super();

    // Config
    TexturePool.textureOptions.scaleMode = 'nearest';

    this.testContainer = new Container();
    this.addChild(this.testContainer);
  }

  /** Show the screen */
  public async show() {
    const shape = new Graphics()
      .rect(200, 200, 200, 180)
      .fill({ color: '#FFEA00', alpha: 0.8 });

    this.testContainer.addChild(shape);

    const sheet = await Player.loadSpritesheet();
    this.player = new Player(sheet.animations);
    this.testContainer.addChild(this.player);
    engine().ticker.add(this.update, this);
  }

  public async pause() {
    this.paused = true;
    this.keyboard.pause();
    this.testContainer.interactiveChildren = false;
    this.player.pause();
  }

  public async resume() {
    this.paused = false;
    this.keyboard.resume();
    this.testContainer.interactiveChildren = true;
    this.player.resume();
  }

  public update(ticker: Ticker) {
    if (this.paused) return;
    this.keyboard.update();
    this.updateMovement();
    this.player.update(ticker.deltaTime);
  }

  private updateMovement() {
    if (
      this.keyboard.isHeld('ArrowLeft') &&
      !this.keyboard.isHeld('ArrowRight')
    ) {
      this.player.moveLeft();
    } else if (
      this.keyboard.isHeld('ArrowRight') &&
      !this.keyboard.isHeld('ArrowLeft')
    ) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }

    if (this.keyboard.isPressedOnce('Space')) {
      this.player.jump();
    }
  }

  /** Pause the app if the window loses focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
