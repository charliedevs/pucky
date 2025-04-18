import { Container, Graphics, Text, type TextStyle } from 'pixi.js';
import { type Player } from '../entities/Player';
import { debugConfig } from './DebugConfig';

export class PlayerDebugOverlay extends Container {
  private readonly box = new Graphics();
  private readonly labels: Text[] = [];
  private readonly values: Text[] = [];

  constructor(private player: Player) {
    super();
    this.zIndex = 9999;
    this.sortableChildren = true;

    this.addChild(this.box);

    const style: Partial<TextStyle> = { fontSize: 12, fill: 0xffffff };
    const padding = 6;
    const labelValueGap = 160;

    const lines = [
      { header: 'Player' },
      { label: 'facingDir' },
      { label: 'isSquashingJump' },
      { label: 'isSkidding' },
      { label: 'wasGrounded' },
      { label: 'timeSinceGroundedMs' },
      { label: 'jumpBufferMs' },
      { header: 'Actor' },
      { label: 'vel.x' },
      { label: 'vel.y' },
      { label: 'isOnGround' },
      { label: 'inputX' },
      { label: 'wasOnGround' },
      { label: 'jumpHeld' },
    ];

    lines.forEach((entry, i) => {
      const y = padding + i * 16;

      if (entry.header) {
        const header = new Text(entry.header, {
          ...style,
          fontWeight: 'bold',
        });
        header.position.set(padding, y);
        this.addChild(header);
      } else if (entry.label) {
        const label = new Text(entry.label + ':', style);
        const value = new Text('', style);

        label.position.set(padding, y);
        value.position.set(padding + labelValueGap, y);

        this.labels.push(label);
        this.values.push(value);

        this.addChild(label);
        this.addChild(value);
      }
    });

    this.updateBox();
  }

  public updateOverlay() {
    if (!debugConfig.getShowDebugOverlay()) {
      this.visible = false;
      return;
    }

    this.visible = true;

    const p = this.player;
    const a = p; // Player extends Actor

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: any[] = [
      p['facingDir'],
      p['isSquashingJump'],
      p['isSkidding'],
      p['wasGrounded'],
      p['timeSinceGroundedMs'].toFixed(0),
      p['jumpBufferMs'].toFixed(0),
      a.vel.x.toFixed(2),
      a.vel.y.toFixed(2),
      a.isOnGround,
      a['inputX'],
      a['wasOnGround'],
      a['jumpHeld'],
    ];

    this.values.forEach((text, idx) => {
      text.text = String(props[idx]);
    });

    this.updateBox();
  }

  private updateBox() {
    const width = 220;
    const height = this.height + 10;

    this.box.clear();
    this.box.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.3 });
    this.box.fill({ color: 0x000000, alpha: 0.5 });
    this.box.rect(0, 0, width, height);
    this.box.stroke();

    this.position.set(window.innerWidth - width - 8, 8);
  }
}
