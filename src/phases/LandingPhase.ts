import Phaser from 'phaser';
import { resetSceneForNextCycle } from '../phases/phaseHelpers.js';
import { GamePhase } from '../phases/PhaseManager.js';
import { PhaseContext } from '../scenes/GameScene.js';

export class LandingPhase {
  private tween: Phaser.Tweens.Tween | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  start(ctx: PhaseContext): void {
    this.runGroundPath(ctx);
  }

  /** Stops the pending absorb animation and delay so an interrupted landing cannot transition later. */
  stop(): void {
    this.tween?.stop();
    this.tween = null;
    this.timer?.remove(false);
    this.timer = null;
  }

  private runGroundPath(ctx: PhaseContext): void {
    const { droplet, scene, phaseText } = ctx;

    phaseText.show('La terra assorbe…');

    this.tween = scene.tweens.add({
      targets: droplet,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 700,
      ease: 'Linear',
      onComplete: () => {
        this.tween = null;
        this.timer = scene.time.delayedCall(800, () => {
          this.timer = null;
          this.reset(ctx);
        });
      },
    });
  }

  private reset(ctx: PhaseContext): void {
    resetSceneForNextCycle(ctx);
    const { phaseManager, payload } = ctx;

    if (payload.hitPlantIndex !== undefined) {
      phaseManager.transition(GamePhase.Plants, { hitPlantIndex: payload.hitPlantIndex });
    } else {
      phaseManager.transition(GamePhase.Sea);
    }
  }
}

