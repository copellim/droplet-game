import Phaser from 'phaser';
import { DROPLET } from '../config.js';

export type DropletExpression = 'Serene' | 'Surprised' | 'Happy' | 'Excited' | 'Satisfied';

const EXPRESSION_FRAME: Record<DropletExpression, string> = {
  Serene: 'droplet-serene',
  Surprised: 'droplet-surprised',
  Happy: 'droplet-happy',
  Excited: 'droplet-excited',
  Satisfied: 'droplet-satisfied',
};

const DROPLET_SIZE = {
  width: 60,
  height: 75,
};

export class Droplet extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private oscillationTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 195, 480);

    this.sprite = scene.add.sprite(0, 0, 'droplet', 'droplet-serene');
    this.sprite.setDisplaySize(DROPLET_SIZE.width, DROPLET_SIZE.height);
    this.add(this.sprite);

    this.setDepth(2);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  setExpression(expr: DropletExpression): void {
    this.sprite.setFrame(EXPRESSION_FRAME[expr]);
    this.sprite.setDisplaySize(DROPLET_SIZE.width, DROPLET_SIZE.height);
  }

  resetToSerene(): void {
    this.setAlpha(1);
    this.setScale(1);
    this.setExpression('Serene');
  }

  setSplash(frame: 1 | 2): void {
    this.sprite.setFrame(`droplet-splash-${frame}`);
    this.sprite.setDisplaySize(DROPLET_SIZE.width, DROPLET_SIZE.height);
  }

  startOscillation(): void {
    this.stopOscillation();
    this.oscillationTween = this.scene.tweens.add({
      targets: this,
      y: this.y + DROPLET.oscillationAmplitude,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopOscillation(): void {
    if (this.oscillationTween) {
      this.oscillationTween.stop();
      this.oscillationTween = null;
    }
  }
}

