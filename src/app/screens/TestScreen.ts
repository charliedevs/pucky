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

/**
 * Player Class
 */
class Player extends Container {
  private currentAnimation: AnimatedSprite;
  private idleAnimation: AnimatedSprite;
  private walkAnimation: AnimatedSprite;
  private jumpAnimation: AnimatedSprite;
  private fallAnimation: AnimatedSprite;

  private direction: 'left' | 'right' = 'right';
  private vx = 0;
  private vy = 0;
  private isInAir = false;

  private speed = 2;
  private gravity = 0.5;
  private jumpForce = -10;
  private groundY = 300; // temporary until platforms/collision

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

  public update(deltaTime: number) {
    this.x += this.vx * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.y += this.vy * deltaTime;

    // Landing check
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      this.isInAir = false;
    }

    // Direction player is facing
    if (this.vx < 0) {
      this.direction = 'left';
    } else if (this.vx > 0) {
      this.direction = 'right';
    }

    // Animation for walking/jumping
    if (this.vy < 0) {
      this.setAnimation(this.jumpAnimation);
    } else if (this.vy > 0) {
      this.setAnimation(this.fallAnimation);
    } else if (this.vx !== 0) {
      this.setAnimation(this.walkAnimation);
    } else {
      this.setAnimation(this.idleAnimation);
    }

    this.currentAnimation.scale.x = this.direction === 'left' ? -1 : 1;
  }

  public moveLeft() {
    this.vx = -this.speed;
  }

  public moveRight() {
    this.vx = this.speed;
  }

  public stop() {
    this.vx = 0;
  }

  public jump() {
    if (!this.isInAir) {
      this.vy = this.jumpForce;
      this.isInAir = true;
    }
  }

  public pause() {
    this.currentAnimation.stop();
  }

  public resume() {
    this.currentAnimation.play();
  }

  private setAnimation(anim: AnimatedSprite) {
    if (this.currentAnimation === anim) return;

    this.removeChild(this.currentAnimation);
    this.currentAnimation.stop();

    this.currentAnimation = anim;
    this.currentAnimation.play();
    this.addChild(this.currentAnimation);
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
