import { useEffect, useRef } from 'react';
import type { AnnotatedPrediction } from '@tensorflow-models/handpose';
import type { GestureName } from '../types';

interface HandVisualizerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  primaryHand: AnnotatedPrediction | null;
  currentGesture: GestureName;
  gestureConfidence: number;
  handPosition: { x: number; y: number };
  pinchAmount: number;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
];

export const HandVisualizer: React.FC<HandVisualizerProps> = ({
  videoRef,
  primaryHand,
  currentGesture,
  gestureConfidence,
  handPosition,
  pinchAmount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (primaryHand && primaryHand.landmarks) {
      const landmarks = primaryHand.landmarks as Array<[number, number]>;

      // Draw connections
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const startLm = landmarks[start];
        const endLm = landmarks[end];
        if (startLm && endLm) {
          ctx.beginPath();
          ctx.moveTo(startLm[0], startLm[1]);
          ctx.lineTo(endLm[0], endLm[1]);
          ctx.stroke();
        }
      });

      // Draw landmarks
      landmarks.forEach((lm, idx) => {
        if (lm) {
          // Landmark circle
          ctx.fillStyle = idx === 0 ? '#ff0000' : '#00ff00'; // Red for wrist, green for others
          ctx.beginPath();
          ctx.arc(lm[0], lm[1], 5, 0, 2 * Math.PI);
          ctx.fill();

          // Landmark label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(idx.toString(), lm[0] + 8, lm[1] + 8);
        }
      });
    }
  }, [videoRef, primaryHand]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="hand-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <div className="gesture-info">
        <div className="gesture-text">
          <p>Gesture: <strong>{currentGesture}</strong></p>
          <p>Confidence: {(gestureConfidence * 100).toFixed(1)}%</p>
          <p>Hand Position: X={handPosition.x.toFixed(2)} Y={handPosition.y.toFixed(2)}</p>
          <p>Pinch Amount: {(pinchAmount * 100).toFixed(1)}%</p>
        </div>
      </div>
    </>
  );
};
