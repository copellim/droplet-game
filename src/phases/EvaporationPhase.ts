import Phaser from 'phaser';
import { DROPLET, ZONES } from '../config.js';
import { GamePhase } from '../phases/PhaseManager.js';
import { PhaseContext } from '../scenes/GameScene.js';

/** Precomputed span used to map blow volume to tween timeScale. */
const BLOW_TIME_SCALE_SPAN = DROPLET.blowMaxTimeScale - 1;
/** Precomputed denominator for normalising volume above the blow threshold. */
const BLOW_VOLUME_RANGE = 1 - DROPLET.blowThreshold;

export class EvaporationPhase {
  private tween: Phaser.Tweens.Tween | null = null;
  /** Smoothed timeScale value that lerps toward the target each frame. */
  private currentTimeScale = 1;
  /** True when the tween was paused to wait for the blow tutorial dismissal. */
  private tweenPausedForTutorial = false;

  start(ctx: PhaseContext): void {
    const { droplet, sun, scene, phaseManager, microphoneInput } = ctx;
    this.tweenPausedForTutorial = false;

    // Disable sun interaction
    sun.disableDrag();

    droplet.stopOscillation();
    droplet.setExpression('Surprised');
    ctx.audioManager.playSfx('evaporation');

    // Tween droplet up to cloud position, shrinking and fading
    this.tween = scene.tweens.add({
      targets: droplet,
      y: ZONES.cloudY,
      scaleX: 0.4,
      scaleY: 0.4,
      alpha: 0.35,
      duration: DROPLET.evaporationDuration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        phaseManager.transition(GamePhase.Cloud);
      },
    });

    // When the microphone is available, the tween runs slowly on its own and
    // blowing accelerates it. Start at the idle speed so it drifts upward.
    if (microphoneInput.available) {
      this.currentTimeScale = DROPLET.blowIdleTimeScale;
      this.tween.timeScale = DROPLET.blowIdleTimeScale;
      const isFirst = ctx.tutorialOverlay.showIfFirst('blow', droplet.x, droplet.y);
      if (isFirst) {
        this.tween.pause();
        this.tweenPausedForTutorial = true;
      }
    } else {
      this.currentTimeScale = 1;
      ctx.tutorialOverlay.dismiss();
    }
  }

  update(ctx: PhaseContext): void {
    if (!this.tween || !ctx.microphoneInput.available) return;

    if (ctx.tutorialOverlay.isActive) {
      if (ctx.microphoneInput.isBlowing) ctx.tutorialOverlay.dismiss();
      return;
    }

    if (this.tweenPausedForTutorial) {
      this.tweenPausedForTutorial = false;
      this.tween.resume();
    }

    const targetTimeScale = this.computeBlowTimeScale(ctx.microphoneInput.volume);
    const lerpFactor = Phaser.Math.Clamp(DROPLET.blowTimeScaleDecay * ctx.scene.game.loop.delta, 0, 1);
    this.currentTimeScale += (targetTimeScale - this.currentTimeScale) * lerpFactor;
    this.tween.timeScale = this.currentTimeScale;
  }

  stop(): void {
    this.tweenPausedForTutorial = false;
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
  }

  private computeBlowTimeScale(volume: number): number {
    if (volume >= DROPLET.blowThreshold) {
      const ratio = Phaser.Math.Clamp((volume - DROPLET.blowThreshold) / BLOW_VOLUME_RANGE, 0, 1);
      return 1 + ratio * BLOW_TIME_SCALE_SPAN;
    }
    return DROPLET.blowIdleTimeScale;
  }
}

