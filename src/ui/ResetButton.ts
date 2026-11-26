import Phaser from 'phaser';
import { CANVAS_WIDTH } from '../config.js';

export class ResetButton {
  constructor(scene: Phaser.Scene, onReset: () => void) {
    const btn = scene.add
      .text(CANVAS_WIDTH - 16, 16, '↺', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#00000066',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setAlpha(0.7));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onReset);
  }
}

