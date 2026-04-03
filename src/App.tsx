import { useInvisibleInstrument } from './hooks/useInvisibleInstrument';
import { HandVisualizer } from './components/HandVisualizer';

const App = () => {
  const { 
    cameraError, 
    videoRef,
    currentGesture,
    gestureConfidence,
    handPosition,
    pinchAmount,
    primaryHand,
  } = useInvisibleInstrument();

  if (cameraError) {
    return (
      <main className="fallback" role="alert">
        <p>{cameraError}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <video
        ref={videoRef}
        aria-label="Live camera feed"
        autoPlay
        className="camera-feed"
        muted
        playsInline
      />
      <HandVisualizer
        videoRef={videoRef}
        primaryHand={primaryHand}
        currentGesture={currentGesture}
        gestureConfidence={gestureConfidence}
        handPosition={handPosition}
        pinchAmount={pinchAmount}
      />
    </main>
  );
};

export default App;
