import { Container, TexturePool, type Ticker } from 'pixi.js';
import { debugConfig } from '../debug/DebugConfig';
import { Player } from '../entities/Player';
import { Solid } from '../entities/Solid';
import { engine } from '../getEngine';
import { KeyboardInput } from '../input/KeyboardInput';
import { PausePopup } from '../popups/PausePopup';

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

  private solids: Solid[] = [];
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
    const platform = new Solid(100, 350, 300, 40);
    this.solids.push(platform);
    this.testContainer.addChild(platform);

    const playerSpritesheet = await Player.loadSpritesheet();
    this.player = new Player(playerSpritesheet.animations);
    this.player.setCollisionChecker(this.collidesAt.bind(this));
    this.testContainer.addChild(this.player);

    engine().ticker.add(this.update, this);
  }

  public async pause() {
    this.paused = true;
    this.keyboard.pause();
    this.testContainer.interactiveChildren = false;
  }

  public async resume() {
    this.paused = false;
    this.keyboard.resume();
    this.testContainer.interactiveChildren = true;
  }

  public update(ticker: Ticker) {
    if (this.paused) return;
    this.keyboard.update();
    this.handleInput();
    this.player.update(ticker.deltaTime, this.keyboard);

    // DEBUG
    if (this.keyboard.isPressedOnce('F1')) {
      debugConfig.toggleHitboxes();
    }
  }

  private handleInput() {
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

  private collidesAt(x: number, y: number, width: number, height: number) {
    return this.solids.some((solid) => {
      const bounds = solid.getBoundsRect();
      return (
        x + width > bounds.x &&
        x < bounds.x + bounds.width &&
        y + height > bounds.y &&
        y < bounds.y + bounds.height
      );
    });
  }

  /** Pause the app if the window loses focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
