/** Dimensioni logiche del canvas (portrait mobile-first). */
export const CANVAS_WIDTH = 390;
export const CANVAS_HEIGHT = 844;

/** Colori principali del gioco. */
export const COLORS = {
  background: 0x1a6b8a,
  droplet: 0x5bc8f5,
  dropletOutline: 0x1a6b8a,
  sky: 0x87ceeb,
  sun: 0xffd700,
  cloud: 0xeceff1,
  cloudDark: 0x546e7a,
  terrain: 0x4caf50,
  sea: 0x1a6b8a,
  stream: 0x5bc8f5,
} as const;

/** Configurazione fisica. */
export const PHYSICS = {
  gravity: 200,
  dropletMass: 1,
} as const;

/** Configurazione sensori. */
export const SENSORS = {
  /**
   * Soglia minima in gradi per ignorare il rumore del giroscopio.
   * Valori di gamma (inclinazione sinistra/destra) inferiori a questo sono trattati come zero.
   */
  orientationDeadZone: 3,
  /**
   * Pixel per grado di inclinazione per frame (a ~60 Hz).
   * A 30° di inclinazione il droplet si sposta di circa 5 px/frame.
   */
  orientationSensitivity: 0.15,
} as const;

/** Zone logiche del mondo di gioco (coordinate canvas). */
export const ZONES = {
  seaSurface: 640,
  cloudY: 140,
  cloudX: 195,
  groundLevel: 820,
  streamEnd: { x: 30, y: 460 },
  terrainTop: 380,
} as const;

/**
 * Testi UI associati a ciascuna fase del ciclo dell'acqua.
 * Le chiavi corrispondono ai valori stringa dell'enum GamePhase.
 */
export const PHASE_TEXTS: Record<string, string> = {
  Sea: "Il sole scalda l'acqua…",
  Evaporation: 'La goccia evapora…',
  Cloud: 'La nuvola si gonfia…',
  Rain: 'Scegli dove cadere!',
  Landing: 'La terra assorbe…',
  Plants: 'La pianta beve…',
  Stream: 'Il ruscello scorre verso il mare…',
} as const;

/** Configurazione del sole. */
export const SUN = {
  initialX: 300,
  initialY: 100,
  evaporationThresholdY: 320,
} as const;

/** Configurazione della nuvola. */
export const CLOUD = {
  tapsRequired: 4,
} as const;

/** Configurazione della fase Plants. */
export const PLANT = {
  /** Scale uniforme applicato allo sprite (preserva l'aspect ratio per ogni frame). */
  scale: 0.2,
  /** Raggio di collisione orizzontale per rilevare quale pianta è stata colpita dalla goccia. */
  hitRadius: 70,
  /** Posizioni delle tre piante sul terreno (sinistra, centro, destra). */
  positions: [
    { x: 70, y: 765 },
    { x: 195, y: 810 },
    { x: 320, y: 785 },
  ],
} as const;

/** Configurazione della goccia. */
export const DROPLET = {
  oscillationAmplitude: 8,
  evaporationDuration: 2000,
  rainFallDuration: 2500,
  streamDuration: 2000,
  /** Minimum RMS volume threshold (0–1) for detecting a blow from the microphone. */
  blowThreshold: 0.1,
  /**
   * Tween time-scale used when the mic is available but the player is not blowing.
   * The droplet evaporates on its own at this slow rate; blowing speeds it up.
   */
  blowIdleTimeScale: 0.2,
  /** Maximum tween time-scale multiplier when the player blows at full volume. */
  blowMaxTimeScale: 4,
  /**
   * Lerp factor applied per millisecond when smoothing the tween timeScale
   * toward its target value (inertia). Larger values = faster response.
   * At 60 fps (Δt ≈ 16.7 ms) a factor of 0.004 gives roughly 150 ms decay.
   */
  blowTimeScaleDecay: 0.004,
} as const;

/** Configurazione del ruscello. */
export const STREAM = {
  startX: 280,
  endX: 20,
} as const;

/** Configurazione microfono e rilevazione soffio tramite analisi frequenziale. */
export const MICROPHONE = {
  /**
   * Soglia minima di energia media delle basse frequenze (0–500 Hz) nella
   * scala 0–255 di getByteFrequencyData per considerare attivo il soffio.
   * Abbassata al massimo per soffi delicati diretti verso lo schermo.
   */
  blowVolumeThreshold: 90,
  /**
   * Rapporto minimo tra energia media basse frequenze (0–500 Hz) e media
   * frequenze (500–3000 Hz) necessario per distinguere il soffio dalla voce.
   * Il soffio ha uno spettro uniforme; la voce ha picchi nelle medie frequenze.
   */
  blowRatioThreshold: 1.3,
  /**
   * Durata minima in ms durante la quale le condizioni di soffio devono essere
   * soddisfatte in modo continuativo prima di confermare il rilevamento.
   * Filtra i falsi positivi da consonanti esplosive brevi (p, t, k).
   */
  blowDebounceMs: 200,
} as const;

