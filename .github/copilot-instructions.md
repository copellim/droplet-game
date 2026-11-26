# Instructions for coding agents and contributors — Droplet Game

This file guides every future contribution to the project. Read it in full before proposing changes.

---

## Project identity

**Droplet Game** ("Goccia") is a cozy educational game for children aged 4–6. The child accompanies a little water droplet through the water cycle: sea → evaporation → cloud → rain → landing → plants → (starts again).

There is no score, no competition and no gamification. It is closer to an **interactive picture book** than to a traditional video game.

### Player fantasy

The child **does not control** the droplet: the child **is** the droplet. Every mechanic must reinforce this identification: blow to rise, tilt to slide, tap gently to make things grow. The droplet shows emotions (kawaii faces) that mirror the narrative moment, not a score.

### The 5 design pillars (non-negotiable constraints)

1. **Playing is understanding**: visual transformations convey the physics; no textual explanations are needed.
2. **No pressure**: no fail state, no punishing timers, no game over. The cycle always moves forward.
3. **The world responds kindly**: every interaction produces a pleasant reaction (soft audio, light animation, gentle vibration).
4. **The cycle is the content**: the water cycle is not the backdrop of the story; it *is* the story.
5. **More picture book than video game**: slow pace, intentional pauses, contemplative atmosphere.

---

## Architecture and technical conventions

### Stack

- **Phaser 3** (v3.88+): rendering and input engine
- **TypeScript** (strict): all code must be typed
- **Vite**: dev server and build
- **Native Web Audio API**: used through `AudioManager` (Phaser sound) and `MicrophoneInput`
- **Canvas**: 390×844 px, portrait, mobile-first

### Folder structure

```
src/
├── audio/          AudioManager: ambient music and SFX
├── config.ts       Global constants: canvas size, zone coordinates, thresholds, captions
├── game.ts         Phaser configuration (size, physics, scenes)
├── input/
│   ├── BlowDetector.ts       FFT-based blow detection used by MicrophoneInput
│   ├── MicrophoneInput.ts    Microphone access, RMS volume, blow detection
│   └── PermissionManager.ts  Permission requests (microphone, orientation, motion)
├── main.ts         Entry point
├── objects/        Reusable scene objects (Droplet, Sun, Cloud, Plant, Background)
├── phases/         One class per cycle phase; PhaseManager handles transitions
├── scenes/
│   ├── GameScene.ts   Main scene: creates everything, runs the update loop
│   └── TitleScene.ts  Start screen
├── ui/
│   ├── TutorialOverlay.ts  Gesture hint overlay (shown only the first time)
│   ├── PhaseText.ts        Short guiding caption
│   ├── ResetButton.ts      Session reset button
│   └── DebugOverlay.ts     Sensor debug panel (its toggle button is currently always visible)
└── utils/
    ├── breathing.ts  Idle "breathing" tween helpers
    └── haptics.ts    Cross-platform haptic vibration
```

### Pattern for adding a new phase

Use `PlantsPhase.ts` or `CloudPhase.ts` as a reference. Phases satisfy the `IPhase` interface declared in `src/scenes/GameScene.ts`.

1. Create `src/phases/PhaseName.ts`:

```typescript
import type { PhaseContext } from '../scenes/GameScene.js';

export class PhaseName {
  start(ctx: PhaseContext): void {
    // 1. Position scene objects
    // 2. Initial quiet moment ~2-3 s (use ctx.scene.time.delayedCall)
    // 3. After the quiet moment: show the hint (ctx.tutorialOverlay.showIfFirst)
    // 4. Enable input
  }

  update(ctx: PhaseContext): void {
    // Called every frame by GameScene.update()
    // Update continuous state (e.g. microphone reading, custom physics)
  }

  stop(): void {
    // Remove listeners, stop tweens, disable input
  }
}
```

2. Add the phase to the `GamePhase` enum in `src/phases/PhaseManager.ts`.
3. Register an instance in `GameScene.ts` (`createPhaseInstances` and `buildPhaseRegistry`).
4. Add its caption to `PHASE_TEXTS` in `src/config.ts`.
5. Call `ctx.phaseManager.transition(GamePhase.PhaseName)` from the previous phase.

### Pattern for adding new scene objects

Scene objects live in `src/objects/`. They follow this shape (see `Sun.ts` or `Cloud.ts`):

```typescript
export class NewObject {
  private sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(x, y, 'texture-key');
  }

  show(): void { this.sprite.setVisible(true); }
  hide(): void { this.sprite.setVisible(false); }
  destroy(): void { this.sprite.destroy(); }
}
```

### Using AudioManager

```typescript
import { AudioManager } from '../audio/AudioManager.js';

// Preload (in GameScene.preload, already done)
AudioManager.preload(scene);

// Init (in GameScene.create, already done); starts the ambient loop
AudioManager.instance.init(scene);

// In any phase:
ctx.audioManager.playSfx('tap');         // one-shot SFX
ctx.audioManager.playSfx('plant-grow');  // one-shot SFX
// Available keys: 'evaporation' | 'rain' | 'splash' | 'plant-grow' | 'tap' | 'drag'
```

### Using TutorialOverlay

```typescript
// ctx is the PhaseContext passed to start()
const shown = ctx.tutorialOverlay.showIfFirst('drag_down', anchorX, anchorY);
// Available types: 'drag_down' | 'blow' | 'tap' | 'tilt'
// Returns true if it was shown (useful to pause tweens)
// Hides itself after 8 s; phases dismiss it as soon as the right input arrives
// Which types were already shown is stored in localStorage, so each hint appears once per browser

// To close it manually:
ctx.tutorialOverlay.dismiss();

// To know whether it is active:
if (ctx.tutorialOverlay.isActive) { ... }
```

### Using MicrophoneInput

```typescript
// GameScene.update() already calls MicrophoneInput.instance.update()
// In a phase, read the values:
const vol = ctx.microphoneInput.volume;       // RMS 0-1
const blowing = ctx.microphoneInput.isBlowing; // true while the player is blowing
const ok = ctx.microphoneInput.available;      // false when the mic is denied or missing

// isBlowing uses FFT analysis: low band (0-500 Hz) above a threshold AND low/mid ratio above a threshold,
// sustained for 200 ms before becoming true (debounce). Thresholds live in MICROPHONE in config.ts.
```

### Using PermissionManager

```typescript
import { PermissionManager } from '../input/PermissionManager.js';

// Inside a user-input handler (e.g. pointerdown); TitleScene already does this on the first tap:
await PermissionManager.instance.requestAll();
// After this call:
PermissionManager.instance.microphoneGranted  // boolean
PermissionManager.instance.orientationGranted // boolean
PermissionManager.instance.motionGranted      // boolean
```

### TypeScript conventions

- **Class names:** PascalCase (`SeaPhase`, `TutorialOverlay`)
- **File names:** match the class name (`SeaPhase.ts`)
- **Constants:** UPPER_SNAKE_CASE in `config.ts`
- **Interfaces/types:** PascalCase; prefer `interface` for data objects
- **Exports:** named exports for classes; default exports are not used
- **Imports:** relative imports use the `.js` extension (ES modules)
- **`strict: true`** in `tsconfig.json`: no implicit `any`, no unnecessary `!`
- Use `ctx.scene.time.delayedCall(ms, callback)` for delays inside phases

### Canvas: reference coordinates (from config.ts)

```
CANVAS_WIDTH  = 390
CANVAS_HEIGHT = 844

ZONES.seaSurface  = 640   // y of the droplet on the sea
ZONES.cloudY      = 140   // y of the cloud
ZONES.cloudX      = 195   // x of the cloud (canvas centre)
ZONES.groundLevel = 820   // y of the ground
ZONES.terrainTop  = 380   // y where the terrain starts
ZONES.streamEnd   = { x: 30, y: 460 }  // stream exit point (for the planned Stream phase)
```

---

## UX and design rules for any new feature

### Required structure of a phase

These rules apply to new work; the existing phases do not all follow them yet (for example, none has the initial quiet moment).

1. **Initial quiet moment (~2–3 s)**: objects settle and the scene stabilises. No input is active during this interval. Use `scene.time.delayedCall(2500, ...)`.
2. **Required act of care**: every phase has a "care" interaction without which the cycle does not advance (for example watering the plant or tapping the cloud). It is not optional, but it never penalises children who take longer.
3. **Exit transition**: never a hard cut. Always use a fade, dissolve or scale tween to move to the next phase.

### Gesture hints

- A hint appears **only the first time** a gesture is needed (use `TutorialOverlay.showIfFirst`).
- It does not block interaction: it is drawn on top but is not modal (pointer events pass through).
- It hides itself after 8 s.

### Reactive scene elements (optional)

The child can tap decorative elements (a little fish, a floating leaf, a frog) to get a small visual and audio reaction. These elements:
- Never block progress
- Respond with soft animations (scale tween 1.0→1.2→1.0, 200 ms)
- Play a short, gentle SFX

### Text and language

- The in-game text is currently Italian.
- **No instructional text**: only animated icons (TutorialOverlay) and very short guiding captions (PhaseText).
- Captions: **at most 5–6 words**, subject + verb + object structure.
- A five-year-old's vocabulary. Good examples: *"Soffia sulla nuvola"* ("Blow on the cloud"), *"Tocca la pianta"* ("Tap the plant"), *"Scendi con la goccia"* ("Go down with the droplet").
- Bad examples: *"Trascina verso il basso per evaporare"* ("Drag down to evaporate"), *"Raggiungi il suolo per completare la fase"* ("Reach the ground to complete the phase").

### Transitions between phases

```typescript
// Correct pattern
ctx.scene.cameras.main.fadeOut(600, 0, 0, 0);
ctx.scene.cameras.main.once('camerafadeoutcomplete', () => {
  ctx.phaseManager.transition(GamePhase.NextPhase);
});

// Or a tween on the alpha of a white/black overlay
```

---

## Mechanics never to introduce

This list is a non-negotiable constraint. A proposal that includes any of these mechanics must be rejected or rewritten.

| Forbidden mechanic | Why |
|--------------------|-----|
| Scores or leaderboards | Create competition and anxiety |
| Lives or game over | Create frustration; violate "no pressure" |
| Punishing timers | Create stress; incompatible with a cozy pace |
| Compulsive collectibles | Manipulative gamification |
| Combat or competition | Outside the narrative scope |
| Frustrating input precision | The child must always feel capable |
| Noisy or intrusive UI | Distracts from the contemplative experience |
| Intrusive system pop-ups | Use PermissionManager to ask for permissions once, on the first tap |

---

## Asset rules

### Visual style

- **Soft kawaii**: round shapes, no sharp corners
- **Pastel**: desaturated, warm colours; avoid neon or fully saturated colours
- **No hard shadows**: only soft shadows or very light gradients
- **No aggressive outlines**: thin outline (1–2 px) or none
- **Picture-book style**: not TV cartoon, not pixel art

### Standard sizes

| Category | Size |
|----------|------|
| Background | 390×844 px |
| Droplet sprite | max 120×140 px |
| Tutorial icons | 128×128 px (transparent background) |
| Phase icons (end-of-session screen) | 64×64 px (transparent background) |
| Sprite sheets | uniform frames, described in an atlas JSON |

### Asset provenance

**Every new asset must have its origin and license documented in the Assets section of `README.md`** before it is integrated into the game: who or what made it (for AI-generated assets, the tool and the prompt), and under which terms it can be redistributed. Third-party assets with an unknown license must not be added.

### Audio

- **No abrupt or aggressive sounds**: no sudden cuts, no alarms, no hard percussion
- **Relaxing and aquatic**: prefer soft synth pads, gentle string instruments, natural water sounds
- **Ambient loop**: must loop without audible seams
- **Short SFX**: 0.5–2 s, with a soft fade-out

---

## Checklist before opening a PR

- [ ] The feature respects all 5 design pillars
- [ ] The phase has the initial quiet moment (~2–3 s)
- [ ] The phase has a required act of care
- [ ] Transitions use tweens/fades (no hard cut)
- [ ] The hint appears only the first time (`showIfFirst`)
- [ ] No long instructional text: captions of at most 5–6 words
- [ ] None of the forbidden mechanics is present
- [ ] New assets have their origin and license documented in `README.md`
- [ ] TypeScript code is typed (no implicit `any`)
- [ ] `npm run typecheck` passes without errors
