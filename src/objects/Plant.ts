import Phaser from 'phaser';
import { PLANT } from '../config.js';
import { type BreathingTweens, startBreathing, stopBreathing } from '../utils/breathing.js';

export class Plant extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private tapHandler: (() => void) | null = null;
  private breathingTweens: BreathingTweens | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.sprite = scene.add.sprite(0, 0, 'plant', 'plant-seed');
    this.sprite.setScale(PLANT.scale);
    this.add(this.sprite);
    this.setDepth(2);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  setGrowthLevel(n: 0 | 1 | 2): void {
    const frames: [string, string, string] = ['plant-seed', 'plant-sprout', 'plant-grown'];
    this.sprite.setFrame(frames[n]);
    this.sprite.setScale(PLANT.scale);
  }

  enableTap(handler: () => void): void {
    this.tapHandler = handler;
    this.setSize(120, 140);
    this.setInteractive();
    this.on('pointerdown', handler);
  }

  disableTap(): void {
    if (this.tapHandler) {
      this.off('pointerdown', this.tapHandler);
      this.tapHandler = null;
    }
    this.disableInteractive();
  }

  startBreathing(): void {
    this.stopBreathing();
    this.breathingTweens = startBreathing(this);
  }

  stopBreathing(): void {
    stopBreathing(this.breathingTweens, this);
    this.breathingTweens = null;
  }

  reset(): void {
    this.sprite.setFrame('plant-seed');
    this.sprite.setScale(PLANT.scale);
  }
}

