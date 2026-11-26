import { BlowDetector } from './BlowDetector.js';

/**
 * Singleton wrapper for microphone audio input using the Web Audio API.
 *
 * Exposes a normalised RMS volume value in [0, 1] that game phases can read
 * each frame.  Returns a safe neutral value (0) whenever the microphone is
 * unavailable, permission has been denied, or before the stream has been
 * opened — allowing phases to function with their fallback behaviour.
 *
 * Also exposes {@link isBlowing}, a sophisticated blow detection flag derived
 * from FFT-based frequency analysis using {@link BlowDetector}. Distinguishes
 * a sustained blow from voice or ambient noise.
 */
export class MicrophoneInput {
  private static _instance: MicrophoneInput | null = null;

  private _audioContext: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private _stream: MediaStream | null = null;
  /** Time-domain buffer (size = fftSize). */
  private _dataArray: Uint8Array<ArrayBuffer> | null = null;
  /** Frequency-domain buffer (size = frequencyBinCount = fftSize / 2). */
  private _freqDataArray: Uint8Array<ArrayBuffer> | null = null;

  private _volume = 0;
  private _isBlowing = false;
  /** Average energy of the low band (0–500 Hz) on the 0–255 scale, updated each frame. */
  private _blowLowAvg = 0;
  /** Low/mid band energy ratio, updated each frame. */
  private _blowRatio = 0;

  /** Advanced blow detector using FFT and temporal analysis. */
  private _blowDetector: BlowDetector | null = null;

  private _available = false;
  private _started = false;

  private static readonly UINT8_MIDPOINT = 128;

  private constructor() {}

  /** Returns the shared session-scoped instance. */
  static get instance(): MicrophoneInput {
    if (!MicrophoneInput._instance) {
      MicrophoneInput._instance = new MicrophoneInput();
    }
    return MicrophoneInput._instance;
  }

  /**
   * Normalised RMS volume in [0, 1].
   * Returns 0 when the microphone is unavailable or has not been started.
   */
  get volume(): number {
    return this._volume;
  }

  /** True when the microphone stream is open and audio data is being read. */
  get available(): boolean {
    return this._available;
  }

  /** True after {@link start} has been called at least once. */
  get started(): boolean {
    return this._started;
  }

  /**
   * True when the microphone detects a sustained blow:
   *  - average energy in the low band (0–500 Hz) exceeds
   *    {@link MICROPHONE.blowVolumeThreshold},
   *  - the low/mid energy ratio exceeds {@link MICROPHONE.blowRatioThreshold},
   *  - both conditions held for at least {@link MICROPHONE.blowDebounceMs} ms.
   *
   * Always false when the microphone is unavailable.
   */
  get isBlowing(): boolean {
    return this._isBlowing;
  }

  /**
   * Average energy of the low frequency band (0–500 Hz) on the 0–255 scale.
   * Useful for tuning {@link MICROPHONE.blowVolumeThreshold} in the debug panel.
   * Returns 0 when the microphone is unavailable.
   */
  get blowLowAvg(): number {
    return this._blowLowAvg;
  }

  /**
   * Current low/mid band energy ratio.
   * Useful for tuning {@link MICROPHONE.blowRatioThreshold} in the debug panel.
   * Returns 0 when the microphone is unavailable.
   */
  get blowRatio(): number {
    return this._blowRatio;
  }

  /**
   * Opens the microphone stream and prepares the Web Audio analyser.
   * Should be called after microphone permission has been granted.
   * Subsequent calls are silently ignored — the stream is opened only once.
   */
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Guard: stop() may have been called while waiting for permission.
      if (!this._started) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this._stream = stream;
      this._audioContext = new AudioContext();
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 1024;
      this._dataArray = new Uint8Array(this._analyser.fftSize) as Uint8Array<ArrayBuffer>;
      this._freqDataArray = new Uint8Array(this._analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this._source = this._audioContext.createMediaStreamSource(this._stream);
      this._source.connect(this._analyser);

      // Initialize BlowDetector with callbacks
      this._blowDetector = new BlowDetector(this._analyser, {
        onBlowStart: () => {
          this._isBlowing = true;
        },
        onBlowEnd: () => {
          this._isBlowing = false;
        },
      });

      this._available = true;
    } catch {
      // Permission denied or device unavailable — volume stays at 0.
    }
  }

  /**
   * Samples the current microphone audio and updates {@link volume} and
   * {@link isBlowing}.
   * Call once per game-update frame from the active phase's update method
   * or from the scene's update loop.
   */
  update(): void {
    if (!this._available || !this._analyser || !this._dataArray || !this._freqDataArray) {
      this.resetAudioState();
      return;
    }

    this._analyser.getByteTimeDomainData(this._dataArray);
    this._volume = this.computeRmsVolume();

    // Update frequency-domain metrics (for debugging/tuning purposes)
    this._analyser.getByteFrequencyData(this._freqDataArray);
    const { lowAvg, midAvg } = this.computeFrequencyBandAverages();
    this._blowLowAvg = lowAvg;
    this._blowRatio = midAvg > 0 ? lowAvg / midAvg : 0;

    // Update advanced blow detection
    if (this._blowDetector) {
      this._blowDetector.update();
    }
  }

  /**
   * Resets audio state to neutral values when microphone is unavailable.
   */
  private resetAudioState(): void {
    this._volume = 0;
    this._isBlowing = false;
    this._blowLowAvg = 0;
    this._blowRatio = 0;
  }

  /**
   * Computes RMS volume from time-domain data and normalises to [0, 1].
   */
  private computeRmsVolume(): number {
    if (!this._dataArray) return 0;
    const meanSquare = this.meanSquare();
    return Math.min(1, Math.sqrt(meanSquare));
  }

  /**
   * Computes mean of squared normalised samples.
   */
  private meanSquare(): number {
    const sum = this._dataArray!.reduce((acc, s) => {
      const n = this.normalizeSample(s);
      return acc + n * n;
    }, 0);
    return sum / this._dataArray!.length;
  }

  /**
   * Normalises a single sample from [0, 255] to [-1, 1].
   */
  private normalizeSample(sample: number): number {
    return sample / MicrophoneInput.UINT8_MIDPOINT - 1;
  }

  /**
   * Analyzes frequency-domain data and returns average energy
   * of low (0–500 Hz) and mid (500–3000 Hz) bands.
   * Exposed for tuning and debugging purposes.
   */
  private computeFrequencyBandAverages(): { lowAvg: number; midAvg: number } {
    const sampleRate = this._audioContext!.sampleRate;
    const binWidth = sampleRate / this._analyser!.fftSize;

    // Low band: 0–500 Hz
    const lowBandEnd = Math.floor(500 / binWidth);
    // Mid band: 500–3000 Hz
    const midBandStart = lowBandEnd + 1;
    const midBandEnd = Math.min(Math.floor(3000 / binWidth), this._freqDataArray!.length - 1);

    let lowSum = 0;
    for (let i = 0; i <= lowBandEnd; i++) lowSum += this._freqDataArray![i]!;
    const lowAvg = lowSum / (lowBandEnd + 1);

    let midSum = 0;
    for (let i = midBandStart; i <= midBandEnd; i++) midSum += this._freqDataArray![i]!;
    const midAvg = midSum / (midBandEnd - midBandStart + 1);

    return { lowAvg, midAvg };
  }

  /**
   * Closes the microphone stream and releases all Web Audio resources.
   * After this call the singleton is reset so that {@link start} can be
   * invoked again if needed.
   */
  stop(): void {
    this._source?.disconnect();
    this._analyser?.disconnect();
    this._stream?.getTracks().forEach((t) => t.stop());
    void this._audioContext?.close();

    this._source = null;
    this._analyser = null;
    this._dataArray = null;
    this._freqDataArray = null;
    this._stream = null;
    this._audioContext = null;
    this._blowDetector = null;
    this._available = false;
    this._volume = 0;
    this._isBlowing = false;
    this._blowLowAvg = 0;
    this._blowRatio = 0;
    this._started = false;
  }
}

