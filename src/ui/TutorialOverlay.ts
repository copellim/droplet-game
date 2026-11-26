import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../config.js';

export type TutorialType = 'drag_down' | 'blow' | 'tap' | 'tilt';

const AUTO_HIDE_MS = 8000;

/**
 * Reusable full-screen tutorial overlay that:
 *  - Draws a semi-transparent backdrop over the whole canvas (non-interactive,
 *    so pointer events still reach game objects below).
 *  - Renders a procedural gesture animation anchored near the target element.
 *  - Shows each TutorialType at most once per session (static Set).
 *  - Auto-dismisses after AUTO_HIDE_MS; phases can also call dismiss() as
 *    soon as the correct input is detected.
 */
const LS_KEY = 'goccia:tutorial_seen';

export class TutorialOverlay {
  /** Types already shown — loaded from localStorage, persisted on first show. */
  private static _seen: Set<TutorialType> | null = null;

  private static loadSeen(): Set<TutorialType> {
    if (TutorialOverlay._seen) return TutorialOverlay._seen;
    try {
      const raw = localStorage.getItem(LS_KEY) ?? '';
      TutorialOverlay._seen = new Set(raw.length ? (raw.split(',') as TutorialType[]) : []);
    } catch {
      TutorialOverlay._seen = new Set();
    }
    return TutorialOverlay._seen;
  }

  private static persistSeen(): void {
    try {
      localStorage.setItem(LS_KEY, [...TutorialOverlay._seen!].join(','));
    } catch {
      // localStorage unavailable (private browsing, storage full) — ignore.
    }
  }

  private readonly scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private alive = false;
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private activeTimers: Phaser.Time.TimerEvent[] = [];

  get isActive(): boolean {
    return this.alive;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show tutorial for `type` at the given anchor (world coordinates of the
   * target element) only if not yet shown this session.
   * Returns true when the overlay was actually shown so callers can pause
   * auto-progressing tweens; false when already seen.
   */
  showIfFirst(type: TutorialType, anchorX: number, anchorY: number): boolean {
    this.dismiss();
    const seen = TutorialOverlay.loadSeen();
    if (seen.has(type)) return false;
    seen.add(type);
    TutorialOverlay.persistSeen();
    this.show(type, anchorX, anchorY);
    return true;
  }

  /** Fade-out and destroy. Safe to call when nothing is shown. */
  dismiss(): void {
    if (!this.alive && !this.backdrop && !this.container) return;
    this.alive = false;
    this.clearTweens();
    this.clearTimers();

    const targets: Phaser.GameObjects.GameObject[] = [];
    if (this.backdrop) targets.push(this.backdrop);
    if (this.container) targets.push(this.container);
    this.backdrop = null;
    this.container = null;

    if (targets.length === 0) return;

    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => targets.forEach((g) => g.destroy()),
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private show(type: TutorialType, anchorX: number, anchorY: number): void {
    this.alive = true;

    // Full-screen backdrop — not interactive, so pointer events pass through.
    this.backdrop = this.scene.add.graphics().setDepth(50).setAlpha(0);
    this.backdrop.fillStyle(0x000000, 0.5);
    this.backdrop.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clamp anchor so the gesture stays fully visible.
    const ax = Phaser.Math.Clamp(anchorX, 72, CANVAS_WIDTH - 72);
    const ay = Phaser.Math.Clamp(anchorY, 72, CANVAS_HEIGHT - 110);

    this.container = this.scene.add.container(ax, ay).setDepth(51).setAlpha(0);

    // Soft radial glow behind the gesture.
    const glow = this.scene.add.graphics();
    glow.fillStyle(0xffffff, 0.05);
    glow.fillCircle(0, 0, 80);
    glow.fillStyle(0xffffff, 0.09);
    glow.fillCircle(0, 0, 56);
    glow.fillStyle(0xffffff, 0.14);
    glow.fillCircle(0, 0, 36);
    this.container.add(glow);

    switch (type) {
      case 'drag_down':
        this.buildDragDown();
        break;
      case 'blow':
        this.buildBlow();
        break;
      case 'tap':
        this.buildTap();
        break;
      case 'tilt':
        this.buildTilt();
        break;
    }

    const fadeIn = this.scene.tweens.add({
      targets: [this.backdrop, this.container],
      alpha: 1,
      duration: 400,
      ease: 'Linear',
    });
    this.activeTweens.push(fadeIn);

    const autoHide = this.scene.time.delayedCall(AUTO_HIDE_MS, () => this.dismiss());
    this.activeTimers.push(autoHide);
  }

  /** Finger pressing on the element and sliding downward, then snapping back. */
  private buildDragDown(): void {
    const c = this.container!;

    const finger = this.scene.add.graphics();
    finger.fillStyle(0xffffff, 0.96);
    finger.fillCircle(0, 0, 16);
    finger.lineStyle(2.5, 0x8899aa, 0.7);
    finger.strokeCircle(0, 0, 16);

    const arrow = this.scene.add.graphics();
    arrow.fillStyle(0xffffff, 0.72);
    arrow.fillTriangle(-11, 8, 11, 8, 0, 26);
    arrow.lineStyle(3, 0xffffff, 0.72);
    arrow.beginPath();
    arrow.moveTo(0, -8);
    arrow.lineTo(0, 8);
    arrow.strokePath();

    finger.setY(-28);
    arrow.setY(-28);
    c.add([arrow, finger]);

    const t = this.scene.tweens.add({
      targets: [finger, arrow],
      y: 16,
      duration: 660,
      ease: 'Sine.easeInOut',
      hold: 180,
      repeatDelay: 520,
      repeat: -1,
    });
    this.activeTweens.push(t);
  }

  /** Lips + expanding arcs simulating a blow. */
  private buildBlow(): void {
    const c = this.container!;

    const mouth = this.scene.add.graphics();
    mouth.fillStyle(0xffffff, 0.92);
    mouth.fillEllipse(-30, 0, 22, 15);
    c.add(mouth);

    // Gentle pulsing of the mouth
    const pulse = this.scene.tweens.add({
      targets: mouth,
      scaleX: 1.18,
      scaleY: 0.82,
      duration: 320,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.activeTweens.push(pulse);

    const spawnArcs = () => {
      if (!this.alive) return;
      [0, 1, 2].forEach((i) => {
        const g = this.scene.add.graphics();
        c.add(g);
        const state = { r: 10 + i * 3, a: 0.85 };
        const t = this.scene.tweens.add({
          targets: state,
          r: 40 + i * 14,
          a: 0,
          duration: 560,
          delay: i * 175,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            if (!g.active) return;
            g.clear();
            g.lineStyle(3, 0xffffff, state.a);
            g.beginPath();
            g.arc(-10, 0, state.r, -Math.PI * 0.55, Math.PI * 0.55);
            g.strokePath();
          },
          onComplete: () => g.destroy(),
        });
        this.activeTweens.push(t);
      });
      const timer = this.scene.time.delayedCall(1320, spawnArcs);
      this.activeTimers.push(timer);
    };

    spawnArcs();
  }

  /** Finger descending from above and tapping with a ripple ring. */
  private buildTap(): void {
    const c = this.container!;

    const ripple = this.scene.add.graphics();
    c.add(ripple);

    const finger = this.scene.add.graphics();
    finger.fillStyle(0xffffff, 0.97);
    finger.fillCircle(0, 0, 14);
    finger.lineStyle(2.5, 0x8899aa, 0.7);
    finger.strokeCircle(0, 0, 14);
    finger.setY(-46);
    c.add(finger);

    const doTap = () => {
      if (!this.alive) return;

      const t1 = this.scene.tweens.add({
        targets: finger,
        y: 0,
        duration: 165,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (!this.alive) return;

          const state = { r: 14, a: 0.7 };
          const t2 = this.scene.tweens.add({
            targets: state,
            r: 40,
            a: 0,
            duration: 400,
            ease: 'Quad.easeOut',
            onUpdate: () => {
              ripple.clear();
              ripple.lineStyle(2.5, 0xffffff, state.a);
              ripple.strokeCircle(0, 0, state.r);
            },
            onComplete: () => ripple.clear(),
          });
          this.activeTweens.push(t2);

          const t3 = this.scene.tweens.add({
            targets: finger,
            y: -46,
            duration: 250,
            delay: 110,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (!this.alive) return;
              const timer = this.scene.time.delayedCall(720, doTap);
              this.activeTimers.push(timer);
            },
          });
          this.activeTweens.push(t3);
        },
      });
      this.activeTweens.push(t1);
    };

    doTap();
  }

  /** Phone outline rocking left and right. */
  private buildTilt(): void {
    const c = this.container!;

    const phone = this.scene.add.graphics();
    phone.fillStyle(0xffffff, 0.18);
    phone.fillRoundedRect(-17, -34, 34, 64, 7);
    phone.lineStyle(3.5, 0xffffff, 0.92);
    phone.strokeRoundedRect(-17, -34, 34, 64, 7);
    phone.lineStyle(2, 0xffffff, 0.7);
    phone.strokeCircle(0, 22, 5);
    c.add(phone);

    const arrows = this.scene.add.graphics();
    arrows.fillStyle(0xffffff, 0.62);
    arrows.fillTriangle(-54, 0, -40, -12, -40, 12);
    arrows.fillTriangle(54, 0, 40, -12, 40, 12);
    c.add(arrows);

    const tiltSeq = (dir: 1 | -1) => {
      if (!this.alive) return;
      const t = this.scene.tweens.add({
        targets: phone,
        angle: dir * 26,
        duration: 560,
        ease: 'Sine.easeInOut',
        yoyo: true,
        hold: 220,
        onComplete: () => tiltSeq(-dir as 1 | -1),
      });
      this.activeTweens.push(t);
    };

    tiltSeq(-1);
  }

  private clearTweens(): void {
    this.activeTweens.forEach((t) => t.stop());
    this.activeTweens = [];
  }

  private clearTimers(): void {
    this.activeTimers.forEach((t) => t.remove());
    this.activeTimers = [];
  }
}

