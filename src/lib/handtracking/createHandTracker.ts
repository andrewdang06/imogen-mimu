import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';

let detectorPromise: Promise<handPoseDetection.HandDetector> | null = null;

export const createHandTracker = async (): Promise<handPoseDetection.HandDetector> => {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl');
      await tf.ready();

      return handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          maxHands: 2,
          modelType: 'lite',
          runtime: 'tfjs',
        },
      );
    })();
  }

  return detectorPromise;
};
