export interface Point {
  x: number;
  y: number;
}

export interface TargetPath {
  character: string;
  description: string;
  points: Point[];
}

export const TARGET_PATHS: Record<string, TargetPath> = {
  a: {
    character: "a",
    description: "Counter-clockwise circle starting at 2 o clock, followed by vertical downstroke.",
    points: [
      { x: 50, y: 30 }, { x: 30, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 },
      { x: 50, y: 70 }, { x: 50, y: 30 }, { x: 50, y: 70 }
    ]
  },
  c: {
    character: "c",
    description: "Smooth arc from top right curving left and bottom.",
    points: [
      { x: 50, y: 30 }, { x: 30, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 }, { x: 50, y: 70 }
    ]
  },
  "8": {
    character: "8",
    description: "Infinity figure-8 loop continuous tracing.",
    points: [
      { x: 50, y: 50 }, { x: 35, y: 35 }, { x: 50, y: 20 }, { x: 65, y: 35 },
      { x: 50, y: 50 }, { x: 35, y: 65 }, { x: 50, y: 80 }, { x: 65, y: 65 }, { x: 50, y: 50 }
    ]
  }
};
