import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS } from '../config.js';
import { PermissionManager } from '../input/PermissionManager.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    // Background sky color
    this.cameras.main.setBackgroundColor(COLORS.sky);

    // Title text
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3, 'Goccia', {
        fontSize: '72px',
        color: '#1a6b8a',
        fontStyle: 'bold',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3 + 90, "Il Ciclo dell'Acqua", {
        fontSize: '24px',
        color: '#2c3e50',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    // Pulsing prompt
    const prompt = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.65, 'Tocca per iniziare', {
        fontSize: '20px',
        color: '#555555',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Pulsing tween - yoyo loop
    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tap/click to start — also serves as the required user-gesture for
    // requesting microphone and accelerometer permissions together.
    this.input.once('pointerdown', () => {
      // Fire-and-forget: permissions are cached by the time the player reaches
      // the Rain phase. The game continues with graceful fallbacks if denied.
      void PermissionManager.instance.requestAll();
      this.scene.start('GameScene');
    });
  }
}

