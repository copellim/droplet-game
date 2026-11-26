import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS } from './config.js';
import { GameScene } from './scenes/GameScene.js';
import { TitleScene } from './scenes/TitleScene.js';

/** Restituisce la configurazione Phaser per il gioco Goccia. */
export function buildGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    // Use Canvas renderer: the game only uses Phaser Graphics (no sprites/textures),
    // so Canvas is sufficient and avoids all WebGL texture-upload warnings.
    type: Phaser.CANVAS,
    parent,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.ScaleModes.FIT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [TitleScene, GameScene],
  };
}

