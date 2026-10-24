import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

// Bundled locally so camera startup does not depend on CDN/network access.
const WASM_PATH = `${import.meta.env.BASE_URL}wasm`;
const MODEL_PATH = `${import.meta.env.BASE_URL}models/hand_landmarker.task`;

export class HandLandmarkTracker {
  private landmarker: HandLandmarker | null = null;
  private active = false;
  private loading: Promise<void> | null = null;
  private delegate: "GPU" | "CPU" = "CPU";

  async start() {
    if (this.landmarker) {
      this.active = true;
      return;
    }
    if (!this.loading) {
      this.loading = this.createLandmarker();
    }
    try {
      await this.loading;
      this.active = true;
    } catch (error) {
      this.loading = null;
      this.landmarker = null;
      throw error;
    }
  }

  private async createLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const commonOptions = {
      runningMode: "VIDEO" as const,
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    };

    // GPU is faster but can be rejected by older browsers, remote desktops, or graphics policies.
    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        ...commonOptions,
      });
      this.delegate = "GPU";
    } catch (gpuError) {
      console.warn("NeuroTrace: GPU hand tracking unavailable; retrying with CPU.", gpuError);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        ...commonOptions,
      });
      this.delegate = "CPU";
    }
  }

  getDelegate() {
    return this.delegate;
  }

  stop() {
    this.active = false;
  }

  close() {
    this.active = false;
    this.landmarker?.close();
    this.landmarker = null;
    this.loading = null;
  }

  isActive() {
    return this.active && Boolean(this.landmarker);
  }

  detect(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null {
    if (!this.isActive() || !this.landmarker) return null;
    return this.landmarker.detectForVideo(video, timestamp);
  }
}

export const tracker = new HandLandmarkTracker();
