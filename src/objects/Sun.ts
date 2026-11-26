import Phaser from 'phaser';
import { SUN, ZONES } from '../config.js';
import { vibrate } from '../utils/haptics.js';

const SUN_SIZE = 108;

export class Sun {
  private readonly sprite: Phaser.GameObjects.Image;
  private dragActive = false;
  private dragHandler:
    | ((pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => void)
    | null = null;
  private dragStartHandler: ((pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => void) | null = null;
  private inputScene: Phaser.Scene | null = null;
  private breathingTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(SUN.initialX, SUN.initialY, 'sun');
    this.sprite.setDisplaySize(SUN_SIZE, SUN_SIZE);
    this.sprite.setDepth(1);
  }

  startBreathing(): void {
    this.stopBreathing();
    const baseScaleX = this.sprite.scaleX;
    const baseScaleY = this.sprite.scaleY;
    this.breathingTween = this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: baseScaleX * 1.09,
      scaleY: baseScaleY * 1.09,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopBreathing(): void {
    if (this.breathingTween) {
      this.breathingTween.stop();
      this.breathingTween = null;
      this.sprite.setDisplaySize(SUN_SIZE, SUN_SIZE);
    }
  }

  setDraggable(scene: Phaser.Scene): void {
    if (this.dragHandler && this.inputScene) {
      this.inputScene.input.off('drag', this.dragHandler);
    }
    if (this.dragStartHandler && this.inputScene) {
      this.inputScene.input.off('dragstart', this.dragStartHandler);
    }
    this.inputScene = scene;
    this.sprite.setInteractive();
    scene.input.setDraggable(this.sprite);
    this.dragActive = true;

    this.dragStartHandler = (_pointer, obj) => {
      if (obj !== this.sprite) return;
      this.stopBreathing();
      vibrate();
    };
    scene.input.on('dragstart', this.dragStartHandler);

    this.dragHandler = (_pointer, obj, _dragX, dragY) => {
      if (!this.dragActive || obj !== this.sprite) return;
      this.sprite.y = Phaser.Math.Clamp(dragY, 60, ZONES.terrainTop - 20);
    };
    scene.input.on('drag', this.dragHandler);
  }

  disableDrag(): void {
    this.dragActive = false;
    if (this.dragHandler && this.inputScene) {
      this.inputScene.input.off('drag', this.dragHandler);
      this.dragHandler = null;
    }
    if (this.dragStartHandler && this.inputScene) {
      this.inputScene.input.off('dragstart', this.dragStartHandler);
      this.dragStartHandler = null;
    }
  }

  getY(): number {
    return this.sprite.y;
  }

  reset(): void {
    this.stopBreathing();
    this.sprite.x = SUN.initialX;
    this.sprite.y = SUN.initialY;
    this.dragActive = false;
  }
}

