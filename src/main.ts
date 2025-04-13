import { CreationEngine } from './engine/engine';
import { setEngine } from './game/getEngine';
import { LoadScreen } from './game/screens/LoadScreen';
import { TestScreen } from './game/screens/TestScreen';
import { userSettings } from './game/utils/userSettings';

/**
 * Importing these modules will automatically register there plugins with the engine.
 */
import '@pixi/sound';
// import "@esotericsoftware/spine-pixi-v8";

// Create a new creation engine instance
const engine = new CreationEngine();
setEngine(engine);

(async () => {
  // Initialize the creation engine instance
  await engine.init({
    background: '#1E1E1E',
    resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
  });

  // @ts-expect-error used for dev tools
  globalThis.__PIXI_STAGE__ = engine.stage;
  // @ts-expect-error used for dev tools
  globalThis.__PIXI_RENDERER__ = engine.renderer;

  // Initialize the user settings
  userSettings.init();

  // Show the load screen
  await engine.navigation.showScreen(LoadScreen);
  // Show the main screen once the load screen is dismissed
  await engine.navigation.showScreen(TestScreen);
})();
