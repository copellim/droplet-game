/**
 * Callbacks fired when blow detection state changes.
 */
export interface BlowDetectorCallbacks {
  onBlowStart: () => void;
  onBlowEnd: () => void;
}

/**
 * Advanced blow detection using FFT-based frequency analysis.
 *
 * Distinguishes a sustained blow (energy concentrated in low frequencies with flat spectrum)
 * from voice or transient noise by tracking multiple features:
 *  - Raw power (total energy across spectrum)
 *  - Power variance (change from frame to frame)
 *  - Noise calibration (learns ambient noise level during initial frames)
 *  - Temporal windows (requires sustained conditions over multiple frames)
 *
 * State machine:
 *  - OFF → waiting for "fast on" or "slow on" conditions
 *  - ON → waiting for "fast off" or "slow off" conditions
 */
export class BlowDetector {
  private static readonly FFT_SIZE = 1024;
  private static readonly SAMPLE_SIZE = 1024;
  private static readonly NOISE_ON_CONST = 3500; // Further reduced for soft blows away from mic
  private static readonly NOISE_OFF_CONST = 2000;
  private static readonly ON_FAST_VARIANCE_FACTOR = -0.4;
  private static readonly ON_FAST_VAR_COUNT = 4;
  private static readonly OFF_SLOW_POW_COUNT = 10;
  private static readonly OFF_FAST_FACTOR = 0.5;
  private static readonly SLOW_ON_FRAME_COUNT = 24; // Even faster detection (~400ms at 60fps)
  private static readonly POWER_WINDOW_MAX = 500;
  private static readonly OFF_FAST_VAR_WINDOW = 15;
  private static readonly NOISE_CALIBRATION_BLOWS = 30;
  private static readonly NOISE_DRIFT_STEP = 10;

  private analyser: AnalyserNode;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private callbacks: BlowDetectorCallbacks;

  private noiseLevel = -1;
  private thrOnFast = 0;
  private thrOffFast = 0;
  private thrOffSlow = 0;

  private pow = 0;
  private pwVariance = 0;
  private powerWindow: number[] = [];
  private pwIndex = 0;

  private maxVariance = 0;
  private minVariance = 0;
  private varOffVar = 0;

  private mainCondition = false;
  private isBlowing = false;
  private countBlow = 0;

  private onWindowArray: number[] = [];
  private onWindowIndex = 0;

  private offWindowArray: number[] = [];
  private offWindowIndex = 0;

  private slowOnFrameCount = 0;

  private offFastVar = 0;
  private offFastVarCount = 0;

  /**
   * @param analyser - AnalyserNode to analyze (caller must manage it)
   * @param callbacks - Fired when blow starts or ends
   */
  constructor(analyser: AnalyserNode, callbacks: BlowDetectorCallbacks) {
    analyser.fftSize = BlowDetector.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;
    this.analyser = analyser;
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    this.callbacks = callbacks;
  }

  /**
   * Returns true if currently detecting a blow.
   */
  get blowing(): boolean {
    return this.isBlowing;
  }

  /**
   * Called once per frame from the game update loop.
   * Samples the analyser and updates blow detection state.
   */
  update(): void {
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.pow = this.computePower();
    this.updateNoiseLevel();
    this.updateThresholds();
    this.pwVariance = this.computeVariance();

    if (!this.isBlowing) {
      this.countBlow = 0;
      this.checkOnEvent();
    } else {
      this.countBlow++;
      this.checkOffEvent();
    }
  }

  /**
   * Computes total power: sum of all frequency bins.
   */
  private computePower(): number {
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i]!;
    }
    return sum;
  }

  /**
   * Learns ambient noise level over the first NOISE_CALIBRATION_BLOWS frames,
   * then drifts it slightly upward if sustained high power is detected.
   */
  private updateNoiseLevel(): void {
    if (this.noiseLevel === -1) {
      this.noiseLevel = this.pow;
      return;
    }
    if (this.pow < this.noiseLevel) {
      this.noiseLevel = this.pow;
    } else if (this.pow > this.noiseLevel && this.countBlow < BlowDetector.NOISE_CALIBRATION_BLOWS) {
      this.noiseLevel += BlowDetector.NOISE_DRIFT_STEP;
    }
  }

  /**
   * Updates thresholds based on noise level.
   * ON threshold is higher (noisier environment = higher threshold).
   * OFF threshold is lower, allowing hysteresis.
   */
  private updateThresholds(): void {
    this.thrOnFast = Math.round(this.noiseLevel + BlowDetector.NOISE_ON_CONST);
    this.thrOffFast = Math.round(this.noiseLevel + BlowDetector.NOISE_OFF_CONST);
    this.thrOffSlow = Math.round(this.noiseLevel + BlowDetector.NOISE_OFF_CONST);
  }

  /**
   * Tracks power in a sliding window and computes frame-to-frame variance.
   */
  private computeVariance(): number {
    this.powerWindow[this.pwIndex] = this.pow;

    let variance = 0;
    if (this.pwIndex > 0) {
      variance = Math.round(this.powerWindow[this.pwIndex]! - this.powerWindow[this.pwIndex - 1]!);
    }

    this.pwIndex++;
    if (this.pwIndex >= BlowDetector.POWER_WINDOW_MAX) {
      this.pwIndex = 0;
      this.powerWindow = [];
    }

    return variance;
  }

  /**
   * Checks for state transition from OFF to ON.
   * Two pathways: fast (high variance signature) or slow (sustained high power).
   */
  private checkOnEvent(): void {
    this.checkFastOnEvent();
    this.checkSlowOnEvent();
  }

  /**
   * Fast ON: detects a characteristic variance signature of the initial attack.
   * Requires: power > threshold, then a sequence of positive variance followed by
   * negative variance, indicating a fast energy rise then plateau/decay.
   */
  private checkFastOnEvent(): void {
    if (this.pow <= this.thrOnFast) return;

    if (!this.mainCondition) {
      if (this.pwVariance > 0 && this.pwVariance > this.maxVariance) {
        this.maxVariance = this.pwVariance;
        this.minVariance = Math.round(BlowDetector.ON_FAST_VARIANCE_FACTOR * this.maxVariance);
        this.varOffVar = this.minVariance * BlowDetector.OFF_FAST_FACTOR;
      } else if (this.pwVariance < 0 && this.pwVariance < this.maxVariance) {
        this.mainCondition = true;
      }
      return;
    }

    this.onWindowArray[this.onWindowIndex] = this.pwVariance;

    if (this.onWindowIndex === BlowDetector.ON_FAST_VAR_COUNT) {
      if (this.onWindowArray.every((v) => v > this.minVariance && v < -this.minVariance)) {
        this.triggerBlowStart();
      } else {
        this.resetFastOnState();
      }
    } else {
      this.onWindowIndex++;
    }
  }

  /**
   * Slow ON: detects sustained high power over multiple frames (~35 frames ≈ 580 ms at 60 fps).
   * Also requires low variance (pwVariance > -3000), indicating stable/sustained power.
   */
  private checkSlowOnEvent(): void {
    if (this.pow > this.thrOnFast && this.pwVariance > -3000) {
      this.slowOnFrameCount++;
    } else {
      this.slowOnFrameCount = 0;
    }

    if (this.slowOnFrameCount >= BlowDetector.SLOW_ON_FRAME_COUNT) {
      this.slowOnFrameCount = 0;
      this.triggerBlowStart();
    }
  }

  /**
   * Checks for state transition from ON to OFF.
   * Two pathways: fast (power drops and variance bottoms out) or slow (consistent low power).
   */
  private checkOffEvent(): void {
    this.updateOffFastVar();
    this.checkFastOffEvent();
    this.checkSlowOffEvent();
  }

  /**
   * Tracks the minimum variance over a window while blowing.
   */
  private updateOffFastVar(): void {
    if (this.offFastVarCount < BlowDetector.OFF_FAST_VAR_WINDOW) {
      if (this.pwVariance < this.offFastVar) {
        this.offFastVar = this.pwVariance;
      }
      this.offFastVarCount++;
    } else {
      this.offFastVarCount = 0;
    }
  }

  /**
   * Fast OFF: power drops below threshold AND variance is sufficiently negative,
   * indicating both energy and momentum decay.
   */
  private checkFastOffEvent(): void {
    if (this.pow < this.thrOffFast && this.offFastVar < this.varOffVar) {
      this.triggerBlowEnd();
    }
  }

  /**
   * Slow OFF: requires consecutive frames of low power (below threshold).
   * Uses a sliding window; once filled, checks if all samples are below threshold.
   */
  private checkSlowOffEvent(): void {
    if (this.pow >= this.thrOffFast || this.offFastVar <= this.varOffVar) return;

    this.offWindowArray[this.offWindowIndex] = this.pow;

    if (this.offWindowIndex === BlowDetector.OFF_SLOW_POW_COUNT) {
      if (this.offWindowArray.every((v) => v < this.thrOffSlow)) {
        this.triggerBlowEnd();
      } else {
        this.offWindowArray.splice(0, 1);
      }
    } else {
      this.offWindowIndex++;
    }
  }

  /**
   * Fires the onBlowStart callback and transitions to blowing state.
   */
  private triggerBlowStart(): void {
    this.isBlowing = true;
    this.callbacks.onBlowStart();
  }

  /**
   * Fires the onBlowEnd callback and resets all internal state.
   */
  private triggerBlowEnd(): void {
    this.resetAllState();
    this.isBlowing = false;
    this.callbacks.onBlowEnd();
  }

  /**
   * Resets only the fast ON tracking state (not the global isBlowing flag).
   */
  private resetFastOnState(): void {
    this.mainCondition = false;
    this.onWindowIndex = 0;
    this.onWindowArray = [];
    this.maxVariance = 0;
    this.minVariance = 0;
  }

  /**
   * Resets all state (used at the end of a blow to prepare for the next one).
   */
  private resetAllState(): void {
    this.resetFastOnState();
    this.offWindowIndex = 0;
    this.offWindowArray = [];
    this.pwIndex = 0;
    this.slowOnFrameCount = 0;
    this.varOffVar = 0;
    this.mainCondition = false;
    this.offFastVar = 0;
    this.offFastVarCount = 0;
  }
}

