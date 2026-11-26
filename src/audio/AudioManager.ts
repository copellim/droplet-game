import Phaser from 'phaser';

/** Keys for one-shot sound effects. */
export type SfxKey = 'evaporation' | 'rain' | 'splash' | 'plant-grow' | 'tap' | 'drag';

const AMBIENT_KEY = 'ambient';
const AMBIENT_VOLUME = 0.3;
const SFX_VOLUME = 0.65;

const SFX_KEY_MAP: Record<SfxKey, string> = {
  evaporation: 'sfx-evaporation',
  rain: 'sfx-rain',
  splash: 'sfx-splash',
  'plant-grow': 'sfx-plant-grow',
  tap: 'sfx-tap',
  drag: 'sfx-drag',
};

/**
 * Manages ambient music and phase SFX.
 * All public methods fail silently when assets are missing or the browser
 * blocks audio, so the game is never blocked by audio issues.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  private scene: Phaser.Scene | null = null;
  private ambientSound: Phaser.Sound.BaseSound | null = null;

  private constructor() {}

  static get instance(): AudioManager {
    if (!AudioManager._instance) AudioManager._instance = new AudioManager();
    return AudioManager._instance;
  }

  /** Register all audio assets with the Phaser loader. Call from GameScene.preload(). */
  static preload(scene: Phaser.Scene): void {
    scene.load.audio(AMBIENT_KEY, 'assets/audio/ambient-loop.wav');
    scene.load.audio('sfx-evaporation', 'assets/audio/sfx-evaporation.wav');
    scene.load.audio('sfx-rain', 'assets/audio/sfx-rain.wav');
    scene.load.audio('sfx-splash', 'assets/audio/sfx-splash.wav');
    scene.load.audio('sfx-plant-grow', 'assets/audio/sfx-plant-grow.wav');
    scene.load.audio('sfx-tap', 'assets/audio/sfx-tap.wav');
    scene.load.audio('sfx-drag', 'assets/audio/sfx-drag.wav');
  }

  /** Bind the active Phaser scene and start ambient music. Call from GameScene.create(). */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.startAmbient();
  }

  private startAmbient(): void {
    if (!this.scene) return;
    if (!this.scene.cache.audio.has(AMBIENT_KEY)) return;
    if (this.ambientSound) return;
    try {
      this.ambientSound = this.scene.sound.add(AMBIENT_KEY, {
        loop: true,
        volume: AMBIENT_VOLUME,
      });
      this.ambientSound.play();
    } catch (e) {
      // Audio context locked or unavailable; game continues without music.
    }
  }

  /** Play a one-shot sound effect. Silently skips if the asset is missing. */
  playSfx(key: SfxKey): void {
    if (!this.scene) return;
    const audioKey = SFX_KEY_MAP[key];
    if (!this.scene.cache.audio.has(audioKey)) return;
    try {
      this.scene.sound.play(audioKey, { volume: SFX_VOLUME });
    } catch (e) {
      // Ignore playback errors — game continues normally.
    }
  }
}

