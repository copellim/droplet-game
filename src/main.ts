import Phaser from "phaser";
import { buildGameConfig } from "./game.js";

const CONTAINER_ID = "game-container";

/** Avvia il gioco Goccia. */
function startGame(): void {
  new Phaser.Game(buildGameConfig(CONTAINER_ID));
}

startGame();
