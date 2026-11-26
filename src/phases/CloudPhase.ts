import { CLOUD, ZONES } from '../config.js';
import { Cloud } from '../objects/Cloud.js';
import { GamePhase } from '../phases/PhaseManager.js';
import { PhaseContext } from '../scenes/GameScene.js';
import { vibrate } from '../utils/haptics.js';

export class CloudPhase {
  private chargeCount = 0;
  private cloudRef: Cloud | null = null;

  start(context: PhaseContext): void {
    const { droplet, cloud } = context;
    this.chargeCount = 0;
    this.cloudRef = cloud;

    // Hide droplet — it's merged into the cloud
    droplet.setVisible(false);

    // Position and reset cloud
    cloud.setPosition(ZONES.cloudX, ZONES.cloudY);
    cloud.reset();

    // Enable cloud tapping
    cloud.enableTap(() => {
      this.addCharge(context);
    });
    cloud.startBreathing();

    context.tutorialOverlay.showIfFirst('tap', ZONES.cloudX, ZONES.cloudY);
  }

  update(_ctx: PhaseContext): void {
    // Interaction is tap-only; nothing to poll each frame.
  }

  stop(): void {
    this.cloudRef?.stopBreathing();
    this.cloudRef?.disableTap();
  }

  private addCharge(ctx: PhaseContext): void {
    if (this.chargeCount >= CLOUD.tapsRequired) return;

    const { cloud, phaseText, phaseManager, droplet } = ctx;
    this.chargeCount++;
    vibrate();
    ctx.audioManager.playSfx('tap');

    // Dismiss tutorial on first charge
    if (this.chargeCount === 1) ctx.tutorialOverlay.dismiss();

    cloud.setTapCount(this.chargeCount);

    if (this.chargeCount === 2) {
      phaseText.show("Ancora un po'…");
    }

    if (this.chargeCount >= CLOUD.tapsRequired) {
      cloud.stopBreathing();
      cloud.disableTap();

      droplet.setPosition(ZONES.cloudX, ZONES.cloudY);
      droplet.setScale(0.4);
      droplet.setAlpha(0.35);
      droplet.setExpression('Happy');
      droplet.setVisible(true);

      phaseManager.transition(GamePhase.Rain);
    }
  }
}

