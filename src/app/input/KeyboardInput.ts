export class KeyboardInput {
  private heldKeys = new Set<string>();
  private pressedKeys = new Set<string>();
  private pressBuffer = new Set<string>();
  private active = true;

  constructor() {
    this.attachListeners();
  }

  /** Call at the start of each frame to reset per-frame state */
  public update() {
    this.pressedKeys = new Set(this.pressBuffer);
    this.pressBuffer.clear();
  }

  /** Is the key currently being held down? */
  public isHeld(key: string): boolean {
    return this.heldKeys.has(key);
  }

  /** Was the key just pressed down this frame? */
  public isPressedOnce(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (!this.heldKeys.has(e.code)) {
      this.pressBuffer.add(e.code); // Only set if it wasn't already held
    }
    this.heldKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.active) return;
    this.heldKeys.delete(e.code);
  };

  /** Disable input until `resume()` is called. */
  public pause() {
    this.active = false;
  }

  /** Resume input processing */
  public resume() {
    this.active = true;
  }

  /** Remove keyboard event listeners */
  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.heldKeys.clear();
    this.pressedKeys.clear();
    this.pressBuffer.clear();
  }

  private attachListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
}
