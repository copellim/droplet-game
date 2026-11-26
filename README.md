# Goccia (droplet-game)

A calm educational web game for young children. You follow a small water droplet
through the water cycle: the sun warms the sea, the droplet evaporates into a cloud,
falls as rain, soaks into the ground and helps a plant grow, then the cycle starts
again. There is no score, no timer and no way to lose.

The in-game text is in **Italian** (for example "Tocca per iniziare", "Il sole scalda
l'acqua…"). There is no language switch yet.

## How to play

The game is designed for a phone held in portrait (390×844 logical canvas, scaled to
fit the screen), but it also works with a mouse on desktop.

1. **Title screen**: tap anywhere to start. This first tap is also when the browser
   asks for microphone and motion-sensor access. Both are optional: if you deny them,
   the game falls back to touch or automatic behaviour.
2. **Sea**: drag the sun downwards towards the droplet. As the sun gets closer the
   droplet fades and trembles; once the sun is low enough, it evaporates.
3. **Evaporation**: the droplet rises towards the sky. If the microphone is available,
   it drifts up slowly on its own and **blowing into the microphone** makes it rise
   faster. Without a microphone it rises on its own in about two seconds.
4. **Cloud**: the droplet merges into the cloud. **Tap the cloud four times**; it
   changes expression and darkens with each tap, and the phone vibrates briefly where
   supported.
5. **Rain**: the droplet falls. Steer it left or right by **tilting the phone** or by
   **pressing on the droplet and dragging it sideways**. Three plant spots sit on the
   ground; landing close to one of them waters it.
6. **Landing**: the droplet soaks into the ground. If it missed every plant, a new
   cycle starts at the sea.
7. **Plants**: the first time a spot is watered a seed appears. On later visits the
   plant gently pulses and waits for you to **tap it**, growing one stage per visit
   (seed, sprout, fully grown with a flower). Growth is kept across cycles until you
   press the reset button or reload the page.

The **↺** button in the top-right corner resets the session (plants disappear, the
cycle restarts at the sea). When running the dev server (`npm run dev`), a **DBG**
button in the top-left corner opens a panel with live microphone and motion-sensor
readings; it is not included in production builds.

Each gesture has a short animated hint that appears the first time it is needed. The
browser remembers which hints were shown (in `localStorage`), so they do not repeat on
later visits.

Ambient music plays in a loop and each action has a soft sound effect.

## Current status

This is a working prototype, not a finished game.

What works today:

- The full loop Sea → Evaporation → Cloud → Rain → Landing → Plants → Sea, repeating
  indefinitely, with the inputs described above and fallbacks when permissions are
  denied.
- Plant growth over several cycles, the session reset, gesture hints, ambient music
  and sound effects.

What is not there yet (see [`.docs/roadmap.md`](.docs/roadmap.md) for the plans):

- **Stream phase**: the step where the water flows back to the sea is planned but not
  implemented. A caption for it exists in `src/config.ts`, but no phase uses it, so
  the loop jumps straight from the plants back to the sea.
- **Animated title screen**: the current title screen is plain text on a sky-blue
  background.
- **End-of-session screen** and **seasonal variants** (for example a winter cycle).
- **Per-phase backgrounds**: a single illustrated background is used for every phase.
- **Blowing on the cloud**: the cloud reacts to taps only.
- **Other languages**: only Italian text is available.
- There are no automated tests.

## Tech stack

- [Phaser 3](https://phaser.io/) (Canvas renderer, Arcade physics configured)
- TypeScript in strict mode
- [Vite](https://vite.dev/) with `@vitejs/plugin-basic-ssl`, so the dev server runs over
  HTTPS; browsers only expose the microphone and motion sensors to secure pages, which
  matters when you open the dev server from a phone on your local network
- Browser APIs only for input: Web Audio and `getUserMedia` for the microphone (with FFT
  analysis for blow detection), `DeviceOrientationEvent` for tilt, the Vibration API for
  haptics

## Running locally

Requires Node.js and npm.

```sh
npm install
npm run dev        # dev server on https://localhost:5173, also exposed on your LAN
npm run typecheck  # TypeScript check without emitting files
npm run build      # typecheck and production build into dist/
npm run preview    # serve the production build locally
```

The dev server uses a self-signed certificate, so the browser shows a warning the
first time; accept it to continue. To try tilt and microphone input, open the LAN
address printed by Vite on your phone.

## Project structure

```
index.html            Page shell (Italian title, game container)
public/assets/        Images, sprite atlases and audio served as-is
src/
  main.ts             Entry point
  game.ts             Phaser game configuration
  config.ts           Canvas size, zones, captions, thresholds
  scenes/             TitleScene and GameScene (owns the scene objects and the phase loop)
  phases/             One class per water-cycle phase, plus PhaseManager
  objects/            Background, Droplet, Sun, Cloud, Plant
  input/              PermissionManager, MicrophoneInput, BlowDetector
  audio/              AudioManager (ambient loop and sound effects)
  ui/                 Captions, gesture hints, reset button, debug overlay
  utils/              Breathing animation helpers, haptics
.docs/roadmap.md      Planned features
.github/copilot-instructions.md   Design rules and conventions for contributors and coding agents
```

## Assets

All images and sounds in `public/assets/` were generated for this project by the
author, the images with AI tools. They are released under the same MIT License as
the code.

- `public/assets/background.png` and `public/assets/sun.png` were generated with
  ChatGPT (GPT-4o), as recorded in the C2PA metadata embedded in the files.
- The droplet, cloud and plant sprite sheets were generated with AI.
- The ambient loop and the sound effects in `public/assets/audio/` were generated by
  the author for this project.

## License

The code is released under the [MIT License](LICENSE).
