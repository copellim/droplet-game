/** Possible outcomes for a single permission request. */
export type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'pending';

/**
 * Singleton that requests microphone and device-orientation permissions together
 * on the first user gesture and caches the results for the duration of the
 * session.  All subsequent calls to {@link requestAll} are no-ops.
 */
export class PermissionManager {
  private static _instance: PermissionManager | null = null;

  private _microphoneStatus: PermissionStatus = 'pending';
  private _orientationStatus: PermissionStatus = 'pending';
  private _motionStatus: PermissionStatus = 'pending';
  private _requested = false;

  private constructor() {}

  /** Returns the shared session-scoped instance. */
  static get instance(): PermissionManager {
    if (!PermissionManager._instance) {
      PermissionManager._instance = new PermissionManager();
    }
    return PermissionManager._instance;
  }

  /** True when microphone access was granted. */
  get microphoneGranted(): boolean {
    return this._microphoneStatus === 'granted';
  }

  /** True when device-orientation access was granted (or implicitly available). */
  get orientationGranted(): boolean {
    return this._orientationStatus === 'granted';
  }

  /** True when device-motion access was granted (or implicitly available). */
  get motionGranted(): boolean {
    return this._motionStatus === 'granted';
  }

  /** True after {@link requestAll} has been called at least once. */
  get requested(): boolean {
    return this._requested;
  }

  /**
   * Requests microphone and device-orientation permissions concurrently.
   * Must be called inside a user-gesture handler (e.g. a tap/click callback).
   * Subsequent calls are silently ignored — outcomes are cached in this instance.
   */
  async requestAll(): Promise<void> {
    if (this._requested) return;
    this._requested = true;

    // Request orientation and motion before microphone: on iOS 13+ these must be
    // the first user-activation-consuming calls.
    await Promise.allSettled([this.requestOrientation(), this.requestMotion(), this.requestMicrophone()]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async requestMicrophone(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this._microphoneStatus = 'unavailable';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately — we only needed the permission prompt.
      stream.getTracks().forEach((t) => t.stop());
      this._microphoneStatus = 'granted';
    } catch {
      this._microphoneStatus = 'denied';
    }
  }

  private async requestOrientation(): Promise<void> {
    if (typeof DeviceOrientationEvent === 'undefined') {
      this._orientationStatus = 'unavailable';
      return;
    }

    // iOS 13+ exposes a static `requestPermission` method on both
    // DeviceOrientationEvent and DeviceMotionEvent that must be called
    // inside a user-gesture callback.
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof doe.requestPermission === 'function') {
      try {
        const result = await doe.requestPermission();
        this._orientationStatus = result === 'granted' ? 'granted' : 'denied';
      } catch {
        this._orientationStatus = 'denied';
      }
    } else {
      // Android and desktop browsers fire DeviceOrientationEvent without explicit
      // permission — treat as granted.
      this._orientationStatus = 'granted';
    }
  }

  private async requestMotion(): Promise<void> {
    if (typeof DeviceMotionEvent === 'undefined') {
      this._motionStatus = 'unavailable';
      return;
    }

    // iOS 13+ requires explicit permission for DeviceMotionEvent too.
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof dme.requestPermission === 'function') {
      try {
        const result = await dme.requestPermission();
        this._motionStatus = result === 'granted' ? 'granted' : 'denied';
      } catch {
        this._motionStatus = 'denied';
      }
    } else {
      this._motionStatus = 'granted';
    }
  }
}

