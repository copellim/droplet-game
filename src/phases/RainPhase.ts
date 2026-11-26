import Phaser from 'phaser';
import { DROPLET, PLANT, SENSORS } from '../config.js';
import { GamePhase } from '../phases/PhaseManager.js';
import { PhaseContext } from '../scenes/GameScene.js';

export class RainPhase {
  private handlers: { type: string; handler: EventListener }[] = [];
  private tween: Phaser.Tweens.Tween | null = null;
  private isDragging = false;
  /** True when the fall tween is waiting for the tutorial to be dismissed. */
  private fallPending = false;
  private sceneRef: Phaser.Scene | null = null;

  start(ctx: PhaseContext): void {
    const { droplet, background } = ctx;
    this.sceneRef = ctx.scene;
    this.isDragging = false;

    droplet.setVisible(true);
    droplet.setAlpha(1);
    droplet.setScale(1);
    droplet.setExpression('Excited');
    background.highlightZone();

    this.setupInputListeners(ctx);

    // Show tilt tutorial anchored at the droplet's current position (top of fall).
    const isFirst = ctx.tutorialOverlay.showIfFirst('tilt', droplet.x, droplet.y);
    if (isFirst) {
      this.fallPending = true;
    } else {
      this.startFall(ctx);
    }
  }

  update(ctx: PhaseContext): void {
    // Start the fall as soon as the tutorial is dismissed.
    if (this.fallPending && !ctx.tutorialOverlay.isActive) {
      this.fallPending = false;
      this.startFall(ctx);
    }
  }

  private setupInputListeners(ctx: PhaseContext): void {
    this.addTiltListener(ctx);
    this.addPointerDragListeners(ctx);
  }

  private addTiltListener(ctx: PhaseContext): void {
    if (typeof DeviceOrientationEvent === 'undefined') return;
    const onTilt = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma;
      if (gamma === null || Math.abs(gamma) < SENSORS.orientationDeadZone) return;
      ctx.tutorialOverlay.dismiss();
      ctx.droplet.x += gamma * SENSORS.orientationSensitivity;
    };
    window.addEventListener('deviceorientation', onTilt as EventListener);
    this.handlers.push({ type: 'deviceorientation', handler: onTilt as EventListener });
  }

  private addPointerDragListeners(ctx: PhaseContext): void {
    const { droplet, scene } = ctx;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (droplet.getBounds().contains(pointer.x, pointer.y)) {
        this.isDragging = true;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        ctx.tutorialOverlay.dismiss();
        droplet.x = pointer.x;
      }
    });

    scene.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private startFall(ctx: PhaseContext): void {
    const { droplet, scene, phaseManager, plants } = ctx;
    const fallY = Math.max(...PLANT.positions.map((p) => p.y));
    ctx.audioManager.playSfx('rain');
    this.tween = scene.tweens.add({
      targets: droplet,
      y: fallY,
      duration: DROPLET.rainFallDuration,
      ease: 'linear',
      onComplete: () => {
        ctx.audioManager.playSfx('splash');
        this.cleanup(scene);
        const hitPlantIndex = this.detectHitPlant(droplet.x, plants);
        const payload = hitPlantIndex !== undefined ? { hitPlantIndex } : {};
        phaseManager.transition(GamePhase.Landing, payload);
      },
    });
  }

  private detectHitPlant(dropletX: number, plants: PhaseContext['plants']): number | undefined {
    let bestIdx: number | undefined;
    let bestDist: number = PLANT.hitRadius;
    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i]!;
      const dist = Math.abs(plant.x - dropletX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private cleanup(scene: Phaser.Scene): void {
    // Remove event listeners
    this.handlers.forEach(({ type, handler }) => {
      window.removeEventListener(type, handler);
    });
    this.handlers = [];

    // Stop tween
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }

    // Remove pointer listeners
    scene.input.off('pointerdown');
    scene.input.off('pointermove');
    scene.input.off('pointerup');
  }

  stop(): void {
    // Always clean up: when the phase is interrupted (e.g. by the reset button) the fall
    // tween may still be running, and its onComplete would otherwise drive the game into
    // the Landing phase after the reset. Cleanup is idempotent, so calling it again after
    // a normal landing is harmless.
    this.fallPending = false;
    if (this.sceneRef) this.cleanup(this.sceneRef);
    this.sceneRef = null;
  }
}

