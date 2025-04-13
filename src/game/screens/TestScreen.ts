import { Container, Graphics, TexturePool, type Ticker } from 'pixi.js';
import { Player } from '../entities/Player';
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
  }

  public async resume() {
    this.paused = false;
    this.keyboard.resume();
    this.testContainer.interactiveChildren = true;
  }

  public update(ticker: Ticker) {
    if (this.paused) return;
    this.keyboard.update();
    this.updateMovement();
    this.player.update(ticker.deltaTime, this.keyboard);
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
