import type { AnnotatedPrediction } from '@tensorflow-models/handpose';
import { averagePoint, clamp, distance } from '../math';
import type { GestureAnalysis, GestureName, Point2D } from '../../types';

const LANDMARK_INDEX = {
  indexMcp: 5,
  indexPip: 6,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleTip: 12,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyTip: 20,
  ringMcp: 13,
  ringPip: 14,
  ringTip: 16,
  thumbMcp: 2,
  thumbTip: 4,
  wrist: 0,
} as const;

const toPoint = (value: [number, number, number] | undefined): Point2D | null => {
  if (!value) {
    return null;
  }

  return { x: value[0], y: value[1] };
};

const isFingerExtended = (
  tip: Point2D,
  pip: Point2D,
  mcp: Point2D,
  wrist: Point2D,
  palmSize: number,
): boolean => {
  const span = distance(tip, mcp) / palmSize;
  const tipReach = distance(tip, wrist);
  const pipReach = distance(pip, wrist);
  return span > 0.9 && tipReach > pipReach * 1.1;
};

const buildFallbackAnalysis = (): GestureAnalysis => ({
  gesture: 'none',
  confidence: 0,
  center: { x: 0.5, y: 0.5 },
  pinchAmount: 0,
  handedness: 'Unknown',
});

export const classifyGesture = (
  hand: AnnotatedPrediction,
  frameSize: { width: number; height: number },
): GestureAnalysis => {
  const landmarks = hand.landmarks;

  if (landmarks.length < 21 || frameSize.width === 0 || frameSize.height === 0) {
    return buildFallbackAnalysis();
  }

  const wrist = toPoint(landmarks[LANDMARK_INDEX.wrist]);
  const thumbTip = toPoint(landmarks[LANDMARK_INDEX.thumbTip]);
  const thumbMcp = toPoint(landmarks[LANDMARK_INDEX.thumbMcp]);
  const indexMcp = toPoint(landmarks[LANDMARK_INDEX.indexMcp]);
  const indexPip = toPoint(landmarks[LANDMARK_INDEX.indexPip]);
  const indexTip = toPoint(landmarks[LANDMARK_INDEX.indexTip]);
  const middleMcp = toPoint(landmarks[LANDMARK_INDEX.middleMcp]);
  const middlePip = toPoint(landmarks[LANDMARK_INDEX.middlePip]);
  const middleTip = toPoint(landmarks[LANDMARK_INDEX.middleTip]);
  const ringMcp = toPoint(landmarks[LANDMARK_INDEX.ringMcp]);
  const ringPip = toPoint(landmarks[LANDMARK_INDEX.ringPip]);
  const ringTip = toPoint(landmarks[LANDMARK_INDEX.ringTip]);
  const pinkyMcp = toPoint(landmarks[LANDMARK_INDEX.pinkyMcp]);
  const pinkyPip = toPoint(landmarks[LANDMARK_INDEX.pinkyPip]);
  const pinkyTip = toPoint(landmarks[LANDMARK_INDEX.pinkyTip]);

  if (
    !wrist ||
    !thumbTip ||
    !thumbMcp ||
    !indexMcp ||
    !indexPip ||
    !indexTip ||
    !middleMcp ||
    !middlePip ||
    !middleTip ||
    !ringMcp ||
    !ringPip ||
    !ringTip ||
    !pinkyMcp ||
    !pinkyPip ||
    !pinkyTip
  ) {
    return buildFallbackAnalysis();
  }

  const palmSize = Math.max(distance(wrist, middleMcp), 1);

  const indexExtended = isFingerExtended(indexTip, indexPip, indexMcp, wrist, palmSize);
  const middleExtended = isFingerExtended(middleTip, middlePip, middleMcp, wrist, palmSize);
  const ringExtended = isFingerExtended(ringTip, ringPip, ringMcp, wrist, palmSize);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp, wrist, palmSize);

  const thumbReach = distance(thumbTip, thumbMcp) / palmSize;
  const thumbSpread = distance(thumbTip, indexMcp) / palmSize;
  const thumbExtended = thumbReach > 0.55 && thumbSpread > 0.8;

  const pinchDistance = distance(thumbTip, indexTip) / palmSize;
  const pinchAmount = clamp(1 - pinchDistance / 0.7, 0, 1);

  let gesture: GestureName = 'none';
  let confidence = 0.35;

  if (pinchDistance < 0.38 && indexExtended) {
    gesture = 'pinch';
    confidence = clamp(1 - pinchDistance / 0.38, 0.6, 1);
  } else if (
    indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended &&
    pinchDistance > 0.5
  ) {
    gesture = 'pointing';
    confidence = clamp((distance(indexTip, indexMcp) / palmSize - 0.9) * 0.9, 0.55, 1);
  } else if (
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    (thumbExtended || thumbSpread > 0.6)
  ) {
    gesture = 'openPalm';
    confidence = clamp(
      (distance(indexTip, wrist) + distance(middleTip, wrist)) / (palmSize * 5),
      0.55,
      1,
    );
  } else if (
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended &&
    thumbReach < 0.85
  ) {
    gesture = 'fist';
    confidence = clamp(1 - thumbReach / 0.85, 0.55, 1);
  }

  const palmCenter = averagePoint([wrist, indexMcp, middleMcp, ringMcp, pinkyMcp]);

  return {
    gesture,
    confidence,
    center: {
      x: clamp(1 - palmCenter.x / frameSize.width, 0, 1),
      y: clamp(palmCenter.y / frameSize.height, 0, 1),
    },
    pinchAmount,
    handedness: 'Unknown',
  };
};
