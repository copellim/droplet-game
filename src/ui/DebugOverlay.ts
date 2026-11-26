import Phaser from 'phaser';
import { MICROPHONE } from '../config.js';
import { PermissionManager } from '../input/PermissionManager.js';

/** Raw orientation snapshot updated every deviceorientation event. */
interface OrientationSnapshot {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

const PANEL_X = 8;
const PANEL_Y = 44;
const PANEL_W = 220;
const PANEL_H = 460;
const DEPTH = 30;
const BTN_LABEL_ON = '● DBG';
const BTN_LABEL_OFF = '○ DBG';

/**
 * Toggle-able debug overlay that shows live sensor data:
 *  - Microphone normalised RMS volume
 *  - DeviceOrientation gamma / beta / alpha
 *
 * Always visible toggle button sits in the top-left corner.
 * Call {@link update} every game frame passing the current mic volume.
 */
export class DebugOverlay {
  private visible = false;

  private toggleBtn: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Rectangle;
  private infoText: Phaser.GameObjects.Text;

  private orientation: OrientationSnapshot = { alpha: null, beta: null, gamma: null };
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private absoluteHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private orientationEventCount = 0;
  private motionEventCount = 0;
  private orientationSource = 'none';
  private accel: { x: number | null; y: number | null; z: number | null } = { x: null, y: null, z: null };
  private accelPerm = 'n/a';
  private gyroPerm = 'n/a';

  constructor(scene: Phaser.Scene) {
    this.toggleBtn = this.createToggleButton(scene);
    this.panel = this.createPanel(scene);
    this.infoText = this.createInfoText(scene);
    this.initOrientationTracking();
    this.initMotionTracking();
    this.queryPermissionStates();
  }

  private createToggleButton(scene: Phaser.Scene): Phaser.GameObjects.Text {
    const btn = scene.add
      .text(8, 8, BTN_LABEL_OFF, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#00000077',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.toggle());
    return btn;
  }

  private createPanel(scene: Phaser.Scene): Phaser.GameObjects.Rectangle {
    return scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(DEPTH - 1)
      .setVisible(false);
  }

  private createInfoText(scene: Phaser.Scene): Phaser.GameObjects.Text {
    return scene.add
      .text(PANEL_X + 10, PANEL_Y + 8, '', {
        fontSize: '12px',
        color: '#00ff88',
        fontFamily: 'monospace',
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH)
      .setVisible(false);
  }

  private initOrientationTracking(): void {
    if (typeof DeviceOrientationEvent === 'undefined') return;

    this.orientationHandler = (e: DeviceOrientationEvent) => {
      this.orientationEventCount++;
      if (e.gamma === null) return;
      if (this.orientationSource === 'absolute') return;
      this.orientationSource = 'relative';
      this.orientation = {
        alpha: e.alpha !== null ? +e.alpha.toFixed(1) : null,
        beta: e.beta !== null ? +e.beta.toFixed(1) : null,
        gamma: +e.gamma.toFixed(1),
      };
    };
    this.absoluteHandler = (e: DeviceOrientationEvent) => {
      this.orientationEventCount++;
      if (e.gamma === null) return;
      this.orientationSource = 'absolute';
      this.orientation = {
        alpha: e.alpha !== null ? +e.alpha.toFixed(1) : null,
        beta: e.beta !== null ? +e.beta.toFixed(1) : null,
        gamma: +e.gamma.toFixed(1),
      };
    };
    window.addEventListener('deviceorientation', this.orientationHandler, { passive: true });
    window.addEventListener('deviceorientationabsolute', this.absoluteHandler as EventListener, { passive: true });
  }

  private initMotionTracking(): void {
    if (typeof DeviceMotionEvent === 'undefined') return;

    this.motionHandler = (e: DeviceMotionEvent) => {
      this.motionEventCount++;
      const ag = e.accelerationIncludingGravity;
      if (!ag) return;
      this.accel = {
        x: ag.x !== null ? +ag.x.toFixed(2) : null,
        y: ag.y !== null ? +ag.y.toFixed(2) : null,
        z: ag.z !== null ? +ag.z.toFixed(2) : null,
      };
      if (this.orientationSource !== 'relative' && this.orientationSource !== 'absolute') {
        if (ag.x !== null && ag.y !== null && ag.z !== null) {
          const derivedGamma = Math.atan2(ag.x, Math.sqrt(ag.y * ag.y + ag.z * ag.z)) * (180 / Math.PI);
          this.orientation = { ...this.orientation, gamma: +derivedGamma.toFixed(1) };
          this.orientationSource = 'motion';
        }
      }
    };
    window.addEventListener('devicemotion', this.motionHandler, { passive: true });
  }

  private queryPermissionStates(): void {
    if (!navigator.permissions) return;
    this.querySensorPermission('accelerometer' as PermissionName, (state) => {
      this.accelPerm = state;
    });
    this.querySensorPermission('gyroscope' as PermissionName, (state) => {
      this.gyroPerm = state;
    });
  }

  private querySensorPermission(name: PermissionName, onUpdate: (state: string) => void): void {
    navigator.permissions
      .query({ name })
      .then((s) => {
        onUpdate(s.state);
        s.onchange = () => onUpdate(s.state);
      })
      .catch(() => onUpdate('err'));
  }

  /**
   * Call every frame from the scene's update loop.
   * @param micVolume Normalised [0,1] RMS from MicrophoneInput.
   * @param isBlowing Whether the frequency-filtered blow detector is active.
   * @param blowLowAvg Average energy of the 0–500 Hz band (0–255), for threshold tuning.
   * @param blowRatio Low/mid band energy ratio, for threshold tuning.
   */
  update(micVolume: number, isBlowing: boolean, blowLowAvg: number, blowRatio: number): void {
    if (!this.visible) return;

    const { alpha, beta, gamma } = this.orientation;
    const { x: ax, y: ay, z: az } = this.accel;
    const bar = this.volumeBar(micVolume);
    const fmt = (v: number | null, unit = '°') => (v === null ? 'n/a' : `${v > 0 ? '+' : ''}${v}${unit}`);
    const fmtA = (v: number | null) => (v === null ? ' n/a' : v.toFixed(1).padStart(6));
    const pm = PermissionManager.instance;
    const protocol = typeof location !== 'undefined' ? location.protocol : '?';

    const lines = [
      `── SISTEMA ──────────────`,
      `proto  ${protocol}`,
      `perm◎  ${pm.orientationGranted ? 'OK' : pm.requested ? 'DENIED' : 'pending'}`,
      `perm⚡  ${pm.motionGranted ? 'OK' : pm.requested ? 'DENIED' : 'pending'}`,
      `perm🎤 ${pm.microphoneGranted ? 'OK' : pm.requested ? 'DENIED' : 'pending'}`,
      `evts◎  ${this.orientationEventCount}  src:${this.orientationSource}`,
      `evts⚡  ${this.motionEventCount}`,
      `accel  ${this.accelPerm}  gyro:${this.gyroPerm}`,
      ``,
      `── SENSORI ──────────────`,
      `MIC    ${bar} ${(micVolume * 100).toFixed(0).padStart(3)}%`,
      `soffio ${isBlowing ? '● SÌ' : '○ no'}`,
      `lowAvg ${blowLowAvg.toFixed(1).padStart(5)}  /255  (≥${MICROPHONE.blowVolumeThreshold})`,
      `ratio  ${blowRatio.toFixed(2).padStart(5)}        (≥${MICROPHONE.blowRatioThreshold})`,
      ``,
      `── ORIENTAMENTO ─────────`,
      `gamma  ${fmt(gamma)}  (←→)`,
      `beta   ${fmt(beta)}  (↑↓)`,
      `alpha  ${fmt(alpha)}  (↺)`,
      ``,
      `── ACCEL (raw) ──────────`,
      `x    ${fmtA(ax)}`,
      `y    ${fmtA(ay)}`,
      `z    ${fmtA(az)}`,
    ];

    this.infoText.setText(lines.join('\n'));
  }

  /** Release the orientation listener (call when the scene is shut down). */
  destroy(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }
    if (this.absoluteHandler) {
      window.removeEventListener('deviceorientationabsolute', this.absoluteHandler as EventListener);
      this.absoluteHandler = null;
    }
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
  }

  // ---------------------------------------------------------------------------

  private toggle(): void {
    this.visible = !this.visible;
    this.panel.setVisible(this.visible);
    this.infoText.setVisible(this.visible);
    this.toggleBtn.setText(this.visible ? BTN_LABEL_ON : BTN_LABEL_OFF);
  }

  /** Returns an ASCII volume bar of fixed width. */
  private volumeBar(v: number): string {
    const total = 10;
    const filled = Math.round(Phaser.Math.Clamp(v, 0, 1) * total);
    return '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
  }
}

