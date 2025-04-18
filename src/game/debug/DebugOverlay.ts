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
      { label: 'lastFallSpeed' },
      { label: 'playedLandingSquash' },
      { label: 'isSkidding' },
      { label: 'timeSinceGroundedMs' },
      { label: 'jumpBufferMs' },
      { label: 'jumpHeld' },
      { header: 'Actor' },
      { label: 'vel.x' },
      { label: 'vel.y' },
      { label: 'isOnGround' },
      { label: 'inputX' },
      { label: 'wasOnGround' },
    ];

    lines.forEach((entry, i) => {
      const y = padding + i * 16;

      if (entry.header) {
        const header = new Text({
          text: entry.header,
          style: {
            ...style,
            fontWeight: 'bold',
          },
        });
        header.position.set(padding, y);
        this.addChild(header);
      } else if (entry.label) {
        const label = new Text({ text: entry.label + ':', style });
        const value = new Text({ text: '', style });

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
      Math.round(p['lastFallSpeed'] * 100) / 100,
      p['playedLandingSquash'],
      p['isSkidding'],
      p['timeSinceGroundedMs'].toFixed(0),
      p['jumpBufferMs'].toFixed(0),
      p['jumpHeld'],
      a.vel.x.toFixed(2),
      a.vel.y.toFixed(2),
      a.isOnGround,
      a['inputX'],
      a['wasOnGround'],
    ];

    this.values.forEach((text, idx) => {
      text.text = String(props[idx]);
    });

    this.updateBox();
  }

  private updateBox() {
    const width = 220;
    const height = 400;

    this.box.clear();
    this.box.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.3 });
    this.box.fill({ color: 0x000000, alpha: 0.5 });
    this.box.rect(0, 0, width, height);
    this.box.stroke();

    this.position.set(window.innerWidth - width - 8, 8);
  }
}
