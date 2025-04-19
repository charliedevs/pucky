import { Container, TexturePool, type Ticker } from 'pixi.js';
import { debugConfig } from '../debug/DebugConfig';
import { PlayerDebugOverlay } from '../debug/DebugOverlay';
import { Player } from '../entities/Player';
import { Solid } from '../entities/Solid';
import { engine } from '../getEngine';
import { KeyboardInput } from '../input/KeyboardInput';
import { PausePopup } from '../popups/PausePopup';
import { delay } from '../utils/delay';

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
  private playerDestroyed = false;

  private debugOverlay: PlayerDebugOverlay | null = null;

  constructor() {
    super();

    // Config
    TexturePool.textureOptions.scaleMode = 'nearest';

    this.testContainer = new Container();
    this.addChild(this.testContainer);
  }

  /** Show the screen */
  public async show() {
    const mainPlatform = new Solid(100, 350, 320, 40);
    this.solids.push(mainPlatform);
    this.testContainer.addChild(mainPlatform);

    const platform2 = new Solid(550, 300, 100, 40);
    this.solids.push(platform2);
    this.testContainer.addChild(platform2);

    const platform3 = new Solid(400, 500, 100, 40);
    this.solids.push(platform3);
    this.testContainer.addChild(platform3);

    const abovePlatform = new Solid(140, 200, 200, 40);
    this.solids.push(abovePlatform);
    this.testContainer.addChild(abovePlatform);

    const deathZone = new Solid(-1000, 800, 8000, 50, true);
    this.solids.push(deathZone);
    this.testContainer.addChild(deathZone);

    await this.createPlayer();

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
    this.debugOverlay?.updateOverlay();
    if (this.keyboard.isPressedOnce('F1')) {
      debugConfig.toggleHitboxes();
      debugConfig.toggleDebugOverlay();
    }
  }

  private handleInput() {
    if (this.keyboard.isHeld('ArrowLeft') && !this.keyboard.isHeld('ArrowRight')) {
      this.player.moveLeft();
    } else if (this.keyboard.isHeld('ArrowRight') && !this.keyboard.isHeld('ArrowLeft')) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }

    if (this.keyboard.isPressedOnce('Space')) {
      this.player.jump();
    }
  }

  private async createPlayer() {
    const playerSpritesheet = await Player.loadSpritesheet();
    this.player = new Player(playerSpritesheet.animations);
    this.player.setCollisionChecker(this.collidesAt.bind(this));
    this.testContainer.addChild(this.player);
    this.player.setHazardCallback(() => {
      this.destroyAndRespawnPlayer();
    });
    this.debugOverlay = new PlayerDebugOverlay(this.player);
    this.testContainer.addChild(this.debugOverlay);
  }

  private collidesAt(x: number, y: number, width: number, height: number) {
    for (const solid of this.solids) {
      const bounds = solid.getBoundsRect();
      const isColliding =
        x + width > bounds.x &&
        x < bounds.x + bounds.width &&
        y + height > bounds.y &&
        y < bounds.y + bounds.height;

      if (isColliding && solid.isHazard) {
        this.player.onHazardTouched?.();
      }

      if (isColliding) return true;
    }
    return false;
  }

  private async destroyAndRespawnPlayer() {
    if (this.playerDestroyed) return;
    this.playerDestroyed = true;
    this.testContainer.removeChild(this.player);
    if (this.debugOverlay) this.testContainer.removeChild(this.debugOverlay);

    // Recreate player after short delay
    await delay(150);
    await this.createPlayer();
    this.playerDestroyed = false;
  }

  /** Pause the app if the window loses focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
