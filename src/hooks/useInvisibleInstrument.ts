import type { Hand } from '@tensorflow-models/hand-pose-detection';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InstrumentEngine } from '../lib/audio/InstrumentEngine';
import { GestureSmoother } from '../lib/gestures/GestureSmoother';
import { classifyGesture } from '../lib/gestures/classifyGesture';
import { createHandTracker } from '../lib/handtracking/createHandTracker';
import type { GestureAnalysis, GestureName } from '../types';

const choosePrimaryHand = (hands: Hand[]): Hand | null => {
  if (hands.length === 0) {
    return null;
  }

  return [...hands].sort((left, right) => {
    const rightHandedBonus = right.handedness === 'Right' ? 1 : 0;
    const leftHandedBonus = left.handedness === 'Right' ? 1 : 0;
    const rightScore = (right.score ?? 0) + rightHandedBonus;
    const leftScore = (left.score ?? 0) + leftHandedBonus;
    return rightScore - leftScore;
  })[0];
};

const createEmptyAnalysis = (): GestureAnalysis => ({
  gesture: 'none',
  confidence: 0,
  center: { x: 0.5, y: 0.5 },
  pinchAmount: 0,
  handedness: 'Unknown',
});

export const useInvisibleInstrument = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const lastGestureRef = useRef<GestureName>('none');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const audioEngine = useMemo(() => new InstrumentEngine(), []);
  const gestureSmoother = useMemo(() => new GestureSmoother(7, 0.62), []);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return undefined;
    }

    let mounted = true;
    let detector: Awaited<ReturnType<typeof createHandTracker>> | null = null;
    let lastInferenceAt = 0;

    const unlockAudio = () => {
      void audioEngine.resume();
    };

    const processFrame = async (timestamp: number) => {
      if (!mounted) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(processFrame);

      if (
        processingRef.current ||
        !detector ||
        videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return;
      }

      if (timestamp - lastInferenceAt < 33) {
        return;
      }

      lastInferenceAt = timestamp;
      processingRef.current = true;

      try {
        const hands = await detector.estimateHands(videoElement, {
          flipHorizontal: true,
        });
        const primaryHand = choosePrimaryHand(hands);
        const analysis = primaryHand
          ? classifyGesture(primaryHand, {
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
            })
          : createEmptyAnalysis();

        const stable = gestureSmoother.next(analysis, Boolean(primaryHand));
        const stableGesture = stable.stableGesture;

        if (stableGesture === 'openPalm') {
          audioEngine.setControlEnabled(true);
          void audioEngine.resume();
        }

        if (stableGesture === 'fist') {
          audioEngine.setControlEnabled(false);
          audioEngine.mute();
        }

        if (stableGesture === 'pinch' && lastGestureRef.current !== 'pinch') {
          void audioEngine.resume();
          audioEngine.triggerNote(stable.pinchAmount);
        }

        audioEngine.update({
          center: stable.center,
          controlEnabled: stableGesture !== 'fist',
          gesture: stableGesture,
          hasHand: stable.hasHand,
          pinchAmount: stable.pinchAmount,
        });

        lastGestureRef.current = stableGesture;
      } catch (error) {
        console.error('Hand tracking failed.', error);
      } finally {
        processingRef.current = false;
      }
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 },
            height: { ideal: 1080 },
            width: { ideal: 1920 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoElement.srcObject = stream;
        videoElement.playsInline = true;
        videoElement.muted = true;

        await videoElement.play();
        await audioEngine.ensureReady();
        detector = await createHandTracker();
        animationFrameRef.current = window.requestAnimationFrame(processFrame);
      } catch (error) {
        console.error('Camera startup failed.', error);
        if (mounted) {
          setCameraError('Camera access is required for this instrument.');
        }
      }
    };

    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio);

    void start();

    return () => {
      mounted = false;

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      detector?.dispose();
      audioEngine.dispose();
    };
  }, [audioEngine, gestureSmoother]);

  return {
    cameraError,
    videoRef,
  };
};

