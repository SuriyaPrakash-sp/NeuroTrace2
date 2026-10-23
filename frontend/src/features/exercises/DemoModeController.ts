import { calculateScore } from "../../lib/scoring";
import type { ExerciseResult } from "../../lib/types";

export class DemoModeController {
  static generateDemoResult(targetCharacter: string): ExerciseResult {
    const path_coverage = 90;
    const accuracy = 82;
    const smoothness = 73;
    return {
      target_character: targetCharacter,
      path_coverage,
      accuracy,
      smoothness,
      deviations: 4,
      completion_time_seconds: 24,
      score: calculateScore(path_coverage, accuracy, smoothness)
    };
  }
}
