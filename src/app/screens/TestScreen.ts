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
import { PausePopup } from '../popups/PausePopup';

/** Spritesheet definition for the player character */
const heroSheet = {
  frames: {
    idle: {
      frame: { x: 0, y: 0, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    walk: {
      frame: { x: 64, y: 0, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    jump: {
      frame: { x: 128, y: 0, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    fall: {
      frame: { x: 192, y: 0, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
  },
  meta: {
    image: 'hero-spritesheet.png',
    format: 'RGBA8888',
    size: { w: 256, h: 64 },
    scale: 1,
  },
  animations: {
    idle: ['idle'],
    walk: ['walk', 'idle'],
    jump: ['jump', 'fall'],
  },
};

/**
 * Player Class
 */
class Player extends Container {
  private currentAnimation: AnimatedSprite;
  private idleAnimation: AnimatedSprite;
  private walkingAnimation: AnimatedSprite;
  private jumpingAnimation: AnimatedSprite;

  private direction: 'left' | 'right' = 'right';
  private vx = 0;
  private speed = 2;

  constructor(animations: Spritesheet['animations']) {
    super();

    this.idleAnimation = new AnimatedSprite(animations.idle);
    this.walkingAnimation = new AnimatedSprite(animations.walk);
    this.jumpingAnimation = new AnimatedSprite(animations.jump);

    [this.idleAnimation, this.walkingAnimation, this.jumpingAnimation].forEach(
      (anim) => {
        anim.anchor.set(0.5, 0);
        anim.loop = true;
        anim.animationSpeed = 0.1;
      }
    );

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

  public update() {
    this.x += this.vx;

    if (this.vx < 0) {
      this.direction = 'left';
      this.setAnimation(this.walkingAnimation);
    } else if (this.vx > 0) {
      this.direction = 'right';
      this.setAnimation(this.walkingAnimation);
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
  private player!: Player;
  private keys = new Set<string>();

  constructor() {
    super();
    TexturePool.textureOptions.scaleMode = 'linear';

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

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    engine().ticker.add(this.update, this);
  }

  public async pause() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    engine().ticker.remove(this.update, this);

    this.testContainer.interactiveChildren = false;
    this.player.pause();
  }

  public async resume() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    engine().ticker.add(this.update, this);

    this.testContainer.interactiveChildren = true;
    this.player.resume();
  }

  public update(_time: Ticker) {
    this.updateMovement();
    this.player.update();
  }

  private updateMovement() {
    if (this.keys.has('ArrowLeft') && !this.keys.has('ArrowRight')) {
      this.player.moveLeft();
    } else if (this.keys.has('ArrowRight') && !this.keys.has('ArrowLeft')) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  /** Pause the app if the window loses focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
