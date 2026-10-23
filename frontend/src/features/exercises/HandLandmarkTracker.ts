import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export class HandLandmarkTracker {
  private landmarker: HandLandmarker | null = null;
  private active = false;
  private loading: Promise<void> | null = null;

  async start() {
    if (this.landmarker) {
      this.active = true;
      return;
    }
    if (!this.loading) {
      this.loading = (async () => {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      })();
    }
    await this.loading;
    this.active = true;
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
