import Phaser from 'phaser';
import { CANVAS_WIDTH } from '../config.js';

export class PhaseText {
  private text: Phaser.GameObjects.Text;
  private currentTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(CANVAS_WIDTH / 2, 60, '', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#00000066',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(10);
  }

  show(text: string): void {
    if (!text) return;

    // Cancel existing tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    this.text.setText(text);
    this.text.setAlpha(0);

    const scene = this.text.scene;

    // Fade in
    this.currentTween = scene.tweens.add({
      targets: this.text,
      alpha: 1,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        // Hold for 2s then fade out
        this.currentTween = scene.tweens.add({
          targets: this.text,
          alpha: 0,
          duration: 500,
          delay: 2000,
          ease: 'Linear',
          onComplete: () => {
            this.currentTween = null;
          },
        });
      },
    });
  }
}

