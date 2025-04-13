import { Container, Graphics, Text } from 'pixi.js';

export class HitboxDebugOverlay extends Container {
  private _rect: Graphics;
  private _label?: Text;

  constructor(width: number, height: number, labelText: string | null = null) {
    super();

    this._rect = new Graphics()
      .rect(0, 0, width, height)
      .stroke({ color: 0xff0000, width: 1, alpha: 0.8 });
    this.addChild(this._rect);

    if (labelText) {
      this._label = new Text({
        text: labelText,
        style: {
          fill: 'red',
          fontSize: 10,
        },
      });
      this._label.position.set(2, -15);
      this.addChild(this._label);
    }
  }

  /** Update overlay position and size */
  public updateBox(x: number, y: number, width: number, height: number) {
    this._rect.clear();
    this._rect
      .rect(0, 0, width, height)
      .stroke({ color: 0xff0000, width: 1, alpha: 0.8 });
    this.position.set(x, y);
  }

  public setVisible(visible: boolean) {
    this.visible = visible;
  }
}
