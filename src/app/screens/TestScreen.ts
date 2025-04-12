import {
  AnimatedSprite,
  Container,
  Graphics,
  Spritesheet,
  Texture,
  TexturePool,
} from 'pixi.js';
import { engine } from '../getEngine';
import { PausePopup } from '../popups/PausePopup';

const heroSheet = {
  frames: {
    idle: {
      frame: { x: 0, y: 0, w: 64, h: 64 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    walk: {
      frame: { x: 64, y: 64, w: 128, h: 128 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    jump: {
      frame: { x: 128, y: 128, w: 192, h: 192 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
    fall: {
      frame: { x: 192, y: 192, w: 256, h: 256 },
      sourceSize: { w: 64, h: 64 },
      spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
    },
  },
  meta: {
    image: 'hero-spritesheet.png',
    format: 'RGBA8888',
    size: { w: 256, h: 64 },
    scale: 1,
    anchor: 0,
  },
  animations: {
    idle: ['idle'],
    walk: ['walk', 'idle'],
    jump: ['jump', 'fall'],
  },
};

//TODO: Maybe player isn't animated sprite, but it has an animated sprite that it adds to container?
class Player extends Container {
  private currentAnimation: AnimatedSprite;
  private idleAnimation: AnimatedSprite;
  private walkingAnimation: AnimatedSprite;
  private jumpingAnimation: AnimatedSprite;

  constructor() {
    super();
    // Create sprites from spritesheet
    const sheet = new Spritesheet(
      Texture.from(heroSheet.meta.image),
      heroSheet
    );
    sheet.parse();
    this.idleAnimation = new AnimatedSprite(sheet.animations.idle);
    this.walkingAnimation = new AnimatedSprite(sheet.animations.walk);
    this.jumpingAnimation = new AnimatedSprite(sheet.animations.jump);
    this.currentAnimation = this.idleAnimation;
    this.currentAnimation.play();
  }

  public pause() {
    this.currentAnimation.stop();
  }

  public resume() {
    this.currentAnimation.play();
  }

  private jump() {
    //this.set
  }

  public async show(screen: TestScreen): Promise<void> {
    screen.testContainer.addChild(this.currentAnimation);
  }
}

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
  private player: Player;

  constructor() {
    super();

    TexturePool.textureOptions.scaleMode = 'linear';

    this.testContainer = new Container();
    this.addChild(this.testContainer);

    this.player = new Player();
  }

  /** Show the screen */
  public async show() {
    const shape = new Graphics()
      .rect(200, 200, 200, 180)
      .fill({ color: '#FFEA00', alpha: 0.8 });

    this.testContainer.addChild(shape);
    this.player.show(this);
  }

  /** Hide the screen */
  //hide?(): Promise<void>;

  /** Pause the screen */
  public async pause() {
    this.testContainer.interactiveChildren = false;
    this.player.pause();
  }

  /** Resume the screen */
  public async resume() {
    this.testContainer.interactiveChildren = true;
    this.player.resume();
  }

  /** Prepare screen, before showing */
  //prepare?(): void;

  /** Reset screen, after hidden */
  //reset?(): void;

  /** Update the screen, passing delta time/step */
  //update?(time: Ticker): void;

  /** Resize the screen */
  //resize?(width: number, height: number): void;

  /** Pause the app if the window loses focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }

  /** Focus the screen */
  //focus?(): void;
}
