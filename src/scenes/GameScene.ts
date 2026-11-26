import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager.js';
import { PHASE_TEXTS, PLANT } from '../config.js';
import { MicrophoneInput } from '../input/MicrophoneInput.js';
import { Background } from '../objects/Background.js';
import { Cloud } from '../objects/Cloud.js';
import { Droplet } from '../objects/Droplet.js';
import { Plant } from '../objects/Plant.js';
import { Sun } from '../objects/Sun.js';
import { CloudPhase } from '../phases/CloudPhase.js';
import { EvaporationPhase } from '../phases/EvaporationPhase.js';
import { LandingPhase } from '../phases/LandingPhase.js';
import { returnToSea } from '../phases/phaseHelpers.js';
import type { PhasePayload } from '../phases/PhaseManager.js';
import { GamePhase, PhaseManager } from '../phases/PhaseManager.js';
import { PlantsPhase } from '../phases/PlantsPhase.js';
import { RainPhase } from '../phases/RainPhase.js';
import { SeaPhase } from '../phases/SeaPhase.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { PhaseText } from '../ui/PhaseText.js';
import { ResetButton } from '../ui/ResetButton.js';
import { TutorialOverlay } from '../ui/TutorialOverlay.js';

/** Shared context passed to every phase. */
export interface PhaseContext {
  scene: GameScene;
  background: Background;
  droplet: Droplet;
  sun: Sun;
  cloud: Cloud;
  plants: Plant[];
  phaseText: PhaseText;
  phaseManager: PhaseManager;
  microphoneInput: MicrophoneInput;
  tutorialOverlay: TutorialOverlay;
  audioManager: AudioManager;
  payload: PhasePayload;
}

/** Interface satisfied by every phase class. */
export interface IPhase {
  start(ctx: PhaseContext): void;
  stop?(): void;
  update?(ctx: PhaseContext): void;
}

export class GameScene extends Phaser.Scene {
  private background!: Background;
  private droplet!: Droplet;
  private sun!: Sun;
  private cloud!: Cloud;
  private plants!: Plant[];
  private phaseText!: PhaseText;
  private phaseManager!: PhaseManager;
  private phaseRegistry!: Map<GamePhase, IPhase>;
  private seaPhase!: SeaPhase;
  private evaporationPhase!: EvaporationPhase;
  private cloudPhase!: CloudPhase;
  private rainPhase!: RainPhase;
  private landingPhase!: LandingPhase;
  private plantsPhase!: PlantsPhase;
  private tutorialOverlay!: TutorialOverlay;
  /** Sensor debug panel; only created in dev builds so players never see the DBG button. */
  private debugOverlay: DebugOverlay | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('background', 'assets/background.png');
    this.load.image('sun', 'assets/sun.png');
    this.load.atlas('cloud', 'assets/cloud-spritesheet.png', 'assets/cloud-atlas.json');
    this.load.atlas('droplet', 'assets/droplet-spritesheet.png', 'assets/droplet-atlas.json');
    this.load.atlas('plant', 'assets/plant-spritesheet.png', 'assets/plant-atlas.json');
    AudioManager.preload(this);
  }

  create(): void {
    this.createSceneObjects();
    this.createPhaseInstances();
    this.phaseManager = new PhaseManager();
    this.phaseRegistry = this.buildPhaseRegistry();
    this.tutorialOverlay = new TutorialOverlay(this);

    this.phaseManager.onTransition = (prev, next, payload) => this.handleTransition(prev, next, payload);
    this.phaseManager.transition(GamePhase.Sea);

    new ResetButton(this, () => this.resetSession());
    if (import.meta.env.DEV) {
      this.debugOverlay = new DebugOverlay(this);
    }
    this.startServices();
  }

  override update(): void {
    MicrophoneInput.instance.update();
    this.debugOverlay?.update(
      MicrophoneInput.instance.volume,
      MicrophoneInput.instance.isBlowing,
      MicrophoneInput.instance.blowLowAvg,
      MicrophoneInput.instance.blowRatio,
    );
    const ctx = this.buildContext();
    this.phaseRegistry.get(this.phaseManager.currentPhase)?.update?.(ctx);
  }

  public resetSession(): void {
    this.stopPhase(this.phaseManager.currentPhase);
    this.time.removeAllEvents();
    this.plantsPhase.resetGrowthLevels();
    this.plants.forEach((p) => p.setVisible(false));
    returnToSea(this.buildContext());
  }

  private createSceneObjects(): void {
    this.background = new Background(this);
    this.droplet = new Droplet(this);
    this.sun = new Sun(this);
    this.cloud = new Cloud(this);
    this.plants = PLANT.positions.map((pos) => {
      const p = new Plant(this, pos.x, pos.y);
      p.setVisible(false);
      return p;
    });
    this.phaseText = new PhaseText(this);
  }

  private createPhaseInstances(): void {
    this.seaPhase = new SeaPhase();
    this.evaporationPhase = new EvaporationPhase();
    this.cloudPhase = new CloudPhase();
    this.rainPhase = new RainPhase();
    this.landingPhase = new LandingPhase();
    this.plantsPhase = new PlantsPhase();
  }

  private buildPhaseRegistry(): Map<GamePhase, IPhase> {
    return new Map<GamePhase, IPhase>([
      [GamePhase.Sea, this.seaPhase],
      [GamePhase.Evaporation, this.evaporationPhase],
      [GamePhase.Cloud, this.cloudPhase],
      [GamePhase.Rain, this.rainPhase],
      [GamePhase.Landing, this.landingPhase],
      [GamePhase.Plants, this.plantsPhase],
    ]);
  }

  private startServices(): void {
    void MicrophoneInput.instance.start();
    AudioManager.instance.init(this);
  }

  private handleTransition(prev: GamePhase, next: GamePhase, payload?: PhasePayload): void {
    this.stopPhase(prev);
    this.phaseText.show(PHASE_TEXTS[next] ?? '');
    const ctx = this.buildContext(payload);
    this.phaseRegistry.get(next)?.start(ctx);
  }

  private stopPhase(phase: GamePhase): void {
    this.phaseRegistry.get(phase)?.stop?.();
  }

  private buildContext(payload?: PhasePayload): PhaseContext {
    return {
      scene: this,
      background: this.background,
      droplet: this.droplet,
      sun: this.sun,
      cloud: this.cloud,
      plants: this.plants,
      phaseText: this.phaseText,
      phaseManager: this.phaseManager,
      microphoneInput: MicrophoneInput.instance,
      tutorialOverlay: this.tutorialOverlay,
      audioManager: AudioManager.instance,
      payload: payload ?? {},
    };
  }
}

