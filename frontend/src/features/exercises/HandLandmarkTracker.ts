export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export class HandLandmarkTracker {
  private active = false;

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }
}

export const tracker = new HandLandmarkTracker();
