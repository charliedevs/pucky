import { Container, Graphics } from 'pixi.js';

/**
 * A rectangular platform or obstacle used for collision with Actors.
 *
 * This represents terrain, walls, and platforms that do not move.
 * The bounding box of this object is used during collision resolution.
 * It does not perform logic on its own and is meant to be queried by Actors or a collision manager.
 *
 * @example
 * const platform = new Solid(100, 300, 128, 32);
 * container.addChild(platform);
 */
export class Solid extends Container {
  public readonly isHazard: boolean;

  private _width: number;
  private _height: number;

  /**
   * Create a new solid object at a given position and size.
   *
   * @param x - X position of the top-left corner
   * @param y - Y position of the top-left corner
   * @param width - Width of the solid area in pixels
   * @param height - Height of the solid area in pixels
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    isHazard = false
  ) {
    super();
    this.position.set(x, y);
    this._width = width;
    this._height = height;

    this.isHazard = isHazard;

    // Debug: make visible using simple graphics for now
    const color = isHazard ? 0xff4444 : 0x448844;
    const gfx = new Graphics().rect(0, 0, width, height).fill({ color });
    this.addChild(gfx);
  }

  /** Returns bounding box of the solid */
  public getBoundsRect() {
    return {
      x: this.x,
      y: this.y,
      width: this._width,
      height: this._height,
    };
  }
}
