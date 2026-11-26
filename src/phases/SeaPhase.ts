import Phaser from 'phaser';
import { SUN, ZONES } from '../config.js';
import { GamePhase } from '../phases/PhaseManager.js';
import { PhaseContext } from '../scenes/GameScene.js';

export class SeaPhase {
  private trembleIntensity = 0;
  private active = false;
  private dragSfxPlayed = false;

  start(ctx: PhaseContext): void {
    this.active = true;
    this.trembleIntensity = 0;
    this.dragSfxPlayed = false;

    const { droplet, sun, scene } = ctx;

    droplet.resetToSerene();
    droplet.setPosition(195, ZONES.seaSurface);
    droplet.setVisible(true);

    sun.reset();
    sun.setDraggable(scene);
    sun.startBreathing();

    ctx.tutorialOverlay.showIfFirst('drag_down', SUN.initialX, SUN.initialY);
  }

  update(ctx: PhaseContext): void {
    if (!this.active) return;

    const { droplet, sun, phaseManager } = ctx;
    const sunY = sun.getY();

    // proximity ratio: how close sun is to evaporation threshold
    const ratio = Phaser.Math.Clamp((sunY - SUN.initialY) / (SUN.evaporationThresholdY - SUN.initialY), 0, 1);

    // Dismiss tutorial and play drag SFX on first sun movement
    if (ratio > 0) {
      ctx.tutorialOverlay.dismiss();
      if (!this.dragSfxPlayed) {
        this.dragSfxPlayed = true;
        ctx.audioManager.playSfx('drag');
      }
    }

    droplet.setAlpha(1 - ratio * 0.6);

    this.trembleIntensity = ratio > 0.3 ? ratio : 0;

    if (this.trembleIntensity > 0) {
      const ox = Phaser.Math.Between(-2, 2) * this.trembleIntensity;
      const oy = Phaser.Math.Between(-2, 2) * this.trembleIntensity;
      droplet.x += ox;
      droplet.y += oy;
    }

    if (sunY >= SUN.evaporationThresholdY) {
      this.active = false;
      phaseManager.transition(GamePhase.Evaporation);
    }
  }

  stop(): void {
    this.active = false;
  }
}

