import { Container, Graphics, Ticker } from 'pixi.js';
import { engine } from '../getEngine';
import { PausePopup } from '../popups/PausePopup';

export class TestScreen extends Container {
    /**
     * Asset bundles required for this screen, using AssetPack.
     * The engine automatically loads the assets specified, based
     * on the content of the `~/manifest.json` file.
     *
     * See more here: https://pixijs.io/create-pixi/docs/guide/creations/engine/#asset-loading
     */
    public static assetBundles = ['main']; // using main for now as placeholder (see MainScreen.ts)

    public testContainer: Container;

    constructor() {
        super();

        this.testContainer = new Container();
        this.addChild(this.testContainer);
    }

    /** Show the screen */
    public async show() {
        const shape = new Graphics()
            .rect(200, 200, 200, 180)
            .fill({ color: '#FFEA00', alpha: 0.8 });

        this.testContainer.addChild(shape);
    }

    /** Hide the screen */
    //hide?(): Promise<void>;

    /** Pause the screen */
    public async pause() {
        this.testContainer.interactiveChildren = false;
    }

    /** Resume the screen */
    public async resume() {
        this.testContainer.interactiveChildren = true;
    }

    /** Prepare screen, before showing */
    //prepare?(): void;

    /** Reset screen, after hidden */
    //reset?(): void;

    /** Update the screen, passing delta time/step */
    update?(time: Ticker): void;

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
