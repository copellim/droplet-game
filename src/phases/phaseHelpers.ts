import type { PhaseContext } from '../scenes/GameScene.js';
import { GamePhase } from './PhaseManager.js';

export function resetSceneForNextCycle(ctx: PhaseContext): void {
  ctx.droplet.resetToSerene();
  ctx.sun.reset();
  ctx.cloud.reset();
}

export function returnToSea(ctx: PhaseContext): void {
  resetSceneForNextCycle(ctx);
  ctx.droplet.setVisible(true);
  ctx.phaseManager.transition(GamePhase.Sea);
}
