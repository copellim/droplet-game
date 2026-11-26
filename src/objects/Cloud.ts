import Phaser from 'phaser';
import { ZONES } from '../config.js';
import { type BreathingTweens, startBreathing, stopBreathing } from '../utils/breathing.js';

const CLOUD_FRAMES = ['cloud-happy', 'cloud-content', 'cloud-neutral', 'cloud-worried'] as const;
const CLOUD_DISPLAY_SIZE = { width: 130, height: 85 } as const;

export class Cloud extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private tapCount = 0;
  private tapHandler: (() => void) | null = null;
  private breathingTweens: BreathingTweens | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, ZONES.cloudX, ZONES.cloudY);

    this.sprite = scene.add.sprite(0, 0, 'cloud', 'cloud-happy');
    this.sprite.setDisplaySize(CLOUD_DISPLAY_SIZE.width, CLOUD_DISPLAY_SIZE.height);
    this.add(this.sprite);

    this.setDepth(1);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  setTapCount(n: number): void {
    this.tapCount = n;
    this.sprite.setFrame(CLOUD_FRAMES[Math.min(n, CLOUD_FRAMES.length - 1)]!);
  }

  enableTap(handler: () => void): void {
    this.tapHandler = handler;
    this.setSize(140, 80);
    this.setInteractive();
    this.on('pointerdown', handler);
  }

  disableTap(): void {
    if (this.tapHandler) {
      this.off('pointerdown', this.tapHandler);
      this.tapHandler = null;
    }
  }

  reset(): void {
    this.tapCount = 0;
    this.sprite.setFrame('cloud-happy');
  }

  startBreathing(): void {
    this.stopBreathing();
    this.breathingTweens = startBreathing(this);
  }

  stopBreathing(): void {
    stopBreathing(this.breathingTweens, this);
    this.breathingTweens = null;
  }
}

