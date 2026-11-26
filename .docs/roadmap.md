# Roadmap — Droplet Game

A map of the journey, not a backlog. The ideas here come from the same philosophy as the game: every step should add meaning, not complexity.

---

## Horizon 1 — Completing v1 *(next weeks)*

The heart of the game works. These five items bring the experience to the level of a finished, polished product: something a parent can hand to a five-year-old with confidence.

---

### 1. Animated TitleScene

The first thing the child sees should already tell a story.

The scene builds up slowly, like opening a picture book:

1. The sea background appears, already calm, with the waves breathing gently (sinusoidal tween on the y axis of the wave sprites).
2. The title *"Goccia"* emerges from the water with a soft tween: it starts below the surface, rises to its final position and settles with a slight wobble (elastic ease).
3. The droplet appears on the sea surface and starts breathing (vertical oscillation, Serene expression).
4. About 2 s after the droplet appears, the caption *"Tocca per iniziare"* ("Tap to start") fades in slowly, at most 4 words.

When the child taps:
- The droplet does a small joyful hop (scale tween 1.0→1.3→1.0, Happy expression).
- A light watery SFX plays (`sfx-tap`).
- Transition to `SeaPhase` with visual continuity: soft fade-out (600 ms), no hard cut. The sea background stays identical between TitleScene and SeaPhase.

**Emotional goal:** the child is already inside the scene before touching anything. The waiting is part of the pleasure.

---

### 2. Redesigned SeaPhase

The opening phase of the cycle also sets the emotional tone of the whole game. It deserves more care.

**Initial quiet moment (~3 s):**
The droplet is on the water, the waves move. Almost total silence, only the ambient loop. The sun enters the frame from above, slowly, as if rising at dawn. Only when the sun is fully visible does the drag hint appear (TutorialOverlay, type `drag_down`).

**Reactive scene elements (optional):**
- *Little fish*: visible just below the surface, swimming slowly. Tapping it startles the droplet with a little jolt (Surprised expression for 1 s) and plays `sfx-fish`. The fish jumps and dives back into the water.
- *Floating leaf*: drifts from right to left. Tapping it makes the droplet nudge it gently, with a small rotation animation and `sfx-leaf`.

These elements never block progress. They are there for those who want to explore, invisible for those who want to move on.

**Emotional goal:** the child notices that the world *responds*, even though nobody said so.

---

### 3. StreamPhase *(new phase)*

Closes the cycle narratively. Without this phase, the Plants→Sea step is a hard cut that breaks immersion.

**Mechanic:** the droplet flows as a stream towards the sea. The child guides it by tilting the device (DeviceOrientation, already available through PermissionManager) or by swiping horizontally between bends, rounded stones and wet flowers. The flow is inevitable: you cannot get it wrong, you can only accompany it.

**Required act of care:** along the way there is a small animal (a frog or an earthworm) that is thirsty. The stream must pass close enough to wet it. The animal reacts with a joyful animation and a sound (`sfx-frog`). Only after this moment can the stream reach the sea.

**Exit transition:** the stream enters the sea with a small splash. The droplet merges with the waves, using the same animation as the LandingPhase splash but horizontal. The cycle starts again from SeaPhase with visual continuity.

**Emotional goal:** the cycle closes. The child feels they have come back, not that they started over.

---

### 4. WinterVariant *(seasonal variant of CloudPhase)*

The same mechanic, a completely different atmosphere. It activates automatically every N complete cycles (e.g. every third), without warning: the child discovers it.

**Visual differences:**
- The cloud turns grey-blue and puffier.
- The droplet falls as a snowflake (sprite `snowflake-sprite.png`) instead of rain.
- The sky background gets darker, with a pearl-grey tint.
- The meadow is covered with white snow.

**Pace differences:** movement is slower, the music changes tone (softer ambient, perhaps with delicate little bells).

**Alternative act of care:** instead of watering the plant, the child "tucks a seed in under the snow like a blanket" (sprite `seed-covered-sprite.png`). Tapping the lost seed makes the snow wrap it gently, with a white dissolve animation.

**Emotional goal:** winter is part of the cycle too. Snow is water too. The child learns without anybody explaining it.

---

### 5. EndOfSession screen

After the second or third complete cycle, before starting again: a moment of reflection.

**Scene:**
The droplet swims calmly in the sea. The icons of the phases travelled (sea, evaporation, cloud, rain, landing, plants) light up one by one in sequence, like the stars of a constellation coming on. The order follows the cycle. No numbers, no text, no trophies.

**Duration:** 5–6 seconds. Skippable with a tap at any moment.

**Afterwards:** the game starts again by itself from SeaPhase, with no intermediate screen.

**Emotional goal:** the child sees the journey they made. Not a prize, a memory.

---

## Horizon 2 — Future expansions *(ideas, not planned)*

These ideas are a reserve of possibilities. None has a date. Some may never arrive, and that is fine.

- **River variant of StreamPhase**: after the stream, the droplet reaches a bigger river with other kawaii water characters. Introduces scale: from stream to river to sea.
- **Dynamic seasons**: the cycle changes look automatically (summer/autumn/winter/spring). Same mechanic, different palette and atmosphere. Adds replayability without adding complexity.
- **Underground/aquifer**: rare variant where the droplet seeps into the ground and follows an underground path with bioluminescence. Introduces the idea of groundwater in a purely visual way.
- **Glacier**: the droplet "falls asleep" as an ice crystal on a mountain and wakes up with the spring warmth. Input: blow to melt (reuses `MicrophoneInput`).
- **Deep ocean**: before evaporation, a short exploration of the sea floor: seaweed, kawaii fish, light filtering from above. Purely contemplative, no mechanics.
- **Friend droplets**: in some phases other tappable droplets appear, each with a small reaction or sound. The child is not alone in the cycle.
- **"Listen" mode**: everything moves forward by itself with a gentle narrating voice. No input. For very young children, for bedtime, for those who just want to watch.
- **Optional pollution**: a bonus phase where the droplet finds litter in the water. The child removes it by tapping. Introduces the environmental theme without anxiety: the problem exists, but the child can solve it.
- **Night cycle**: visual variant with the moon reflected in the sea, stars, lit clouds. Same mechanic, completely different atmosphere. Perfect for calming down before sleep.
- **Fixed characters per phase**: a frog in Rain, an earthworm in Landing, a butterfly in Plants. They react to the droplet passing by but are not interactive. They bring the world to life without adding complexity.
- **AI voice-over**: very short guiding captions read by a warm voice generated with AI text-to-speech. Further reduces reliance on written text.
- **i18n**: English and Spanish as the first additional languages. The game has international educational potential.
- **Postcard sharing**: the journey map from the EndOfSession screen can be shared (Web Share API) or printed. Involves parents.

---

## Horizon 3 — Distant vision *(only sketched)*

Not a plan. A direction. It helps keep in sight where the game might go one day.

- **"Explore freely" mode**: free movement in the world instead of linear phases. It would need a significant architectural refactor, but would open up a completely different experience: a garden to explore rather than a path to follow.
- **Multiple biomes**: a snowy mountain, an autumn wood, a vegetable garden, a city with puddles and gutters. The water cycle runs everywhere, and the child recognises it in their own neighbourhood.
- **Book of discoveries**: an unlockable illustrated collection to leaf through with a parent after the session. Not an achievement system, more like a photo album of the journey.
- **Native app version**: Capacitor or React Native with a WebView. For those who want the home-screen icon, optional notifications ("Goccia is waiting for you") and guaranteed offline access.

---

*The roadmap evolves with the game. If a new phase teaches something unexpected, the vision is updated; the plan is not forced.*
