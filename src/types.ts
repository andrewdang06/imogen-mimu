export type GestureName = 'none' | 'openPalm' | 'fist' | 'pinch' | 'pointing';

export interface Point2D {
  x: number;
  y: number;
}

export interface GestureAnalysis {
  gesture: GestureName;
  confidence: number;
  center: Point2D;
  pinchAmount: number;
  handedness: 'Left' | 'Right' | 'Unknown';
}

export interface StableGestureState extends GestureAnalysis {
  stableGesture: GestureName;
  hasHand: boolean;
}

export interface InstrumentFrame {
  center: Point2D;
  controlEnabled: boolean;
  gesture: GestureName;
  hasHand: boolean;
  pinchAmount: number;
}
