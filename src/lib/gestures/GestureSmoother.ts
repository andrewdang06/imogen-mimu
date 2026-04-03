import type { GestureAnalysis, GestureName, StableGestureState } from '../../types';

interface Sample {
  confidence: number;
  gesture: GestureName;
}

export class GestureSmoother {
  private readonly history: Sample[] = [];

  constructor(
    private readonly windowSize = 6,
    private readonly stableThreshold = 0.66,
  ) {}

  public next(analysis: GestureAnalysis, hasHand: boolean): StableGestureState {
    if (!hasHand) {
      this.history.length = 0;
      return {
        ...analysis,
        hasHand: false,
        stableGesture: 'none',
      };
    }

    this.history.push({
      gesture: analysis.gesture,
      confidence: analysis.confidence,
    });

    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    const scores = new Map<GestureName, number>();
    let total = 0;

    this.history.forEach((sample) => {
      const weight = sample.confidence;
      total += weight;
      scores.set(sample.gesture, (scores.get(sample.gesture) ?? 0) + weight);
    });

    let stableGesture: GestureName = 'none';
    let bestScore = 0;

    scores.forEach((score, gesture) => {
      if (score > bestScore) {
        bestScore = score;
        stableGesture = gesture;
      }
    });

    if (total === 0 || bestScore / total < this.stableThreshold) {
      stableGesture = 'none';
    }

    return {
      ...analysis,
      hasHand: true,
      stableGesture,
    };
  }
}
