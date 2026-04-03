import type { Hand } from '@tensorflow-models/hand-pose-detection';
import { averagePoint, clamp, distance } from '../math';
import type { GestureAnalysis, GestureName, Point2D } from '../../types';

type KeypointName =
  | 'wrist'
  | 'thumb_tip'
  | 'thumb_mcp'
  | 'index_finger_mcp'
  | 'index_finger_pip'
  | 'index_finger_tip'
  | 'middle_finger_mcp'
  | 'middle_finger_pip'
  | 'middle_finger_tip'
  | 'ring_finger_mcp'
  | 'ring_finger_pip'
  | 'ring_finger_tip'
  | 'pinky_finger_mcp'
  | 'pinky_finger_pip'
  | 'pinky_finger_tip';

const REQUIRED_POINTS: KeypointName[] = [
  'wrist',
  'thumb_tip',
  'thumb_mcp',
  'index_finger_mcp',
  'index_finger_pip',
  'index_finger_tip',
  'middle_finger_mcp',
  'middle_finger_pip',
  'middle_finger_tip',
  'ring_finger_mcp',
  'ring_finger_pip',
  'ring_finger_tip',
  'pinky_finger_mcp',
  'pinky_finger_pip',
  'pinky_finger_tip',
];

const getHandedness = (hand: Hand): 'Left' | 'Right' | 'Unknown' => {
  if (typeof hand.handedness === 'string') {
    return hand.handedness === 'Left' || hand.handedness === 'Right'
      ? hand.handedness
      : 'Unknown';
  }

  return 'Unknown';
};

const asPointMap = (hand: Hand): Map<string, Point2D> => {
  const map = new Map<string, Point2D>();

  hand.keypoints.forEach((keypoint) => {
    if (keypoint.name) {
      map.set(keypoint.name, { x: keypoint.x, y: keypoint.y });
    }
  });

  return map;
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
  hand: Hand,
  frameSize: { width: number; height: number },
): GestureAnalysis => {
  const points = asPointMap(hand);
  const hasRequiredPoints = REQUIRED_POINTS.every((key) => points.has(key));

  if (!hasRequiredPoints || frameSize.width === 0 || frameSize.height === 0) {
    return buildFallbackAnalysis();
  }

  const wrist = points.get('wrist')!;
  const thumbTip = points.get('thumb_tip')!;
  const thumbMcp = points.get('thumb_mcp')!;
  const indexMcp = points.get('index_finger_mcp')!;
  const indexPip = points.get('index_finger_pip')!;
  const indexTip = points.get('index_finger_tip')!;
  const middleMcp = points.get('middle_finger_mcp')!;
  const middlePip = points.get('middle_finger_pip')!;
  const middleTip = points.get('middle_finger_tip')!;
  const ringMcp = points.get('ring_finger_mcp')!;
  const ringPip = points.get('ring_finger_pip')!;
  const ringTip = points.get('ring_finger_tip')!;
  const pinkyMcp = points.get('pinky_finger_mcp')!;
  const pinkyPip = points.get('pinky_finger_pip')!;
  const pinkyTip = points.get('pinky_finger_tip')!;

  const palmSize = Math.max(distance(wrist, middleMcp), 1);

  const indexExtended = isFingerExtended(
    indexTip,
    indexPip,
    indexMcp,
    wrist,
    palmSize,
  );
  const middleExtended = isFingerExtended(
    middleTip,
    middlePip,
    middleMcp,
    wrist,
    palmSize,
  );
  const ringExtended = isFingerExtended(ringTip, ringPip, ringMcp, wrist, palmSize);
  const pinkyExtended = isFingerExtended(
    pinkyTip,
    pinkyPip,
    pinkyMcp,
    wrist,
    palmSize,
  );

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
    (thumbExtended || thumbSpread > 0.7)
  ) {
    gesture = 'openPalm';
    confidence = clamp(
      (distance(indexTip, wrist) + distance(middleTip, wrist)) / (palmSize * 5),
      0.65,
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

  const palmCenter = averagePoint([
    wrist,
    indexMcp,
    middleMcp,
    ringMcp,
    pinkyMcp,
  ]);

  return {
    gesture,
    confidence,
    center: {
      x: clamp(1 - palmCenter.x / frameSize.width, 0, 1),
      y: clamp(palmCenter.y / frameSize.height, 0, 1),
    },
    pinchAmount,
    handedness: getHandedness(hand),
  };
};
