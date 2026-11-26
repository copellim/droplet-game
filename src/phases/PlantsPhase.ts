import Phaser from 'phaser';
import type { Plant } from '../objects/Plant.js';
import { returnToSea } from '../phases/phaseHelpers.js';
import { PhaseContext } from '../scenes/GameScene.js';
import { vibrate } from '../utils/haptics.js';

export class PlantsPhase {
  /**
   * Growth levels per plant: -1=hidden (never hit), 0=seed, 1=sprout, 2=grown.
   * Persists across loops; resets only on full session reset.
   */
  private growthLevels: number[] = [-1, -1, -1];
  private activePlantRef: Plant | null = null;
  private activeTween: Phaser.Tweens.Tween | null = null;

  start(ctx: PhaseContext): void {
    const { plants, droplet, phaseText } = ctx;
    const hitIdx = ctx.payload.hitPlantIndex;

    phaseText.show('La pianta beve…');
    droplet.setVisible(false);
    ctx.tutorialOverlay.dismiss();

    if (hitIdx === undefined) {
      this.reset(ctx);
      return;
    }

    const currentLevel = this.growthLevels[hitIdx] ?? -1;
    const targetPlant = plants[hitIdx]!;
    this.handlePlantGrowth(targetPlant, currentLevel, hitIdx, ctx);
  }

  private handlePlantGrowth(plant: Plant, currentLevel: number, plantIndex: number, ctx: PhaseContext): void {
    if (currentLevel === -1) {
      this.revealAsSeed(plant, plantIndex, ctx);
    } else if (currentLevel < 2) {
      this.waitForTapToGrow(plant, currentLevel, plantIndex, ctx);
    } else {
      this.bounceAndComplete(plant, ctx);
    }
  }

  private revealAsSeed(plant: Plant, plantIndex: number, ctx: PhaseContext): void {
    this.growthLevels[plantIndex] = 0;
    plant.setGrowthLevel(0);
    plant.setVisible(true);
    this.bounceAndComplete(plant, ctx);
  }

  private waitForTapToGrow(plant: Plant, currentLevel: number, plantIndex: number, ctx: PhaseContext): void {
    this.activePlantRef = plant;
    plant.startBreathing();
    ctx.tutorialOverlay.showIfFirst('tap', plant.x, plant.y);
    plant.enableTap(() => {
      vibrate();
      ctx.audioManager.playSfx('tap');
      ctx.tutorialOverlay.dismiss();
      plant.stopBreathing();
      plant.disableTap();
      this.activePlantRef = null;
      const newLevel = (currentLevel + 1) as 0 | 1 | 2;
      this.growthLevels[plantIndex] = newLevel;
      plant.setGrowthLevel(newLevel);
      if (newLevel === 2) {
        this.burstAndComplete(plant, ctx);
      } else {
        this.bounceAndComplete(plant, ctx);
      }
    });
  }

  private burstAndComplete(plant: Plant, ctx: PhaseContext): void {
    ctx.audioManager.playSfx('plant-grow');
    this.activeTween = ctx.scene.tweens.add({
      targets: plant,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 175,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.completePhase(ctx),
    });
  }

  private bounceAndComplete(plant: Plant, ctx: PhaseContext): void {
    ctx.audioManager.playSfx('plant-grow');
    this.activeTween = ctx.scene.tweens.add({
      targets: plant,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 130,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.completePhase(ctx),
    });
  }

  private completePhase(ctx: PhaseContext): void {
    this.activeTween = null;
    ctx.scene.time.delayedCall(300, () => this.reset(ctx));
  }

  private reset(ctx: PhaseContext): void {
    returnToSea(ctx);
  }

  stop(): void {
    this.activePlantRef?.stopBreathing();
    this.activePlantRef?.disableTap();
    this.activePlantRef = null;
    this.activeTween?.stop();
    this.activeTween = null;
  }

  resetGrowthLevels(): void {
    this.growthLevels = [-1, -1, -1];
  }
}

