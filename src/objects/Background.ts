import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../config.js';

export class Background {
  private readonly scene: Phaser.Scene;
  private readonly overlay: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const img = scene.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'background');
    img.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    img.setDepth(0);
    this.overlay = scene.add.graphics().setDepth(2);
  }

  highlightZone(): void {
    this.overlay.clear();
    this.overlay.fillStyle(0xffffff, 0.3);
    this.overlay.fillRect(200, 455, 80, 20);
    this.scene.time.delayedCall(500, () => void this.overlay.clear());
  }
}

