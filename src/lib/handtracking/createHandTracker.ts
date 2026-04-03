import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';

let detectorPromise: Promise<handpose.HandPose> | null = null;

export const createHandTracker = async (): Promise<handpose.HandPose> => {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl');
      await tf.ready();

      return handpose.load({
        detectionConfidence: 0.82,
        iouThreshold: 0.25,
        maxContinuousChecks: 48,
        scoreThreshold: 0.72,
      });
    })();
  }

  return detectorPromise;
};
